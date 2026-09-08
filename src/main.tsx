import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/eb-garamond/greek-400.css';
import '@fontsource/eb-garamond/greek-400-italic.css';
import '@fontsource/eb-garamond/greek-ext-400.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/greek-400.css';
import '@fontsource/alegreya-sans/greek-500.css';
import '@fontsource/shippori-mincho/japanese-400.css';
import '@fontsource/zen-kaku-gothic-new/japanese-400.css';
import './index.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
