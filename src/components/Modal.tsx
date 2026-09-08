import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { play, unlockAudio } from '../lib/sensory';
import { fairytale, modalInner, revealInner } from '../lib/fx';
import { OrigamiSheet } from './OrigamiSheet';
import { REVEAL_STAR_SIZE, STAR_FIGURE_PAD } from './StarFigure';
import type { Category, Color } from '../lib/models';

export type RevealAnchor = { x: number; y: number; size: number; angle?: number };

function RevealCrown({
  children,
  anchor,
  closing,
  reduced,
  onReturned,
}: {
  children: ReactNode;
  anchor: RevealAnchor | null;
  closing: boolean;
  reduced: boolean;
  onReturned: () => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [to, setTo] = useState<{ x: number; y: number } | null>(null);
  const fly = Boolean(anchor && !reduced);
  useLayoutEffect(() => {
    if (!fly) return;
    const el = slot.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      if (box.width < 4 && box.height < 4) return;
      const next = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      setTo((prev) =>
        prev && Math.hypot(prev.x - next.x, prev.y - next.y) < 2 ? prev : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [fly]);
  const fromScale = anchor ? Math.max(0.2, anchor.size / REVEAL_STAR_SIZE) : 1;
  const closingRef = useRef(closing);
  closingRef.current = closing;
  const pose =
    fly && anchor
      ? closing || !to
        ? {
            left: anchor.x,
            top: anchor.y,
            x: '-50%',
            y: '-50%',
            scale: fromScale,
            rotate: anchor.angle ?? 0,
            filter: 'brightness(1.35)',
          }
        : {
            left: to.x,
            top: to.y,
            x: '-50%',
            y: '-50%',
            scale: 1,
            rotate: 0,
            filter: 'brightness(1.58)',
          }
      : undefined;
  return (
    <div className="reveal-crown" ref={slot}>
      {fly && anchor && pose ? (
        <motion.div
          className="reveal-crown-star"
          initial={{
            left: anchor.x,
            top: anchor.y,
            x: '-50%',
            y: '-50%',
            scale: fromScale,
            rotate: anchor.angle ?? 0,
            filter: 'brightness(1.35)',
          }}
          animate={pose}
          transition={{ duration: 0.5, ease: fairytale }}
          onAnimationComplete={() => {
            if (closingRef.current) onReturned();
          }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </div>
  );
}

export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  busy = false,
  feedback,
  reduced = false,
  tone = 'default',
  folding = false,
  foldColor,
  foldCategory,
  foldText,
  onFolded,
  accent,
  anchor = null,
  onClosing,
  hero,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  feedback?: string;
  reduced?: boolean;
  tone?: 'default' | 'reveal';
  folding?: boolean;
  foldColor?: Color;
  foldCategory?: Category;
  foldText?: string;
  onFolded?: (origin: { x: number; y: number; size: number }) => void;
  accent?: string;
  anchor?: RevealAnchor | null;
  onClosing?: () => void;
  hero?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const finished = useRef(false);
  const timeout = useRef(0);
  const [closing, setClosing] = useState(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    window.clearTimeout(timeout.current);
    onClose();
  };
  const requestClose = () => {
    if (busy || folding) return;
    if (closing) {
      finish();
      return;
    }
    unlockAudio();
    play('close');
    if (reduced) {
      onClosing?.();
      finish();
      return;
    }
    setClosing(true);
    onClosing?.();
    ref.current?.classList.add('closing');
    const wait = tone === 'reveal' && anchor && !reduced ? 720 : tone === 'reveal' ? 400 : 280;
    timeout.current = window.setTimeout(finish, wait);
  };
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      window.clearTimeout(timeout.current);
      dialog.close();
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    unlockAudio();
    play('open');
  }, []);
  const body = (
    <motion.div
      className="modal-inner"
      variants={tone === 'reveal' ? revealInner : modalInner}
      initial={reduced ? false : 'hidden'}
      animate={closing && tone === 'reveal' ? 'hidden' : 'show'}
    >
      <div className="modal-aura" aria-hidden="true" />
      <button
        type="button"
        className="icon-button modal-close"
        aria-label={closeLabel}
        onClick={requestClose}
        disabled={busy}
      >
        <X size={24} />
      </button>
      {tone === 'reveal' ? null : <h2 id="dialog-title">{title}</h2>}
      {feedback ? (
        <p className="modal-feedback" role="status">
          {feedback}
        </p>
      ) : null}
      <div className="modal-scroll">{children}</div>
      {folding && foldColor && foldCategory ? (
        <OrigamiSheet
          color={foldColor}
          category={foldCategory}
          text={foldText ?? ''}
          onComplete={onFolded ?? (() => {})}
        />
      ) : null}
    </motion.div>
  );
  return (
    <dialog
      ref={ref}
      className={`modal${tone === 'reveal' ? ' modal-reveal' : ''}${folding ? ' is-folding' : ''}`}
      aria-labelledby="dialog-title"
      aria-busy={busy || folding}
      style={{
        ...(accent ? { ['--star' as string]: accent } : {}),
        ...(tone === 'reveal'
          ? {
              ['--hero' as string]: `${REVEAL_STAR_SIZE}px`,
              ['--glow' as string]: `${Math.round(REVEAL_STAR_SIZE * STAR_FIGURE_PAD)}px`,
            }
          : {}),
      }}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) requestClose();
      }}
    >
      {tone === 'reveal' ? (
        <div className="reveal-stage">
          {hero ? (
            <RevealCrown
              anchor={anchor}
              closing={closing}
              reduced={reduced}
              onReturned={finish}
            >
              {hero}
            </RevealCrown>
          ) : null}
          {body}
        </div>
      ) : (
        body
      )}
    </dialog>
  );
}
