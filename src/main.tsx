import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts (same-origin woff2, weight axis 200–900).
// Previously loaded from fonts.googleapis.com, which blocked first paint on a
// third-party round trip and shipped one static file per weight.
import '@fontsource-variable/beiruti';
import '@fontsource-variable/cinzel';
import App from './App.tsx';
import './index.css';

/**
 * Pause infinite CSS animations (marquee, promo shimmer) while the tab is in
 * the background. Browsers already throttle rAF, but compositor animations
 * keep ticking; this is the one-line version of "stop burning battery".
 */
const syncVisibility = () => {
  document.body.classList.toggle('is-hidden', document.hidden);
};
document.addEventListener('visibilitychange', syncVisibility);
syncVisibility();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
