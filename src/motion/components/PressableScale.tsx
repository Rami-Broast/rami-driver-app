import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PRESS_SCALE } from '../tokens';
import { useMotion } from '../MotionProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far to scale down on press. Defaults to the token. */
  activeScale?: number;
}

/**
 * A pressable that scales down slightly while held.
 *
 * Purpose: immediate, physical touch feedback — the single most useful
 * micro-animation in an app, and the one users read as "responsive". The scale
 * is small (token `PRESS_SCALE`) and spring-settled, never rubbery. Under
 * reduced motion the spring is instant, so the control still confirms the press
 * without visible travel.
 */
export function PressableScale({
  children,
  style,
  activeScale = PRESS_SCALE,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps): React.JSX.Element {
  const { spring } = useMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - activeScale) * pressed.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        pressed.value = withSpring(1, spring('soft'));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, spring('soft'));
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
