import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initSecureSettings } from './settings';
import './index.css';

function syncViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

syncViewportHeight();
window.addEventListener('resize', syncViewportHeight, { passive: true });
window.addEventListener('orientationchange', syncViewportHeight, { passive: true });

void initSecureSettings().finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
));
