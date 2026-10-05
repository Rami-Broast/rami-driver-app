import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';
import { PressableScale } from './PressableScale';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/**
 * A +/- quantity control with an animated value.
 *
 * Purpose: make a quantity change feel direct — the buttons give press
 * feedback, and the number gives a small pop each time it changes so the eye
 * follows the update. Under reduced motion the pop is instant.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantityStepperProps): React.JSX.Element {
  const theme = useTheme();
  const { timing } = useMotion();
  const pop = useSharedValue(1);
  const first = useSharedValue(true);

  useEffect(() => {
    if (first.value) {
      first.value = false;
      return;
    }
    pop.value = withSequence(withTiming(1.2, timing('fast')), withTiming(1, timing('fast')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const button = (label: string, next: number, disabled: boolean, hint: string) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={{
        width: 36,
        height: 36,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600' }}>{label}</Text>
    </PressableScale>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {button('−', Math.max(min, value - 1), value <= min, 'Decrease quantity')}
      <Animated.Text
        style={[
          {
            minWidth: 40,
            textAlign: 'center',
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: '700',
          },
          numberStyle,
        ]}
      >
        {value}
      </Animated.Text>
      {button('+', Math.min(max, value + 1), value >= max, 'Increase quantity')}
    </View>
  );
}
