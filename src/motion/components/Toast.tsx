import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

/** Colour intent for a toast. */
export type StatusTone = 'neutral' | 'progress' | 'success' | 'danger' | 'warning';

export interface ToastProps {
  visible: boolean;
  message: string;
  tone?: StatusTone;
  /** Auto-hide after this long, in ms. */
  durationMs?: number;
  onHide: () => void;
}

const TONE_KEY: Record<StatusTone, 'text' | 'success' | 'danger' | 'warning' | 'primary'> = {
  neutral: 'text',
  progress: 'primary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
};

/**
 * A transient in-app notification banner.
 *
 * Purpose: confirm a background result (coupon applied, item removed, points
 * earned) without stealing focus. It drops in from the top, holds briefly, then
 * leaves on its own — never requiring a tap, never blocking interaction beneath
 * it.
 *
 * Under reduced motion it appears and disappears without travel; the auto-hide
 * timing is unchanged, because the *message* is the essential part, not the
 * movement.
 */
export function Toast({
  visible,
  message,
  tone = 'neutral',
  durationMs = 2600,
  onHide,
}: ToastProps): React.JSX.Element | null {
  const theme = useTheme();
  const { timing, reduceMotion } = useMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const holdFor = Math.max(0, durationMs);
    progress.value = withSequence(
      withTiming(1, timing('normal', 'enter')),
      withDelay(
        holdFor,
        withTiming(0, timing('fast', 'exit'), (finished) => {
          if (finished) {
            runOnJS(onHide)();
          }
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (progress.value - 1) * 16 }],
  }));

  if (!visible) {
    return null;
  }

  const accentColor = theme.colors[TONE_KEY[tone]];

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion={reduceMotion ? 'polite' : 'assertive'}
      accessibilityLabel={message}
      style={[
        {
          position: 'absolute',
          top: 12,
          left: 16,
          right: 16,
          zIndex: 1000,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          paddingVertical: 12,
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      <View>
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}
