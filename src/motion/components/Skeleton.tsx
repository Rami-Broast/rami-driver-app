import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A shimmering placeholder block.
 *
 * Purpose: communicate "content is loading here, in this shape" — far calmer
 * and more informative than a spinner, and the brief's preferred loading
 * treatment. The shimmer is a slow, low-contrast opacity pulse, not a bright
 * sweep.
 *
 * Under reduced motion the shimmer does not loop — it renders as a static muted
 * block, because a constantly animating element is exactly what that setting is
 * meant to remove.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  style,
}: SkeletonProps): React.JSX.Element {
  const theme = useTheme();
  const { reduceMotion } = useMotion();
  const shimmer = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      shimmer.value = 1;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    // 0.5 → 1.0 opacity pulse: present but not distracting.
    opacity: 0.5 + shimmer.value * 0.5,
  }));

  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
