import type { Transition, Variants } from 'motion/react';

export const fairytale: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const duration = {
  tap: 0.16,
  modal: 0.35,
  page: 0.45,
  boot: 0.9,
  toast: 0.28,
} as const;

export const tapTransition: Transition = { duration: duration.tap, ease: fairytale };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.page, ease: fairytale },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.28, ease: fairytale } },
};

export const fadePage: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: duration.page, ease: fairytale },
  },
  exit: { opacity: 0, transition: { duration: 0.22, ease: fairytale } },
};

export const listStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: fairytale } },
};

export const modalInner: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.modal, ease: fairytale },
  },
};

export const revealInner: Variants = {
  hidden: { opacity: 0, transition: { duration: 0.32, ease: fairytale } },
  show: {
    opacity: 1,
    transition: { duration: 0.42, ease: fairytale, delay: 0.14 },
  },
};

export const toastFx: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.94, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: duration.toast, ease: fairytale },
  },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.22 } },
};

export const addStep = (dir: number): Variants => ({
  enter: { opacity: 0, x: dir * 32, filter: 'blur(6px)' },
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: fairytale },
  },
  exit: {
    opacity: 0,
    x: dir * -24,
    filter: 'blur(6px)',
    pointerEvents: 'none',
    transition: { duration: 0.26, ease: fairytale },
  },
});

export const bootMark: Variants = {
  hidden: { opacity: 0, scale: 0.62, rotate: -12 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.85, ease: fairytale },
  },
};
