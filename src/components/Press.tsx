import { motion, type HTMLMotionProps } from 'motion/react';
import { play, type Cue } from '../lib/sensory';
import { tapTransition } from '../lib/fx';
type Props = HTMLMotionProps<'button'> & { sound?: Cue | 'none' };
export function Press({ sound = 'tap', onPointerDown, disabled, children, ...props }: Props) {
  return (
    <motion.button
      {...props}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={tapTransition}
      disabled={disabled}
      onPointerDown={(event) => {
        if (!disabled && sound !== 'none') play(sound);
        onPointerDown?.(event);
      }}
    >
      {children}
    </motion.button>
  );
}
