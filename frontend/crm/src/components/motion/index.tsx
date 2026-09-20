'use client';

/**
 * Reusable motion wrappers for AV Suite CRM.
 *
 * Usage:
 *   <MotionPage>          — wraps full page content with fade+slide entrance
 *   <MotionCard>          — single card with pop-in animation
 *   <MotionCardGrid>      — container that staggers MotionCard children
 *   <MotionList>          — container that staggers list-item children
 *   <MotionListItem>      — single list row
 *   <MotionSlideOver>     — animated slide-over panel with backdrop
 *   <MotionButton>        — button with tap/hover micro-interaction
 *   <MotionStat>          — KPI stat card with blur-reveal
 */

import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import {
  pageVariants,
  cardContainerVariants,
  cardItemVariants,
  listContainerVariants,
  listItemVariants,
  slideOverBackdropVariants,
  slideOverPanelVariants,
  buttonTapVariants,
  statRevealVariants,
  SPRING_SNAPPY,
  EASE_OUT_MEDIUM,
} from '../../lib/motion';

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export function MotionPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Card grid container (stagger children)
// ---------------------------------------------------------------------------

export function MotionCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Single card item
// ---------------------------------------------------------------------------

export function MotionCard({ children, className, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={cardItemVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// List container (stagger children)
// ---------------------------------------------------------------------------

export function MotionList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Single list item
// ---------------------------------------------------------------------------

export function MotionListItem({ children, className, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={listItemVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SlideOver panel with backdrop
// ---------------------------------------------------------------------------

interface MotionSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  width?: string;
}

export function MotionSlideOver({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  width = 'max-w-lg',
}: MotionSlideOverProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        variants={slideOverBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        variants={slideOverPanelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`relative ${width} w-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto`}
      >
        {(title || subtitle) && (
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            {title && (
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated button with tap/hover micro-interaction
// ---------------------------------------------------------------------------

export function MotionButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <motion.button
      variants={buttonTapVariants}
      initial="idle"
      whileHover="hover"
      whileTap="tap"
      className={className}
      {...(props as HTMLMotionProps<'button'>)}
    >
      {children}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// KPI Stat card with blur-reveal
// ---------------------------------------------------------------------------

export function MotionStat({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={statRevealVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Fade-in wrapper (simple, no variants)
// ---------------------------------------------------------------------------

export function MotionFadeIn({
  children,
  className,
  delay = 0,
  duration = 0.3,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Scale pop (for modals, toasts, badges)
// ---------------------------------------------------------------------------

export function MotionPop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SNAPPY}
      className={className}
    >
      {children}
    </motion.div>
  );
}