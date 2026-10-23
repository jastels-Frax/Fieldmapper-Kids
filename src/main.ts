import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './App.ts';

// Ask the browser to keep the finds when the device runs short of space.
void navigator.storage?.persist?.();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    // A new version only takes over at launch, never in the middle of a find.
    const launchedAt = Date.now();
    const activate = (w: ServiceWorker | null) => {
      if (w && Date.now() - launchedAt < 8000) w.postMessage({ type: 'SKIP_WAITING' });
    };
    activate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) activate(w); });
    });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || Date.now() - launchedAt > 10000) return;
      reloaded = true;
      location.reload();
    });
  });
}

void new App().init();
