import React, { createContext, useContext, useMemo } from 'react';
import { Easing, ReduceMotion, WithTimingConfig } from 'react-native-reanimated';

/** Whatever `Easing.bezier(...)` returns — a factory, not a bare function. */
type TimingEasing = NonNullable<WithTimingConfig['easing']>;

import { effectiveDurations, effectiveSprings } from './reduced-motion';
import {
  DurationToken,
  EASINGS,
  EasingToken,
  SpringConfig,
  SpringToken,
} from './tokens';
import { useReducedMotion } from './useReducedMotion';

/**
 * Motion context.
 *
 * Resolves the reduce-motion setting once, at the top of the tree, and exposes
 * ready-to-use Reanimated configs derived from the central tokens. A component
 * never reads the raw setting or a raw token — it asks `useMotion()` for a
 * timing/spring config and uses it. That is what keeps the motion language
 * consistent and makes reduced-motion impossible to forget.
 */
export interface TimingConfig {
  duration: number;
  easing: TimingEasing;
  reduceMotion: ReduceMotion;
}

export interface MotionContextValue {
  reduceMotion: boolean;
  /** A Reanimated `withTiming` config for a duration + easing token. */
  timing: (duration?: DurationToken, easing?: EasingToken) => TimingConfig;
  /** A Reanimated `withSpring` config for a spring token (instant under reduced motion). */
  spring: (token?: SpringToken) => SpringConfig & { reduceMotion: ReduceMotion };
  /** The raw effective duration in ms for a token (0 under reduced motion). */
  ms: (token: DurationToken) => number;
}

const MotionContext = createContext<MotionContextValue | null>(null);

function easingFn(token: EasingToken): TimingEasing {
  const [x1, y1, x2, y2] = EASINGS[token];
  return Easing.bezier(x1, y1, x2, y2);
}

export function MotionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const reduceMotion = useReducedMotion();

  const value = useMemo<MotionContextValue>(() => {
    const durations = effectiveDurations(reduceMotion);
    const springs = effectiveSprings(reduceMotion);
    // Also tell Reanimated itself about the preference, so its System setting is
    // honoured even for any built-in helpers.
    const reduceFlag = reduceMotion ? ReduceMotion.Always : ReduceMotion.Never;

    return {
      reduceMotion,
      ms: (token) => durations[token],
      timing: (duration = 'normal', easing = 'standard') => ({
        duration: durations[duration],
        easing: easingFn(easing),
        reduceMotion: reduceFlag,
      }),
      spring: (token = 'standard') => ({ ...springs[token], reduceMotion: reduceFlag }),
    };
  }, [reduceMotion]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/**
 * Access the resolved motion configs. Falls back to a sensible default context
 * if used outside a provider (e.g. an isolated component test), so it never
 * throws — a component is always renderable.
 */
export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (ctx) {
    return ctx;
  }
  // Non-throwing fallback: motion enabled, real tokens. Keeps components usable
  // in tests and previews without a provider.
  const durations = effectiveDurations(false);
  const springs = effectiveSprings(false);
  return {
    reduceMotion: false,
    ms: (token) => durations[token],
    timing: (duration = 'normal', easing = 'standard') => ({
      duration: durations[duration],
      easing: easingFn(easing),
      reduceMotion: ReduceMotion.Never,
    }),
    spring: (token = 'standard') => ({ ...springs[token], reduceMotion: ReduceMotion.Never }),
  };
}
