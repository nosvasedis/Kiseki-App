import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  Plus,
  LockKeyhole,
  Heart,
  ArrowLeft,
  Download,
  Upload,
  Sparkles,
  X,
} from 'lucide-react';
import { db, initialize, addStar, exportBackup, mergeBackup } from './lib/db';
import {
  CAPACITY,
  CATEGORIES,
  COLORS,
  PALETTE,
  defaultPreferences,
  graphemes,
  recall,
  starRadius,
  type Star,
  type Preferences,
  type Backup,
  type Category,
  type Color,
} from './lib/models';
import { dictionaries, locale, type T } from './lib/i18n';
import { parseBackup, download } from './lib/backup';
import { loadingQuote } from './lib/quotes';
import { memoryTitle, openingRemark } from './lib/remarks';
import { detectInstall, windowInstallEnv } from './lib/install';
import {
  unlockAudio,
  chime,
  play,
  requestMotion,
  setSoundVolume,
  setAmbientMuted,
  ShakeDetector,
} from './lib/sensory';
import { fadeUp, listItem, listStagger, toastFx, bootMark } from './lib/fx';
import { JarCanvas } from './components/JarCanvas';
import { Modal } from './components/Modal';
import { Icon } from './components/Icon';
import { Header, type View } from './components/Header';
import { Sky } from './components/Sky';
import { BrandMark } from './components/BrandMark';
import { Press } from './components/Press';
import { Reveal } from './components/Reveal';
import { FOLD_STAR_PAD, REVEAL_STAR_SIZE, STAR_FIGURE_PAD, StarFigure } from './components/StarFigure';
import type { StarOrigin } from './lib/physics';
const Wrapped = lazy(() => import('./components/Wrapped'));
type Overlay = 'add' | 'settings' | 'reveal' | 'delete' | null;
function readDraft() {
  try {
    return sessionStorage.getItem('kiseki-draft') ?? '';
  } catch {
    return '';
  }
}
function saveDraft(text: string) {
  try {
    sessionStorage.setItem('kiseki-draft', text);
  } catch {
    /* The in-memory draft remains editable when session storage is unavailable. */
  }
}
export default function App() {
  const [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(false);
  const [defaults] = useState(defaultPreferences);
  const data = useLiveQuery(async () => {
    const [stars, jars, prefs] = await Promise.all([
      db.stars.orderBy('createdAt').toArray(),
      db.jars.orderBy('createdAt').toArray(),
      db.preferences.get('user'),
    ]);
    return { stars, jars, prefs };
  }, []);
  const prefs = data?.prefs ?? defaults,
    t = dictionaries[prefs.language];
  const stars = data?.stars;
  const jars = data?.jars;
  const active = jars?.find((j) => j.archivedAt === null);
  const [view, setView] = useState<View>('jar'),
    [overlay, setOverlay] = useState<Overlay>(null),
    [selected, setSelected] = useState<Star | null>(null),
    [filter, setFilter] = useState('all'),
    [favorites, setFavorites] = useState(false),
    [limit, setLimit] = useState(30),
    [freshId, setFreshId] = useState<string | null>(null),
    [shake, setShake] = useState(0),
    [notice, setNotice] = useState(''),
    [draft, setDraft] = useState(readDraft),
    [intro, setIntro] = useState(true),
    [dust, setDust] = useState(false);
  const [dropping, setDropping] = useState<{
    star: Star;
    x: number;
    y: number;
    size: number;
    land: number;
    to: { x: number; y: number };
  } | null>(null);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [liftOrigin, setLiftOrigin] = useState<StarOrigin | null>(null);
  const [revealLeaving, setRevealLeaving] = useState(false);
  const [remark, setRemark] = useState('');
  const [heading, setHeading] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const [recalling, setRecalling] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    void initialize()
      .then(() => setLoaded(true))
      .catch(() => setLoadError(true));
  }, []);
  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.documentElement.dataset.motion = prefs.reducedMotion ? 'reduced' : 'full';
  }, [prefs.language, prefs.reducedMotion]);
  useEffect(() => {
    setSoundVolume(prefs.soundVolume);
    setAmbientMuted(Boolean(prefs.ambientMuted));
  }, [prefs.soundVolume, prefs.ambientMuted]);
  useEffect(() => {
    if (!notice) return;
    play('toast');
    const timer = setTimeout(() => setNotice(''), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!loaded || !data) return;
    if (prefs.reducedMotion) {
      setIntro(false);
      return;
    }
    const timer = setTimeout(() => setIntro(false), 1200);
    return () => clearTimeout(timer);
  }, [loaded, data, prefs.reducedMotion]);
  useEffect(() => {
    if (!dust) return;
    const timer = setTimeout(() => setDust(false), 520);
    return () => clearTimeout(timer);
  }, [dust]);
  const updatePrefs = async (patch: Partial<Preferences>) => {
    try {
      await db.preferences.update('user', patch);
    } catch {
      setNotice(t.errorAction);
    }
  };
  const present = (star: Star) => {
    setSelected(star);
    setRemark(openingRemark(prefs.language));
    setHeading(memoryTitle(prefs.language));
    setLiftOrigin(null);
    setRevealLeaving(false);
  };
  const recallAction = () => {
    if (recalling || liftedId) return;
    unlockAudio();
    const pool = (stars ?? []).filter(
      (s) => (filter === 'all' || s.jarId === filter) && (!favorites || s.isFavorite),
    );
    const star = recall(pool);
    if (!star) {
      setNotice(t.emptyRecall);
      return;
    }
    present(star);
    play('lift');
    chime(COLORS.indexOf(star.colorId), prefs.soundVolume);
    if (view === 'jar' && star.jarId === active?.id && !prefs.reducedMotion) {
      setRecalling(true);
      setLiftedId(star.id);
      return;
    }
    setOverlay('reveal');
  };
  const recallRef = useRef(recallAction);
  useEffect(() => {
    recallRef.current = recallAction;
  });
  useEffect(() => {
    if (!prefs.motionEnabled || view !== 'jar' || overlay || recalling) return;
    let detector = new ShakeDetector();
    const listener = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (
        a &&
        a.x !== null &&
        a.y !== null &&
        a.z !== null &&
        detector.sample(a.x, a.y, a.z, event.timeStamp)
      )
        recallRef.current();
    };
    const visibility = () => {
      window.removeEventListener('devicemotion', listener);
      detector = new ShakeDetector();
      if (!document.hidden) window.addEventListener('devicemotion', listener);
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('devicemotion', listener);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [prefs.motionEnabled, view, overlay, recalling]);
  const favorite = async (star: Star) => {
    try {
      await db.stars.update(star.id, { isFavorite: !star.isFavorite });
      if (selected?.id === star.id) setSelected({ ...star, isFavorite: !star.isFavorite });
    } catch {
      setNotice(t.errorAction);
    }
  };
  const currentStars = (stars ?? []).filter((s) => s.jarId === active?.id);
  const filtered = (stars ?? [])
    .filter((s) => (filter === 'all' || s.jarId === filter) && (!favorites || s.isFavorite))
    .sort((a, b) => b.createdAt - a.createdAt);
  const jarName = (jarId: string) => {
    const jar = jars?.find((j) => j.id === jarId);
    return `${jar?.archivedAt === null ? t.activeJar : t.archivedJar} · ${new Date(jar?.createdAt ?? Date.now()).toLocaleDateString(locale(prefs.language), { day: 'numeric', month: 'short' })}`;
  };
  if (loadError)
    return (
      <main className="load-screen">
        <Sky reduced />
        <BrandMark size={72} />
        <p className="wordmark-text">Kiseki</p>
        <p className="loading-quote">{loadingQuote(prefs.language)}</p>
        <p role="alert">{t.loadError}</p>
        <Press className="button primary" onClick={() => location.reload()}>
          {t.retry}
        </Press>
      </main>
    );
  if (!loaded || !data || !active)
    return (
      <main className="load-screen">
        <Sky reduced />
        <BrandMark className="boot-logo" size={72} />
        <p className="wordmark-text">Kiseki</p>
        <p className="loading-quote">{loadingQuote(prefs.language)}</p>
        <p>{t.loading}</p>
      </main>
    );
  return (
    <MotionConfig reducedMotion={prefs.reducedMotion ? 'always' : 'user'}>
      <div className="app-shell">
        <Sky reduced={prefs.reducedMotion} />
        <Header
          view={view}
          t={t}
          ambientMuted={Boolean(prefs.ambientMuted)}
          onAmbientMute={(next) => {
            unlockAudio();
            void updatePrefs({ ambientMuted: next });
          }}
          onView={(next) => {
            setView(next);
            setLimit(30);
          }}
          onSettings={() => setOverlay('settings')}
        />
        <main id="main-content" className="app-scroll">
          <section className={`jar-page ${view === 'jar' ? 'is-active' : 'is-idle'}`}>
            <header className="hero-heading">
              <h1>{t.headline}</h1>
              <p>{t.subtitle}</p>
            </header>
            <div className="jar-stage" ref={stageRef}>
              <JarCanvas
                stars={currentStars}
                jarId={active.id}
                reduced={prefs.reducedMotion}
                paused={view !== 'jar' || (overlay !== null && overlay !== 'reveal') || !!dropping}
                hiddenId={
                  liftedId && (overlay === 'reveal' || overlay === 'delete') ? liftedId : null
                }
                shake={shake}
                freshId={freshId}
                volume={prefs.soundVolume}
                label={`${t.jar} · ${currentStars.length} ${t.count}`}
                liftId={prefs.reducedMotion ? null : liftedId}
                onPick={(star) => {
                  unlockAudio();
                  play('lift');
                  chime(COLORS.indexOf(star.colorId), prefs.soundVolume);
                  present(star);
                  if (prefs.reducedMotion) {
                    setOverlay('reveal');
                    return;
                  }
                  setLiftedId(star.id);
                }}
                onApex={(origin) => {
                  setLiftOrigin(origin);
                  setRecalling(false);
                  setOverlay('reveal');
                }}
              />
              {dust ? (
                <div className="fold-dust" aria-hidden="true">
                  {COLORS.map((color, i) => (
                    <span
                      key={color}
                      style={{
                        color: PALETTE[color],
                        ['--dust-x' as string]: `${(i - 6.5) * 12}px`,
                        animationDelay: `${i * 28}ms`,
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="ritual-actions">
              <p className="jar-caption">{currentStars.length ? t.kept : t.first}</p>
              {currentStars.length > 0 ? (
                <p className="jar-count">
                  {currentStars.length} / {CAPACITY} · {t.count}
                </p>
              ) : null}
              <Press
                className="button primary add-button"
                onClick={() => {
                  unlockAudio();
                  setOverlay('add');
                }}
              >
                <Plus size={21} />
                {t.add}
              </Press>
              <Press className="button secondary" onClick={recallAction} disabled={recalling}>
                <Icon name="shake-jar" />
                {t.recall}
              </Press>
            </div>
            <p className="privacy-line">
              <LockKeyhole size={14} />
              {t.private}
            </p>
          </section>
          <AnimatePresence mode="wait">
            {view === 'memories' ? (
              <motion.section
                className="page memories-page"
                key="memories"
                variants={fadeUp}
                initial={prefs.reducedMotion ? false : 'hidden'}
                animate="show"
                exit="exit"
              >
                <header className="page-heading">
                  <h1>{t.memories}</h1>
                  <p>{t.localOnly}</p>
                </header>
                <div className="memory-toolbar">
                  <label>
                    <span className="sr-only">{t.selectJar}</span>
                    <select
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setLimit(30);
                      }}
                    >
                      <option value="all">{t.allJars}</option>
                      {jars?.map((j) => (
                        <option key={j.id} value={j.id}>
                          {jarName(j.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Press
                    className={`filter-button ${favorites ? 'selected' : ''}`}
                    aria-pressed={favorites}
                    onClick={() => {
                      setFavorites((s) => !s);
                      setLimit(30);
                    }}
                  >
                    <Heart size={17} fill={favorites ? 'currentColor' : 'none'} />
                    {t.favorites}
                  </Press>
                  <Press
                    className="button secondary compact"
                    onClick={recallAction}
                    disabled={recalling}
                  >
                    <Sparkles size={17} />
                    {t.recall}
                  </Press>
                </div>
                {filtered.length ? (
                  <motion.div
                    className="memory-list"
                    variants={listStagger}
                    initial={prefs.reducedMotion ? false : 'hidden'}
                    animate="show"
                  >
                    {filtered.slice(0, limit).map((star) => (
                      <motion.article
                        className="memory-row"
                        key={star.id}
                        variants={listItem}
                        style={{ ['--star' as string]: PALETTE[star.colorId] }}
                      >
                        <button
                          className="memory-open"
                          onClick={() => {
                            present(star);
                            setOverlay('reveal');
                          }}
                        >
                          <span className="memory-symbol" style={{ color: PALETTE[star.colorId] }}>
                            <Icon name={star.category} size={25} />
                          </span>
                          <div>
                            <p>{star.text}</p>
                            <span className="memory-meta">
                              {new Date(star.createdAt).toLocaleDateString(locale(prefs.language), {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}{' '}
                              · {t[star.category]}
                            </span>
                          </div>
                        </button>
                        <Press
                          className="icon-button favorite-button"
                          aria-label={star.isFavorite ? t.unfavorite : t.favorite}
                          aria-pressed={star.isFavorite}
                          onClick={() => void favorite(star)}
                        >
                          <Heart size={19} fill={star.isFavorite ? 'currentColor' : 'none'} />
                        </Press>
                      </motion.article>
                    ))}
                  </motion.div>
                ) : (
                  <div className="empty-state">
                    <Sparkles size={36} />
                    <h2>{stars?.length ? t.nothingFiltered : t.noMemories}</h2>
                    <p>{t.noMemoriesText}</p>
                    <Press className="button primary" onClick={() => setOverlay('add')}>
                      <Plus size={18} />
                      {t.add}
                    </Press>
                  </div>
                )}
                {filtered.length > limit ? (
                  <Press
                    className="button secondary load-more"
                    onClick={() => setLimit((n) => n + 30)}
                  >
                    {t.more}
                  </Press>
                ) : null}
              </motion.section>
            ) : null}
            {view === 'wrapped' ? (
              <motion.div
                key="wrapped"
                variants={fadeUp}
                initial={prefs.reducedMotion ? false : 'hidden'}
                animate="show"
                exit="exit"
              >
                <Suspense fallback={<p className="load-screen">{t.preparing}</p>}>
                  <Wrapped stars={data.stars} language={prefs.language} t={t} />
                </Suspense>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
        {view !== 'jar' ? (
          <footer className="page-footer">
            <LockKeyhole size={14} />
            {t.private}
          </footer>
        ) : null}
        <AnimatePresence>
          {notice ? (
            <motion.div
              className="toast"
              role="status"
              key={notice}
              variants={toastFx}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {notice}
              <Press className="icon-button" aria-label={t.dismiss} onClick={() => setNotice('')}>
                <X size={16} />
              </Press>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {needRefresh || offlineReady ? (
            <motion.aside
              className="update-banner"
              role="status"
              variants={toastFx}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <p>{needRefresh ? t.update : t.offlineReady}</p>
              {needRefresh ? (
                <>
                  <span className="small">{t.updateHelp}</span>
                  <Press
                    className="button secondary compact"
                    disabled={!!draft.trim() || overlay !== null}
                    onClick={() => void updateServiceWorker(true)}
                  >
                    {t.updateAction}
                  </Press>
                </>
              ) : null}
              <Press
                className="icon-button"
                aria-label={t.dismiss}
                onClick={() => {
                  setNeedRefresh(false);
                  setOfflineReady(false);
                }}
              >
                <X size={17} />
              </Press>
            </motion.aside>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {dropping ? (
            <motion.div
              key={dropping.star.id}
              className="kiseki-drop"
              style={{
                left: dropping.x,
                top: dropping.y,
                width: dropping.size,
                height: dropping.size,
                color: PALETTE[dropping.star.colorId],
              }}
              initial={{
                x: '-50%',
                y: '-50%',
                scale: 1,
                rotate: 12,
                opacity: 1,
                filter: 'brightness(1.75)',
              }}
              animate={{
                x: '-50%',
                y: '-50%',
                left: dropping.to.x,
                top: dropping.to.y,
                scale: [1, 1.14, Math.max(0.18, dropping.land / (dropping.size / FOLD_STAR_PAD))],
                rotate: [12, 28, 6],
                opacity: [1, 1, 0.28],
                filter: ['brightness(1.75)', 'brightness(2.15)', 'brightness(1.2)'],
              }}
              transition={{ duration: 0.64, times: [0, 0.6, 1], ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => {
                setFreshId(dropping.star.id);
                setDust(true);
                setDropping(null);
              }}
            >
              <StarFigure
                star={dropping.star}
                size={Math.max(8, Math.round(dropping.size / FOLD_STAR_PAD))}
                pad={FOLD_STAR_PAD}
                lit
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {overlay === 'add' ? (
          <AddWin
            t={t}
            draft={draft}
            setDraft={(value) => {
              setDraft(value);
              saveDraft(value);
            }}
            full={currentStars.length >= CAPACITY}
            onClose={() => setOverlay(null)}
            onSaved={(star, origin) => {
              setDraft('');
              saveDraft('');
              setView('jar');
              setNotice(t.saved);
              if (prefs.reducedMotion || !origin) {
                setFreshId(star.id);
                setOverlay(null);
                setDust(true);
                return;
              }
              const scene = stageRef.current?.querySelector('.jar-scene');
              const jar = scene?.getBoundingClientRect();
              const radius = starRadius(star);
              setDropping({
                star,
                x: origin.x,
                y: origin.y,
                size: origin.size,
                land: jar ? radius * 2 * (jar.width / 400) : radius * 2,
                to: jar
                  ? { x: jar.left + jar.width * 0.5, y: jar.top + jar.height * (40 / 420) }
                  : { x: origin.x, y: origin.y + 120 },
              });
              setOverlay(null);
            }}
            reduced={prefs.reducedMotion}
          />
        ) : null}
        {overlay === 'settings' ? (
          <Modal
            title={t.settings}
            closeLabel={t.close}
            onClose={() => setOverlay(null)}
            feedback={notice}
            reduced={prefs.reducedMotion}
          >
            <SettingsPanel prefs={prefs} t={t} update={updatePrefs} notify={setNotice} />
          </Modal>
        ) : null}
        {overlay === 'reveal' && selected ? (
          <Modal
            title={heading || t.memoryTitle}
            closeLabel={t.close}
            onClosing={() => setRevealLeaving(true)}
            onClose={() => {
              setOverlay(null);
              setRevealLeaving(false);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setLiftedId(null);
                  setLiftOrigin(null);
                });
              });
            }}
            feedback={notice}
            reduced={prefs.reducedMotion}
            tone="reveal"
            accent={PALETTE[selected.colorId]}
            anchor={prefs.reducedMotion ? null : liftOrigin}
            hero={
              <StarFigure
                star={selected}
                size={REVEAL_STAR_SIZE}
                pad={STAR_FIGURE_PAD}
                lit
              />
            }
          >
            <Reveal
              star={selected}
              title={heading || t.memoryTitle}
              remark={remark || t.remember}
              date={new Date(selected.createdAt).toLocaleDateString(locale(prefs.language), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              category={t[selected.category]}
              favoriteLabel={t.favorite}
              unfavoriteLabel={t.unfavorite}
              deleteLabel={t.delete}
              reduced={prefs.reducedMotion}
              leaving={revealLeaving}
              onFavorite={() => void favorite(selected)}
              onDelete={() => setOverlay('delete')}
            />
          </Modal>
        ) : null}
        {overlay === 'delete' && selected ? (
          <Modal
            title={t.deleteTitle}
            closeLabel={t.close}
            onClose={() => setOverlay('reveal')}
            feedback={notice}
            reduced={prefs.reducedMotion}
          >
            <p>{t.deleteText}</p>
            <div className="dialog-actions">
              <Press className="button secondary" onClick={() => setOverlay('reveal')}>
                {t.cancel}
              </Press>
              <Press
                className="button destructive"
                onClick={() => {
                  void db.stars
                    .delete(selected.id)
                    .then(() => {
                      setOverlay(null);
                      setSelected(null);
                      setLiftedId(null);
                      setLiftOrigin(null);
                      setNotice(t.deleteDone);
                    })
                    .catch(() => setNotice(t.errorAction));
                }}
              >
                {t.delete}
              </Press>
            </div>
          </Modal>
        ) : null}
        <AnimatePresence>
          {intro && !prefs.reducedMotion ? (
            <motion.div
              className="boot-screen"
              key="boot"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.45 } }}
            >
              <motion.div variants={bootMark} initial="hidden" animate="show">
                <BrandMark size={96} />
              </motion.div>
              <motion.p
                className="wordmark-text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.5 }}
              >
                Kiseki
              </motion.p>
              <motion.p
                className="loading-quote"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.55 }}
              >
                {loadingQuote(prefs.language)}
              </motion.p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
function AddWin({
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
  const [category, setCategory] = useState<Category>('effort'),
    [color, setColor] = useState<Color>('gold'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmArchive, setConfirmArchive] = useState(false),
    [folding, setFolding] = useState(false);
  const submitting = useRef(false);
  const saved = useRef<Star | null>(null);
  const count = graphemes(draft).length;
  const submit = async (event?: FormEvent, archive = false) => {
    event?.preventDefault();
    if (submitting.current) return;
    if (!draft.trim() || count > 180) {
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
      else setError(t.storageError);
      setBusy(false);
    } finally {
      submitting.current = false;
      if (reduced) setBusy(false);
    }
  };
  return (
    <Modal
      title={confirmArchive ? t.fullTitle : t.addTitle}
      closeLabel={t.close}
      onClose={onClose}
      busy={busy || folding}
      reduced={reduced}
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
            <Press
              className="button primary"
              disabled={busy}
              onClick={() => void submit(undefined, true)}
            >
              {busy ? t.saving : t.archive}
            </Press>
            <Press className="text-button" disabled={busy} onClick={() => setConfirmArchive(false)}>
              <ArrowLeft size={16} />
              {t.cancel}
            </Press>
          </div>
        </>
      ) : (
        <form onSubmit={(e) => void submit(e)}>
          <p className="modal-intro">{t.addIntro}</p>
          <motion.div
            animate={busy && !folding && !reduced ? { scale: 0.88, rotateX: 38, rotateY: -8, opacity: 0.45 } : { scale: 1, rotateX: 0, rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformPerspective: 700 }}
          >
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
          </motion.div>
          <fieldset disabled={busy}>
            <legend>{t.chooseCategory}</legend>
            <div className="category-grid">
              {CATEGORIES.map((item) => (
                <Press
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  className={`category-card${category === item ? ' selected' : ''}`}
                  onClick={() => setCategory(item)}
                >
                  <span className="category-card-icon">
                    <Icon name={item} size={22} />
                  </span>
                  <span className="category-card-name">{t[item]}</span>
                  <span className="category-card-hint">{t[`${item}Hint` as keyof T]}</span>
                </Press>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>{t.chooseColor}</legend>
            <div className="color-choices">
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
                  onClick={() => setColor(item)}
                />
              ))}
            </div>
            <p className="color-choice-label">{t[color]}</p>
          </fieldset>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <Press
            className="button primary fold-button"
            type="submit"
            sound="none"
            disabled={busy || !draft.trim() || count > 180}
          >
            <Icon name="add-star" />
            {busy ? t.saving : t.fold}
          </Press>
        </form>
      )}
    </Modal>
  );
}
function SettingsPanel({
  prefs,
  t,
  update,
  notify,
}: {
  prefs: Preferences;
  t: T;
  update: (v: Partial<Preferences>) => Promise<void>;
  notify: (v: string) => void;
}) {
  const [backup, setBackup] = useState<Backup | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const read = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('LIMIT');
      setBackup(parseBackup(await file.text()));
    } catch {
      setError(t.invalidBackup);
    }
    if (input.current) input.current.value = '';
  };
  const merge = async () => {
    if (!backup || busy) return;
    setBusy(true);
    try {
      await mergeBackup(backup);
      setBackup(null);
      notify(t.importSuccess);
    } catch {
      setError(t.errorAction);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="settings-content">
      <section>
        <label className="field-label" htmlFor="language">
          {t.language}
        </label>
        <select
          id="language"
          value={prefs.language}
          onChange={(e) => void update({ language: e.target.value as Preferences['language'] })}
        >
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </section>
      <section>
        <label className="field-label" htmlFor="volume">
          {t.sound} · {Math.round(prefs.soundVolume * 100)}%
        </label>
        <p className="muted small">{t.soundHelp}</p>
        <input
          id="volume"
          aria-label={t.volume}
          type="range"
          min="0"
          max="1"
          step=".05"
          value={prefs.soundVolume}
          onChange={(e) => {
            unlockAudio();
            void update({ soundVolume: Number(e.target.value) });
          }}
          onPointerUp={() => chime(0, prefs.soundVolume)}
        />
        <label className="toggle-row">
          <span>
            {t.ambientMute}
            <small>{t.ambientHelp}</small>
          </span>
          <input
            type="checkbox"
            checked={Boolean(prefs.ambientMuted)}
            onChange={(e) => {
              unlockAudio();
              void update({ ambientMuted: e.target.checked });
            }}
          />
        </label>
        <label className="toggle-row">
          <span>
            {t.reduceMotion}
            <small>{t.reduceHelp}</small>
          </span>
          <input
            type="checkbox"
            checked={prefs.reducedMotion}
            onChange={(e) => void update({ reducedMotion: e.target.checked })}
          />
        </label>
      </section>
      <section>
        <h3>{t.deviceShake}</h3>
        <p className="muted small">{t.shakeHelp}</p>
        <Press
          className="button secondary"
          onClick={() => {
            if (prefs.motionEnabled) {
              void update({ motionEnabled: false });
              return;
            }
            void requestMotion().then((granted) => {
              if (granted) {
                void update({ motionEnabled: true });
                notify(t.motionOn);
              } else notify(t.shakeDenied);
            });
          }}
        >
          {prefs.motionEnabled ? t.disableShake : t.enableShake}
        </Press>
      </section>
      <section>
        <h3>{t.backupTitle}</h3>
        <p className="muted small">{t.backupHelp}</p>
        <div className="backup-buttons">
          <Press
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void exportBackup()
                .then((b) => {
                  download(
                    new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }),
                    `kiseki-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  );
                  notify(t.backupExported);
                })
                .catch(() => setError(t.errorAction))
            }
          >
            <Download size={17} />
            {t.exportBackup}
          </Press>
          <Press
            className="button secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Upload size={17} />
            {t.importBackup}
          </Press>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label={t.importBackup}
            onChange={(e) => void read(e.target.files?.[0])}
          />
        </div>
        {backup ? (
          <div className="import-preview">
            <h3>{t.importTitle}</h3>
            <p className="small">{t.importHelp}</p>
            <p>
              {t.backupCount}: <b>{backup.stars.length}</b>
              <br />
              {t.jarCount}: <b>{backup.jars.length}</b>
            </p>
            <div className="dialog-actions vertical">
              <Press className="button primary" disabled={busy} onClick={() => void merge()}>
                {busy ? t.importBusy : t.importConfirm}
              </Press>
              <Press className="text-button" disabled={busy} onClick={() => setBackup(null)}>
                {t.cancel}
              </Press>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <section>
        <h3>{t.install}</h3>
        <InstallPanel t={t} />
      </section>
      <p className="version">Kiseki 0.1.0</p>
    </div>
  );
}
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
function InstallPanel({ t }: { t: T }) {
  const [kind, setKind] = useState(() =>
    typeof window === 'undefined' ? 'desktop' : detectInstall(windowInstallEnv()),
  );
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const refresh = () => setKind(detectInstall(windowInstallEnv()));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', refresh);
    refresh();
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', refresh);
    };
  }, []);
  const copy =
    kind === 'installed'
      ? t.installInstalled
      : kind === 'native'
        ? t.installNative
        : kind === 'ios'
          ? t.installIos
          : kind === 'android'
            ? t.installAndroid
            : t.installDesktop;
  return (
    <div className={`install-card install-${kind}`}>
      <p className="muted small">{copy}</p>
      {kind === 'ios' ? (
        <ol className="install-steps">
          <li>{t.installIosShare}</li>
          <li>{t.installIosHome}</li>
        </ol>
      ) : null}
      {(kind === 'android' || kind === 'desktop') && promptEvent ? (
        <Press
          className="button primary"
          onClick={() => {
            void promptEvent.prompt().then(() => {
              setPromptEvent(null);
              setKind(detectInstall(windowInstallEnv()));
            });
          }}
        >
          {t.installAction}
        </Press>
      ) : null}
    </div>
  );
}
