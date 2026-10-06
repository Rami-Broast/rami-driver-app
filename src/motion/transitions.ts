import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { DURATIONS } from './tokens';

/**
 * Screen-transition presets for the native stack navigator.
 *
 * Screens change with one of a few named transitions rather than ad-hoc
 * per-screen animations, so navigation feels the same everywhere:
 *
 *   - `push`  — lateral slide for forward navigation into a detail.
 *   - `modal` — rise from the bottom for a self-contained task (checkout, auth).
 *   - `fade`  — a quiet crossfade for peer swaps (e.g. tab-like roots).
 *   - `none`  — no transition; used as the reduced-motion form of all of them.
 *
 * The brief warns against unnecessary page transitions: prefer `fade`/`none` for
 * peer changes and reserve `push`/`modal` for genuine hierarchy changes.
 */
export const SCREEN_TRANSITIONS = {
  push: { animation: 'slide_from_right', animationDuration: DURATIONS.normal },
  modal: {
    animation: 'slide_from_bottom',
    animationDuration: DURATIONS.normal,
    presentation: 'modal',
  },
  fade: { animation: 'fade', animationDuration: DURATIONS.fast },
  none: { animation: 'none' },
} satisfies Record<string, NativeStackNavigationOptions>;

export type ScreenTransition = keyof typeof SCREEN_TRANSITIONS;

/**
 * Resolves a transition preset, collapsing to an instant change under reduced
 * motion. Wire a screen with `options={screenTransition('push', reduceMotion)}`.
 */
export function screenTransition(
  preset: ScreenTransition,
  reduceMotion: boolean,
): NativeStackNavigationOptions {
  if (reduceMotion) {
    // Keep `modal` presentation (it changes layout/semantics, not just motion)
    // but remove the animation itself.
    return preset === 'modal'
      ? { animation: 'none', presentation: 'modal' }
      : { animation: 'none' };
  }
  return SCREEN_TRANSITIONS[preset];
}
