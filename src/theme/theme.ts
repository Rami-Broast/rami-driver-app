/**
 * A small design-token layer the motion components render against.
 *
 * This is intentionally minimal — the full design system (typography scale,
 * component tokens, Arabic/RTL type ramp) lands with the app screens. What is
 * here is enough for the motion primitives and the two hero components to look
 * finished in the demo, and to prove the light/dark theming path.
 */

import { useColorScheme } from 'react-native';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    /** Brand primary — the Rami Broast maroon from the logo. */
    primary: string;
    onPrimary: string;
    /** Brand secondary — the warm orange of the shawarma / citrus. */
    secondary: string;
    /** Brand accent — the blue of the "for fast food" tagline. */
    accent: string;
    success: string;
    danger: string;
    warning: string;
    progress: string;
    skeleton: string;
    skeletonHighlight: string;
    backdrop: string;
    /** Fixed brand background for the launch screen (theme-independent). */
    launch: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: (n: number) => number;
}

// Sampled from the logo.
const MAROON = '#752E2A'; // Rami Broast brand maroon, from the logo
const MAGENTA = MAROON;
const ORANGE = '#F47C20';
const BLUE = '#2E63A6';

const light: Theme['colors'] = {
  background: '#FBF6F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EDE7',
  border: '#E7DCD3',
  text: '#1E1A1C',
  textMuted: '#6E6167',
  primary: MAGENTA,
  onPrimary: '#FFFFFF',
  secondary: ORANGE,
  accent: BLUE,
  success: '#2E9E5B',
  danger: '#D6453B',
  warning: ORANGE,
  progress: MAGENTA,
  skeleton: '#EFE6EC',
  skeletonHighlight: '#F8F1F5',
  backdrop: 'rgba(30,20,26,0.45)',
  launch: '#FFFFFF',
};

const dark: Theme['colors'] = {
  background: '#121016',
  surface: '#1B1820',
  surfaceAlt: '#262230',
  border: '#342D3C',
  text: '#F5F1F3',
  textMuted: '#A79CA6',
  primary: '#B5564F',
  onPrimary: '#FFFFFF',
  secondary: '#F78F3D',
  accent: '#5C8BD6',
  success: '#3CC06E',
  danger: '#F0655B',
  warning: '#F78F3D',
  progress: '#B5564F',
  skeleton: '#262230',
  skeletonHighlight: '#302B3A',
  backdrop: 'rgba(0,0,0,0.6)',
  launch: '#FFFFFF',
};

const BASE = {
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  spacing: (n: number) => n * 4,
};

export function buildTheme(scheme: 'light' | 'dark'): Theme {
  return { scheme, colors: scheme === 'dark' ? dark : light, ...BASE };
}

/** The active theme, following the OS light/dark setting. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return buildTheme(scheme === 'dark' ? 'dark' : 'light');
}
