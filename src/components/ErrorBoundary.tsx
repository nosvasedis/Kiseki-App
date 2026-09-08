import { Component, type ReactNode } from 'react';
import { defaultPreferences } from '../lib/models';
import { dictionaries } from '../lib/i18n';
import { BrandMark } from './BrandMark';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const t = dictionaries[defaultPreferences().language];
    return (
      <main className="load-screen">
        <BrandMark size={72} />
        <p className="wordmark-text">Kiseki</p>
        <p role="alert">{t.loadError}</p>
        <button className="button primary" onClick={() => location.reload()}>
          {t.retry}
        </button>
      </main>
    );
  }
}
