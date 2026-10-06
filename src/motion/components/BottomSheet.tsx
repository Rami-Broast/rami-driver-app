import React, { useEffect, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/theme';
import { useMotion } from '../MotionProvider';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A bottom sheet: content that rises from the bottom edge over a dimmed
 * backdrop.
 *
 * Purpose: present secondary choices (address, payment method, item options)
 * anchored to the thumb, without a full screen change. The sheet springs up and
 * the backdrop fades in together; dismissing reverses both, then unmounts — so
 * the exit is seen, not a hard cut.
 *
 * Under reduced motion both the slide and the fade have zero duration, so the
 * sheet appears and disappears instantly while remaining fully usable. Built on
 * the platform `Modal` so focus, z-order and the Android back button are handled
 * correctly.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
}: BottomSheetProps): React.JSX.Element | null {
  const theme = useTheme();
  const { timing } = useMotion();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (visible) {
      progress.value = withTiming(1, timing('normal', 'enter'));
    } else {
      progress.value = withTiming(0, timing('fast', 'exit'), (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height }],
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none">
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            { backgroundColor: theme.colors.backdrop },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ flex: 1 }}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingTop: 8,
              paddingBottom: 32,
              paddingHorizontal: 20,
            },
            sheetStyle,
          ]}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.border,
              marginBottom: 12,
            }}
          />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
