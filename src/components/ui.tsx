import React from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '../motion';
import { useTheme } from '../theme/theme';

/** A labelled text input. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  autoFocus,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoFocus={autoFocus}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: 14,
          paddingVertical: 14,
          fontSize: 16,
          color: theme.colors.text,
        }}
      />
    </View>
  );
}

/** A screen container: themed background + top safe-area padding + optional title. */
export function Screen({
  children,
  title,
  onBack,
  right,
}: {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      {title !== undefined ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          {onBack ? (
            <PressableScale accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ paddingRight: 4 }}>
              <Text style={{ color: theme.colors.text, fontSize: 24 }}>‹</Text>
            </PressableScale>
          ) : null}
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** The primary call-to-action. Brand-filled, with a busy state that disables it. */
export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  const off = disabled || busy;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.pill,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: off ? 0.6 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.onPrimary} />
      ) : (
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 16 }}>{label}</Text>
      )}
    </PressableScale>
  );
}

/** A surface card. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
