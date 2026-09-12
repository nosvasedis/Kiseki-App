import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Quote, Share2, Sparkles } from 'lucide-react';
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
  const privacyName = useId();
  const helpId = useId();
  const summary = summarizeMonth(stars, month);
  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(locale(language), {
      month: 'long',
      year: 'numeric',
    });
  })();
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
  const canShare = typeof navigator.share === 'function';
  return (
    <section className="page wrapped-page">
      <header className="page-heading wrapped-heading">
        <h1>{t.wrappedTitle}</h1>
        <p>{t.wrappedIntro}</p>
      </header>
      <div className="wrapped-layout">
        <div className="wrapped-stage">
          <div className="wrapped-glow" aria-hidden="true" />
          <span className="wrapped-spark wrapped-spark-a" aria-hidden="true" />
          <span className="wrapped-spark wrapped-spark-b" aria-hidden="true" />
          <span className="wrapped-spark wrapped-spark-c" aria-hidden="true" />
          <span className="wrapped-spark wrapped-spark-d" aria-hidden="true" />
          <figure className={`wrapped-frame${ready ? ' is-ready' : ''}`}>
            <span className="wrapped-corner wrapped-corner-tr" aria-hidden="true" />
            <span className="wrapped-corner wrapped-corner-bl" aria-hidden="true" />
            <motion.canvas
              className="wrapped-card"
              ref={canvas}
              role="img"
              aria-label={`${t.wrapped} · ${monthLabel} · ${summary.total} ${t.wins}`}
              initial={{ opacity: 0.2, y: 16 }}
              animate={{ opacity: ready ? 1 : 0.38, y: ready ? 0 : 10 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
            {ready ? null : <div className="wrapped-veil">{t.preparing}</div>}
          </figure>
        </div>
        <div className="wrapped-panel">
          {summary.total > 0 ? (
            <div className="wrapped-stats">
              <p className="wrapped-count">{summary.total}</p>
              <p className="wrapped-count-meta">
                {t.wins}
                {summary.dominant ? ` · ${t[summary.dominant]}` : ''}
                {summary.hour !== null ? ` · ${String(summary.hour).padStart(2, '0')}:00` : ''}
              </p>
            </div>
          ) : (
            <div className="empty-note">
              <h2>{t.wrappedEmpty}</h2>
              <p>{t.wrappedEmptyText}</p>
            </div>
          )}
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
          <p className="muted small wrapped-hint">{t.pastMonthOnly}</p>
          {summary.total > 0 ? (
            <fieldset className="wrapped-privacy" aria-describedby={helpId}>
              <legend>{t.includeMode}</legend>
              <div className="wrapped-choice">
                <label>
                  <input
                    type="radio"
                    name={privacyName}
                    checked={!include}
                    onChange={() => setInclude(false)}
                  />
                  <Sparkles size={16} />
                  {t.hideText}
                </label>
                <label>
                  <input
                    type="radio"
                    name={privacyName}
                    checked={include}
                    onChange={() => setInclude(true)}
                  />
                  <Quote size={16} />
                  {t.includeText}
                </label>
              </div>
              <p id={helpId} className="muted small wrapped-privacy-help">
                {include ? t.includeHelpOn : t.includeHelpOff}
              </p>
            </fieldset>
          ) : null}
          <div className="wrapped-actions">
            <Press className="button primary" disabled={busy || !ready} onClick={() => void output(false)}>
              <Download size={18} />
              {ready ? t.download : t.preparing}
            </Press>
            {canShare ? (
              <Press className="button secondary compact" disabled={busy || !ready} onClick={() => void output(true)}>
                <Share2 size={16} />
                {t.share}
              </Press>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
