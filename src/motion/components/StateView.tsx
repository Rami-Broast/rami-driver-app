import React from 'react';
import { Text } from 'react-native';

import { useTheme } from '../../theme/theme';
import { FadeIn } from './FadeIn';
import { PressableScale } from './PressableScale';

export interface StateViewProps {
  /** A single glyph/emoji standing in for an illustration. */
  glyph: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/**
 * The shared layout for empty and error states.
 *
 * Purpose: turn a dead-end (no results, a failure) into something calm and
 * actionable. The content fades up gently on mount — a single, non-looping
 * entrance — and offers a clear next step. `EmptyState` and `ErrorState` are
 * thin wrappers so callers use an intention-revealing name.
 */
function StateView({
  glyph,
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: StateViewProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <FadeIn testID={testID} translateY={10} style={{ alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{glyph}</Text>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <PressableScale
          accessibilityRole="button"
          onPress={onAction}
          style={{
            marginTop: 20,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.pill,
            paddingVertical: 12,
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </FadeIn>
  );
}

export function EmptyState(props: Omit<StateViewProps, 'glyph'> & { glyph?: string }): React.JSX.Element {
  return <StateView glyph={props.glyph ?? '🍽️'} {...props} />;
}

export function ErrorState(props: Omit<StateViewProps, 'glyph'> & { glyph?: string }): React.JSX.Element {
  return <StateView glyph={props.glyph ?? '⚠️'} {...props} />;
}
