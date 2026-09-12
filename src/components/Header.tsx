import { motion } from 'motion/react';
import { Settings, Volume2, VolumeX } from 'lucide-react';
import { COLORS, PALETTE } from '../lib/models';
import { play } from '../lib/sensory';
import type { T } from '../lib/i18n';
import { BrandMark } from './BrandMark';
export type View = 'jar' | 'memories' | 'wrapped';
export function Header({
  view,
  onView,
  onSettings,
  ambientMuted,
  onAmbientMute,
  t,
}: {
  view: View;
  onView: (next: View) => void;
  onSettings: () => void;
  ambientMuted: boolean;
  onAmbientMute: (muted: boolean) => void;
  t: T;
}) {
  return (
    <header className="app-header">
      <div className="header-dust" aria-hidden="true">
        {COLORS.map((color, i) => (
          <span
            key={color}
            className="header-spark"
            style={{
              color: PALETTE[color],
              left: `${4 + i * 6.8}%`,
              top: i % 2 ? '22%' : '58%',
              animationDelay: `${i * 0.38}s`,
            }}
          />
        ))}
      </div>
      <div className="header-inner">
        <a
          className="wordmark"
          href="#"
          aria-label="Kiseki"
          onClick={(e) => {
            e.preventDefault();
            if (view !== 'jar') play('page');
            onView('jar');
          }}
        >
          <BrandMark size={48} />
          <span className="wordmark-text">Kiseki</span>
        </a>
        <nav aria-label="Kiseki">
          {(['jar', 'memories', 'wrapped'] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-current={view === item ? 'page' : undefined}
              onClick={() => {
                if (view !== item) play('page');
                onView(item);
              }}
            >
              {t[item]}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <motion.button
            type="button"
            className="icon-button mute-button"
            aria-label={ambientMuted ? t.ambientUnmute : t.ambientMute}
            aria-pressed={ambientMuted}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              play('tap');
              onAmbientMute(!ambientMuted);
            }}
          >
            {ambientMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </motion.button>
          <motion.button
            type="button"
            className="icon-button settings-button"
            aria-label={t.settings}
            whileHover={{ rotate: 20 }}
            whileTap={{ scale: 0.9, rotate: 48 }}
            onClick={() => {
              play('tap');
              onSettings();
            }}
          >
            <Settings size={25} />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
