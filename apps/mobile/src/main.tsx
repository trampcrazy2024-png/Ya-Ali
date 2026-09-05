import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initSecureSettings } from './settings';
import './index.css';

void initSecureSettings().finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
));
