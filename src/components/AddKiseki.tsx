import { useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { addStar } from '../lib/db';
import {
  CATEGORIES,
  COLORS,
  PALETTE,
  graphemes,
  type Category,
  type Color,
  type Star,
} from '../lib/models';
import { addStep, fairytale } from '../lib/fx';
import { play, unlockAudio } from '../lib/sensory';
import type { T } from '../lib/i18n';
import { Modal } from './Modal';
import { Press } from './Press';
import { Icon } from './Icon';
import { StarFigure } from './StarFigure';

const TITLES = ['addTitle', 'chooseCategory', 'chooseColor'] as const;

export function AddKiseki({
  t,
  draft,
  setDraft,
  full,
  onClose,
  onSaved,
  reduced,
}: {
  t: T;
  draft: string;
  setDraft: (v: string) => void;
  full: boolean;
  onClose: () => void;
  onSaved: (s: Star, origin?: { x: number; y: number; size: number }) => void;
  reduced: boolean;
}) {
  const [step, setStep] = useState(0),
    [dir, setDir] = useState(1),
    [category, setCategory] = useState<Category>('effort'),
    [color, setColor] = useState<Color>('gold'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmArchive, setConfirmArchive] = useState(false),
    [folding, setFolding] = useState(false);
  const submitting = useRef(false);
  const saved = useRef<Star | null>(null);
  const count = graphemes(draft).length;
  const valid = Boolean(draft.trim()) && count <= 180;
  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    setError('');
  };
  const submit = async (event?: FormEvent, archive = false) => {
    event?.preventDefault();
    if (submitting.current) return;
    if (!draft.trim() || count > 180) {
      go(0);
      setError(t.invalidText);
      return;
    }
    if (full && !archive) {
      setConfirmArchive(true);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    unlockAudio();
    play('fold');
    try {
      const star = await addStar({ text: draft, category, colorId: color }, archive);
      if (reduced) {
        onSaved(star);
        return;
      }
      saved.current = star;
      setFolding(true);
    } catch (e) {
      if (e instanceof Error && e.message === 'JAR_FULL') setConfirmArchive(true);
      else {
        go(0);
        setError(t.storageError);
      }
      setBusy(false);
    } finally {
      submitting.current = false;
      if (reduced) setBusy(false);
    }
  };
  const title = confirmArchive ? t.fullTitle : t[TITLES[step]];
  return (
    <Modal
      title={title}
      closeLabel={t.close}
      onClose={onClose}
      busy={busy || folding}
      reduced={reduced}
      tone="ritual"
      folding={folding}
      foldColor={saved.current?.colorId ?? color}
      foldCategory={saved.current?.category ?? category}
      foldText={saved.current?.text ?? draft}
      onFolded={(origin) => {
        if (saved.current) onSaved(saved.current, origin);
      }}
    >
      {confirmArchive ? (
        <>
          <p>{t.fullText}</p>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="dialog-actions vertical">
            <Press className="button primary" disabled={busy} onClick={() => void submit(undefined, true)}>
              {busy ? t.saving : t.archive}
            </Press>
            <Press className="text-button" disabled={busy} onClick={() => setConfirmArchive(false)}>
              <ArrowLeft size={16} />
              {t.cancel}
            </Press>
          </div>
        </>
      ) : (
        <form className="add-flow" onSubmit={(e) => void submit(e)}>
          <ol className="add-progress" aria-hidden="true">
            {[0, 1, 2].map((n) => (
              <li key={n} className={n === step ? 'is-current' : n < step ? 'is-done' : ''} />
            ))}
          </ol>
          <div className="add-stage">
            <AnimatePresence mode="wait" custom={dir}>
              {step === 0 ? (
                <motion.div
                  key="write"
                  className="add-step"
                  custom={dir}
                  variants={addStep(dir)}
                  initial={reduced ? false : 'enter'}
                  animate="center"
                  exit="exit"
                >
                  <p className="modal-intro">{t.addIntro}</p>
                  <label className="sr-only" htmlFor="win-text">
                    {t.textLabel}
                  </label>
                  <textarea
                    id="win-text"
                    autoFocus
                    value={draft}
                    placeholder={t.prompt}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={busy}
                    aria-describedby="char-count"
                    aria-invalid={count > 180}
                  />
                  <p className={`character-count ${count > 180 ? 'error' : ''}`} id="char-count">
                    {count} / 180
                  </p>
                  {error ? (
                    <p role="alert" className="error">
                      {error}
                    </p>
                  ) : null}
                  <div className="add-step-actions">
                    <Press
                      className="button primary"
                      type="button"
                      disabled={!valid}
                      onClick={() => go(1)}
                    >
                      {t.next}
                    </Press>
                  </div>
                </motion.div>
              ) : step === 1 ? (
                <motion.div
                  key="kind"
                  className="add-step"
                  custom={dir}
                  variants={addStep(dir)}
                  initial={reduced ? false : 'enter'}
                  animate="center"
                  exit="exit"
                >
                  <div className="add-kinds">
                    {CATEGORIES.map((item, i) => (
                      <Press
                        type="button"
                        key={item}
                        aria-pressed={category === item}
                        className={`category-card add-kind${category === item ? ' selected' : ''}`}
                        initial={reduced ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.035, duration: 0.34, ease: fairytale }}
                        onClick={() => setCategory(item)}
                      >
                        <span className="category-card-icon">
                          <Icon name={item} size={22} />
                        </span>
                        <span className="category-card-name">{t[item]}</span>
                      </Press>
                    ))}
                  </div>
                  <div className="add-kind-hero">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={category}
                        className="add-kind-sigil"
                        initial={reduced ? false : { opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduced ? undefined : { opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.28, ease: fairytale }}
                      >
                        <span className="add-kind-glyph" aria-hidden="true">
                          <Icon name={category} size={40} />
                        </span>
                        <p className="add-kind-hint">{t[`${category}Hint` as keyof T]}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="add-step-actions">
                    <Press className="text-button" type="button" onClick={() => go(0)}>
                      <ArrowLeft size={16} />
                      {t.back}
                    </Press>
                    <Press className="button primary" type="button" onClick={() => go(2)}>
                      {t.next}
                    </Press>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="fold"
                  className={`add-step add-step-fold${busy ? ' is-sealing' : ''}`}
                  custom={dir}
                  variants={addStep(dir)}
                  initial={reduced ? false : 'enter'}
                  animate="center"
                  exit="exit"
                >
                  <motion.div
                    className="add-sheet"
                    style={{ ['--star' as string]: PALETTE[color], transformPerspective: 700 }}
                    animate={
                      busy && !folding && !reduced
                        ? { scale: 0.88, rotateX: 38, rotateY: -8, opacity: 0.45 }
                        : { scale: 1, rotateX: 0, rotateY: 0, opacity: 1 }
                    }
                    transition={{ duration: 0.45, ease: fairytale }}
                  >
                    <span className="add-sheet-creases" aria-hidden="true" />
                    <p className="add-sheet-text">{draft.trim()}</p>
                    <StarFigure
                      star={{ colorId: color, category, isFavorite: false }}
                      size={54}
                      pad={2.15}
                      lit
                    />
                    <p className="add-sheet-meta">
                      {t[category]} · {t[color]}
                    </p>
                  </motion.div>
                  <div className="color-choices add-lights">
                    {COLORS.map((item) => (
                      <Press
                        key={item}
                        type="button"
                        className={`color-choice ${color === item ? 'selected' : ''}`}
                        style={{ backgroundColor: PALETTE[item], color: PALETTE[item] }}
                        aria-label={t[item]}
                        title={t[item]}
                        aria-pressed={color === item}
                        animate={color === item ? { scale: 1.14 } : { scale: 1 }}
                        disabled={busy}
                        onClick={() => setColor(item)}
                      />
                    ))}
                  </div>
                  {error ? (
                    <p role="alert" className="error">
                      {error}
                    </p>
                  ) : null}
                  <div className="add-step-actions">
                    <Press className="text-button" type="button" disabled={busy} onClick={() => go(1)}>
                      <ArrowLeft size={16} />
                      {t.back}
                    </Press>
                    <Press
                      className="button primary fold-button"
                      type="submit"
                      sound="none"
                      disabled={busy || !valid}
                    >
                      <Icon name="add-star" />
                      {busy ? t.saving : t.fold}
                    </Press>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      )}
    </Modal>
  );
}
