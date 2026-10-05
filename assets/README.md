# App icon and launch assets

`logo.jpeg` is the restaurant's supplied wordmark — **1600 × 384, a 4 : 1
banner**. It is the right thing on the sign-in and launch screens, where it is
rendered wide, and both screens still use it.

It was also, until now, the app icon, the splash image, the Android
adaptive-icon foreground and the web favicon. That could not be uploaded:
**App Store Connect rejects a JPEG outright and rejects any icon with an alpha
channel**, so no binary produced from it would have reached review.

## What is generated here

`generate-icons.py` derives all four from `logo.jpeg` (`python3
scripts/generate-icons.py assets/logo.jpeg assets`, needs Pillow). Re-run it
whenever the source art changes.

| File | Spec | Used as |
| --- | --- | --- |
| `icon.png` | 1024 × 1024 PNG, **RGB, no alpha** | `expo.icon` — iOS and the Play listing |
| `adaptive-icon.png` | 1024 × 1024 PNG **with transparency**, art inside the inner 62% | `expo.android.adaptiveIcon.foregroundImage` |
| `splash.png` | 2048-wide PNG, transparent ground | `expo.splash.image`, over `backgroundColor` |
| `favicon.png` | 196 × 196 PNG | `expo.web.favicon` |

The safe-zone inset on the adaptive icon is not decoration: Android masks the
outer ~33% into a circle, a squircle or a rounded square depending on the
launcher, and art drawn to the edge loses its ends.

## `icon.png` is a stopgap, and it needs replacing before launch

It clears the **technical** rejection — correct format, correct size, no alpha —
and nothing more. A 4 : 1 wordmark centred in a square renders as a thin strip
about a fifth of the icon's height; at the ~60 px a phone home screen actually
draws, the Arabic is illegible and the whole thing reads as a blank white tile.

Replacing it is an artwork task, not a code one. What is needed from the
restaurant is a **square brand mark** — not the wordmark — supplied as:

1. a **1024 × 1024 PNG, no transparency**, artwork filling the square, and
2. the same mark on a **transparent** background for the Android foreground,
   drawn to occupy roughly the middle 62% of the canvas.

Drop those in as `icon.png` and `adaptive-icon.png` and nothing else changes.

The mark is deliberately **not** invented here. The logo's citrus emblem is the
obvious candidate, but it overlaps the shawarma in the supplied file and cannot
be lifted out cleanly, and cropping someone's identity into a new mark is the
restaurant's decision to make.
