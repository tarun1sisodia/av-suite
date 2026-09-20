/**
 * AV Suite — Motion Design System
 *
 * Centralised animation variants and utilities for consistent,
 * professional micro-interactions across the CRM.
 *
 * Design philosophy:
 * - Subtle and clinical — matches healthcare context
 * - Fast durations (150-300ms) — never block the user
 * - Spring physics for natural feel on interactive elements
 * - Staggered reveals for lists and dashboards
 */

import type { Transition, Variants } from 'motion/react';

// ---------------------------------------------------------------------------
// Shared transitions
// ---------------------------------------------------------------------------

export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

export const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
  mass: 1,
};

export const EASE_OUT_FAST: Transition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1],
};

export const EASE_OUT_MEDIUM: Transition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1],
};

// ---------------------------------------------------------------------------
// Page-level fade + slide
// ---------------------------------------------------------------------------

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { ...EASE_OUT_MEDIUM, staggerChildren: 0.06 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// Card & container stagger
// ---------------------------------------------------------------------------

export const cardContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

export const cardItemVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: EASE_OUT_MEDIUM },
};

// ---------------------------------------------------------------------------
// List stagger (table rows, sidebar items)
// ---------------------------------------------------------------------------

export const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.03, delayChildren: 0.04 },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0, transition: EASE_OUT_FAST },
};

// ---------------------------------------------------------------------------
// SlideOver / Modal
// ---------------------------------------------------------------------------

export const slideOverBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const slideOverPanelVariants: Variants = {
  initial: { x: '100%', opacity: 0.5 },
  animate: { x: 0, opacity: 1, transition: { ...SPRING_SOFT, opacity: { duration: 0.2 } } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// ---------------------------------------------------------------------------
// Button micro-interaction
// ---------------------------------------------------------------------------

export const buttonTapVariants: Variants = {
  idle: { scale: 1 },
  tap: { scale: 0.97, transition: { duration: 0.1 } },
  hover: { scale: 1.015, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// KPI / stat card number reveal
// ---------------------------------------------------------------------------

export const statRevealVariants: Variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { ...EASE_OUT_MEDIUM, delay: 0.15 },
  },
};

// ---------------------------------------------------------------------------
// Skeleton shimmer (pure CSS, no motion dependency)
// ---------------------------------------------------------------------------

export const skeletonClass =
  'animate-pulse rounded-md bg-slate-200 dark:bg-slate-800';

// ---------------------------------------------------------------------------
// Tab indicator spring
// ---------------------------------------------------------------------------

export const tabIndicatorTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
};