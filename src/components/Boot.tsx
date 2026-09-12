import { BrandMark } from './BrandMark';
import { Press } from './Press';

const MOTES = [
  { left: '12%', top: '18%', size: 2.2, delay: '0s' },
  { left: '28%', top: '11%', size: 1.6, delay: '0.8s' },
  { left: '71%', top: '16%', size: 2.4, delay: '0.3s' },
  { left: '88%', top: '24%', size: 1.8, delay: '1.1s' },
  { left: '8%', top: '72%', size: 2, delay: '0.5s' },
  { left: '81%', top: '78%', size: 2.2, delay: '0.2s' },
  { left: '46%', top: '8%', size: 1.5, delay: '1.4s' },
] as const;

export function BootScreen({
  quote,
  status,
  error,
  retry,
}: {
  quote: string;
  status?: string;
  error?: string;
  retry?: string;
}) {
  return (
    <>
      <div className="boot-motes" aria-hidden="true">
        {MOTES.map((mote) => (
          <span
            key={`${mote.left}-${mote.top}`}
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.size,
              animationDelay: mote.delay,
            }}
          />
        ))}
      </div>
      <BrandMark className="boot-logo" size={96} />
      <p className="wordmark-text">Kiseki</p>
      <p className="loading-quote">{quote}</p>
      {error ? (
        <>
          <p role="alert">{error}</p>
          {retry ? (
            <Press className="button primary" onClick={() => location.reload()}>
              {retry}
            </Press>
          ) : null}
        </>
      ) : (
        <p className={`boot-status${status ? '' : ' is-spacer'}`}>{status || '\u00a0'}</p>
      )}
    </>
  );
}
