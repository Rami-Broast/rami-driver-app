import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { STAGGER_MAX_ITEMS, STAGGER_STEP } from '../tokens';
import { FadeIn } from './FadeIn';

export interface StaggerProps {
  children: React.ReactNode;
  /** Delay step between children, in ms. Defaults to the token. */
  step?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Staggers the entrance of a short list of children.
 *
 * Purpose: give a first-paint list a sense of order without a slow cascade.
 * Used sparingly — only the first `STAGGER_MAX_ITEMS` are delayed; everything
 * after appears together, so a long list never turns into a drawn-out sequence.
 * Under reduced motion each child's `FadeIn` is instant, so the stagger simply
 * has no visible effect.
 */
export function Stagger({
  children,
  step = STAGGER_STEP,
  translateY = 8,
  style,
}: StaggerProps): React.JSX.Element {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child, index) => (
        <FadeIn
          key={index}
          style={style}
          translateY={translateY}
          delay={Math.min(index, STAGGER_MAX_ITEMS) * step}
        >
          {child}
        </FadeIn>
      ))}
    </>
  );
}
