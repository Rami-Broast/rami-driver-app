import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DurationToken } from '../tokens';
import { useMotion } from '../MotionProvider';

export interface FadeInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Vertical travel on entry, in px. 0 for a pure fade. */
  translateY?: number;
  /** Entry delay in ms (used by `Stagger`). */
  delay?: number;
  duration?: DurationToken;
  testID?: string;
}

/**
 * A one-shot entrance: fade, optionally with a small upward slide.
 *
 * Purpose: soften the appearance of content on first paint so it reads as
 * arriving rather than popping. It runs once, on mount, and never loops. Under
 * reduced motion it renders the final state immediately (no fade, no travel),
 * because the duration collapses to 0.
 */
export function FadeIn({
  children,
  style,
  translateY = 0,
  delay = 0,
  duration = 'normal',
  testID,
}: FadeInProps): React.JSX.Element {
  const { timing, reduceMotion } = useMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, timing(duration, 'enter')));
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * translateY }],
  }));

  return (
    <Animated.View testID={testID} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
