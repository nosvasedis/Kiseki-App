import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { play, unlockAudio } from '../lib/sensory';
import { modalInner } from '../lib/fx';
export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  busy = false,
  feedback,
  reduced = false,
  tone = 'default',
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  feedback?: string;
  reduced?: boolean;
  tone?: 'default' | 'reveal';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const requestClose = () => {
    if (busy) return;
    if (closing) {
      onClose();
      return;
    }
    unlockAudio();
    play('close');
    if (reduced) {
      onClose();
      return;
    }
    setClosing(true);
    ref.current?.classList.add('closing');
    window.setTimeout(onClose, 280);
  };
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    unlockAudio();
    play('open');
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${tone === 'reveal' ? ' modal-reveal' : ''}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            requestClose();
        }
      }}
    >
      <motion.div
        className="modal-inner"
        variants={modalInner}
        initial={reduced ? false : 'hidden'}
        animate="show"
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
        <h2 id="dialog-title">{title}</h2>
        {feedback ? (
          <p className="modal-feedback" role="status">
            {feedback}
          </p>
        ) : null}
        <div className="modal-scroll">{children}</div>
      </motion.div>
    </dialog>
  );
}
