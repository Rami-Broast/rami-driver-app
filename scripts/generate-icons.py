from PIL import Image
import sys, os

SRC = sys.argv[1]
OUT = sys.argv[2]

logo = Image.open(SRC).convert('RGBA')

# The supplied wordmark sits on a white JPEG ground. Make that ground
# transparent so the mark can be composited onto any colour.
def transparent(im, thresh=246):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= thresh and g >= thresh and b >= thresh:
                px[x, y] = (r, g, b, 0)
    return im

def trim(im):
    return im.crop(im.getbbox())

mark = trim(transparent(logo))

def fit(canvas_size, frac, bg):
    """Centre the wordmark on a square canvas at `frac` of its width."""
    canvas = Image.new('RGBA', (canvas_size, canvas_size), bg)
    target_w = int(canvas_size * frac)
    scale = target_w / mark.width
    target_h = max(1, int(mark.height * scale))
    m = mark.resize((target_w, target_h), Image.LANCZOS)
    canvas.alpha_composite(m, ((canvas_size - target_w) // 2, (canvas_size - target_h) // 2))
    return canvas

os.makedirs(OUT, exist_ok=True)

# App icon: 1024x1024, PNG, NO alpha channel (App Store Connect rejects alpha).
icon = fit(1024, 0.86, (255, 255, 255, 255)).convert('RGB')
icon.save(os.path.join(OUT, 'icon.png'), 'PNG')

# Android adaptive-icon foreground: PNG with transparency, drawn inside the
# safe zone — the outer ~33% is masked away on many devices.
adaptive = fit(1024, 0.62, (0, 0, 0, 0))
adaptive.save(os.path.join(OUT, 'adaptive-icon.png'), 'PNG')

# Splash: the wordmark at its own aspect ratio, transparent ground, so
# `resizeMode: contain` over `backgroundColor` renders it cleanly.
splash = Image.new('RGBA', (2048, int(2048 * mark.height / mark.width)), (0, 0, 0, 0))
splash.alpha_composite(mark.resize(splash.size, Image.LANCZOS))
splash.save(os.path.join(OUT, 'splash.png'), 'PNG')

# Web favicon.
fit(196, 0.9, (255, 255, 255, 255)).convert('RGB').save(os.path.join(OUT, 'favicon.png'), 'PNG')

for f in ('icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png'):
    p = os.path.join(OUT, f)
    im = Image.open(p)
    print(f, im.size, im.mode, os.path.getsize(p))
