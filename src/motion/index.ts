/**
 * The motion system's public surface.
 *
 * Screens import from here, never from deep paths, so the system's API is one
 * reviewable list and internal files can move without churn.
 */

// Tokens (the single source of truth)
export * from './tokens';
export * from './reduced-motion';

// Runtime
export { MotionProvider, useMotion } from './MotionProvider';
export { useReducedMotion } from './useReducedMotion';
export { SCREEN_TRANSITIONS, screenTransition } from './transitions';
export type { ScreenTransition } from './transitions';

// Reusable components
export { PressableScale } from './components/PressableScale';
export { FadeIn } from './components/FadeIn';
export { Stagger } from './components/Stagger';
export { Skeleton } from './components/Skeleton';
export { BottomSheet } from './components/BottomSheet';
export { CartBadge } from './components/CartBadge';
export { QuantityStepper } from './components/QuantityStepper';
export { Toast } from './components/Toast';
export { EmptyState, ErrorState } from './components/StateView';
