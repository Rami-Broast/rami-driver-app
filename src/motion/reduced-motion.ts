/**
 * Reduced-motion resolution — pure logic, no React Native.
 *
 * Accessibility is a first-class gate in this system, not an afterthought. When
 * the OS "reduce motion" setting is on, decorative motion is removed and every
 * timed animation collapses to an instant state change; essential state changes
 * still happen, just without the tween. These helpers compute the *effective*
 * tokens from the raw tokens plus the reduce-motion flag, so a component never
 * has to branch on the flag itself — it asks for effective values and uses them.
 */

import { DURATIONS, DurationScale, SPRINGS, SpringConfig, SpringTokens } from './tokens';

/** All durations collapsed to 0 — the reduced-motion duration set. */
export const ZERO_DURATIONS: DurationScale = {
  instant: 0,
  fast: 0,
  normal: 0,
  slow: 0,
};

/** The effective duration set: the real one, or all-zero under reduced motion. */
export function effectiveDurations(reduceMotion: boolean): DurationScale {
  return reduceMotion ? ZERO_DURATIONS : DURATIONS;
}

/**
 * Whether a *decorative* animation should run at all.
 *
 * Decorative motion (entrance fades, the active-step pulse, shimmer) is
 * suppressed entirely under reduced motion. Essential state changes do not ask
 * this — they render their final state instantly instead.
 */
export function shouldAnimateDecorative(reduceMotion: boolean): boolean {
  return !reduceMotion;
}

/**
 * A near-instant spring, used in place of a real spring under reduced motion.
 *
 * Rather than a separate code path, a component can always call `withSpring`
 * with the effective config; under reduced motion this config is stiff enough
 * that the value snaps to its target within a frame, with no perceptible
 * overshoot or travel.
 */
export const INSTANT_SPRING: SpringConfig = { damping: 100, stiffness: 1000, mass: 0.1 };

/** The effective spring set: the real springs, or instant ones under reduced motion. */
export function effectiveSprings(reduceMotion: boolean): SpringTokens {
  if (!reduceMotion) {
    return SPRINGS;
  }
  return {
    soft: INSTANT_SPRING,
    standard: INSTANT_SPRING,
    emphasized: INSTANT_SPRING,
  };
}
