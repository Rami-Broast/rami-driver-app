import React, { useEffect } from 'react';
import { StyleProp, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface CartBadgeProps {
  count: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The cart item-count badge.
 *
 * Purpose: draw the eye to the cart the instant its contents change, confirming
 * that an add/remove "landed". On every count change the badge gives a single
 * small pop; at zero it scales/fades away so an empty cart shows no badge.
 *
 * Under reduced motion the pop duration is 0 and the spring is instant, so the
 * count simply updates in place — the essential information (the number) is
 * never lost.
 */
export function CartBadge({ count, style }: CartBadgeProps): React.JSX.Element | null {
  const theme = useTheme();
  const { timing, spring } = useMotion();
  const pop = useSharedValue(1);
  const visible = useSharedValue(count > 0 ? 1 : 0);

  useEffect(() => {
    visible.value = withSpring(count > 0 ? 1 : 0, spring('soft'));
    if (count > 0) {
      pop.value = withSequence(withTiming(1.18, timing('fast')), withTiming(1, timing('fast')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ scale: visible.value * pop.value }],
  }));

  if (count <= 0) {
    // Still render nothing once empty; the fade-out above covers the transition
    // frame, and an empty badge should not occupy the layout.
    return null;
  }

  return (
    <Animated.View
      accessibilityLabel={`${count} item${count === 1 ? '' : 's'} in cart`}
      style={[
        {
          minWidth: 20,
          height: 20,
          paddingHorizontal: 6,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
        style,
      ]}
    >
      <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '700' }}>
        {count > 99 ? '99+' : count}
      </Text>
    </Animated.View>
  );
}
