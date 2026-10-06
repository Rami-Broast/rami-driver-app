/**
 * Motion tokens — the single source of truth for the whole app's motion.
 *
 * Nothing in the app hard-codes a duration, easing or spring; everything reads
 * from here. That is what makes the motion language consistent across screens
 * (and, when mirrored, across the admin/driver/kitchen apps). See
 * `docs/motion-design-system.md`.
 *
 * This module is deliberately free of any React Native import so it can be
 * unit-tested in plain Node and, later, shared verbatim with the web apps. The
 * RN layer (`useMotion`) turns these plain values into Reanimated configs.
 */

/**
 * Durations, in milliseconds. Kept short on purpose — the brief calls for no
 * long animations. `slow` is the ceiling for anything a user waits on.
 */
export const DURATIONS = {
  /** 0ms. A state swap with no tween — also the reduced-motion fallback. */
  instant: 0,
  /** Taps, badge pops, micro-feedback. Fast enough to feel immediate. */
  fast: 120,
  /** The default: sheets, cards, most transitions. */
  normal: 220,
  /** Full-screen or celebratory moments. The hard cap. */
  slow: 340,
} as const;

export type DurationToken = keyof typeof DURATIONS;
export type DurationTokens = typeof DURATIONS;
/** A duration set with widened `number` values (e.g. the reduced-motion all-zero set). */
export type DurationScale = Record<DurationToken, number>;

/**
 * Easing curves as cubic-bezier control points `[x1, y1, x2, y2]`.
 *
 * These are standard interaction curves (decelerate/accelerate), not any
 * brand's proprietary set. The RN layer feeds them to `Easing.bezier(...)`; the
 * web apps feed the identical tuples to CSS `cubic-bezier(...)`, so the feel is
 * the same everywhere.
 */
export const EASINGS = {
  /** General-purpose in-and-out. Most transitions. */
  standard: [0.2, 0, 0, 1],
  /** Decelerate. For elements entering the screen — fast in, gentle settle. */
  enter: [0, 0, 0, 1],
  /** Accelerate. For elements leaving — gentle start, quick exit. */
  exit: [0.3, 0, 1, 1],
  /** A more expressive standard curve for hero moments (payment success, etc). */
  emphasized: [0.2, 0, 0, 1],
} as const;

export type EasingToken = keyof typeof EASINGS;
export type EasingTuple = readonly [number, number, number, number];

/**
 * Spring configurations, in Reanimated's `withSpring` shape.
 *
 * Damping is set high relative to stiffness on purpose: these springs settle
 * with little to no visible overshoot. The brief explicitly rejects excessive
 * bouncing — a spring here is for a natural, physical *settle*, not a wobble.
 */
export const SPRINGS = {
  /** Gentle. Cart badge, toggles, small state changes. */
  soft: { damping: 20, stiffness: 180, mass: 1 },
  /** The default spring: cards, sheets, list items. */
  standard: { damping: 26, stiffness: 240, mass: 1 },
  /** Snappier, for a deliberate accent (add-to-cart, success). Low overshoot. */
  emphasized: { damping: 18, stiffness: 300, mass: 1 },
} as const;

export type SpringToken = keyof typeof SPRINGS;
export type SpringConfig = { damping: number; stiffness: number; mass: number };
export type SpringTokens = Record<SpringToken, SpringConfig>;

/**
 * Press feedback scale. A pressed, tappable surface scales to this. Small on
 * purpose — noticeable, never rubbery.
 */
export const PRESS_SCALE = 0.96;

/**
 * The most a staggered list should delay between children, in ms. Stagger is
 * used sparingly (short lists, first paint) and capped so a long list never
 * turns into a slow cascade.
 */
export const STAGGER_STEP = 40;
/** No more than this many children are ever staggered; the rest appear together. */
export const STAGGER_MAX_ITEMS = 8;
