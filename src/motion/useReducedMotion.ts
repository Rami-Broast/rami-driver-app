import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "reduce motion" accessibility setting, live.
 *
 * Reads the initial value on mount and subscribes to changes, so toggling the
 * setting takes effect without a restart. Everything in the motion system gates
 * on this: when it is true, decorative motion is removed and timed animations
 * collapse to instant state changes.
 *
 * Defaults to `false` (motion on) if the platform cannot report the setting —
 * the app is fully functional either way; this only affects presentation.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Guard every platform call: some environments (and older platforms) may not
    // implement these, or may return a non-promise. `Promise.resolve` normalises
    // the result, and each access is optional-chained, so the hook can never
    // throw — it just falls back to motion-enabled.
    const query = AccessibilityInfo.isReduceMotionEnabled?.();
    Promise.resolve(query)
      .then((enabled) => {
        if (mounted && typeof enabled === 'boolean') {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        // If the query fails, leave motion enabled — a safe, non-crashing default.
      });

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled: boolean) => setReduceMotion(!!enabled),
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}
