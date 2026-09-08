import type { Transition, Variants } from 'motion/react';

export const fairytale: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const duration = {
  tap: 0.16,
  modal: 0.35,
  page: 0.45,
  boot: 1.15,
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

export const toastFx: Variants = {
  hidden: { opacity: 0, y: 16, x: '-50%', scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    x: '-50%',
    scale: 1,
    transition: { duration: duration.toast, ease: fairytale },
  },
  exit: { opacity: 0, y: 8, x: '-50%', transition: { duration: 0.2 } },
};

export const bootMark: Variants = {
  hidden: { opacity: 0, scale: 0.62, rotate: -12 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.85, ease: fairytale },
  },
};
