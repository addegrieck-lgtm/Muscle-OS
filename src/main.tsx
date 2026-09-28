import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker (hors-ligne) — uniquement en production pour ne pas gêner le développement.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW non enregistré', e));
  });
}

// Demande de stockage persistant (évite l'éviction des données locales par le navigateur).
navigator.storage?.persist?.().catch(() => undefined);
