import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Share2, EyeOff } from 'lucide-react';
import { pastMonths, summarizeMonth, type Star, type Language } from '../lib/models';
import { locale, type T } from '../lib/i18n';
import { renderCard, canvasBlob } from '../lib/card';
import { download } from '../lib/backup';
import { Press } from './Press';
export default function Wrapped({
  stars,
  language,
  t,
}: {
  stars: Star[];
  language: Language;
  t: T;
}) {
  const months = pastMonths(stars);
  const [month, setMonth] = useState(months[0]);
  const [include, setInclude] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const blob = useRef<Blob | null>(null);
  const summary = summarizeMonth(stars, month);
  useEffect(() => {
    const version = ++generation.current;
    let cancelled = false;
    setReady(false);
    blob.current = null;
    setError('');
    const offscreen = document.createElement('canvas');
    void renderCard(offscreen, stars, month, language, include)
      .then(async () => {
        const png = await canvasBlob(offscreen);
        if (cancelled || version !== generation.current) return;
        const target = canvas.current;
        if (target) {
          target.width = 1080;
          target.height = 1920;
          target.getContext('2d')?.drawImage(offscreen, 0, 0);
          blob.current = png;
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled && version === generation.current) setError(t.exportError);
      });
    return () => {
      cancelled = true;
    };
  }, [stars, month, language, include, t.exportError]);
  const output = async (share: boolean) => {
    if (!blob.current) return;
    setBusy(true);
    setError('');
    try {
      const file = new File([blob.current], `kiseki-${month}.png`, { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Kiseki' });
      } else download(file, file.name);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(t.exportError);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page wrapped-page">
      <header className="page-heading">
        <h1>{t.wrappedTitle}</h1>
        <p>{t.wrappedIntro}</p>
      </header>
      <div className="wrapped-layout">
        <div className="wrapped-controls">
          <label className="field-label" htmlFor="month">
            {t.month}
          </label>
          <select id="month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((key) => {
              const [y, m] = key.split('-').map(Number);
              return (
                <option key={key} value={key}>
                  {new Date(y, m - 1, 1).toLocaleDateString(locale(language), {
                    month: 'long',
                    year: 'numeric',
                  })}
                </option>
              );
            })}
          </select>
          <p className="muted small">{t.pastMonthOnly}</p>
          {summary.total === 0 ? (
            <div className="empty-note">
              <h2>{t.wrappedEmpty}</h2>
              <p>{t.wrappedEmptyText}</p>
            </div>
          ) : null}
          <label className="toggle-row">
            <span>
              <EyeOff size={18} />
              {t.includeText}
            </span>
            <input
              type="checkbox"
              checked={include}
              onChange={(e) => setInclude(e.target.checked)}
            />
          </label>
          <Press
            className="button primary"
            disabled={busy || !ready}
            onClick={() => void output(false)}
          >
            <Download size={18} />
            {ready ? t.download : t.preparing}
          </Press>
          {typeof navigator.share === 'function' ? (
            <Press
              className="button secondary"
              disabled={busy || !ready}
              onClick={() => void output(true)}
            >
              <Share2 size={18} />
              {t.share}
            </Press>
          ) : null}
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
        </div>
        <motion.canvas
          className="wrapped-card"
          ref={canvas}
          role="img"
          aria-label={`${t.wrapped} · ${month} · ${summary.total} ${t.wins}`}
          initial={{ opacity: 0.25, y: 12 }}
          animate={{ opacity: ready ? 1 : 0.35, y: ready ? 0 : 8 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </section>
  );
}
