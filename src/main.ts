import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './App.ts';
import { SwUpdate } from './swUpdate.ts';

// The page's own fallback (index.html) shows a message if this flag never appears.
(window as unknown as { __scoutBooted?: boolean }).__scoutBooted = true;

// Ask the browser to keep the finds when the device runs short of space.
void navigator.storage?.persist?.();

// The update policy is Field Mapper's (swUpdate.ts): checks are throttled, and a new version takes over only at
// launch, never in the middle of a find.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  SwUpdate.init();
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => SwUpdate.watch(reg))
      .catch(() => { /* no worker: the app still runs, just not offline */ });
  });
}

new App().init().catch(err => {
  console.error(err);
  const w = window as unknown as { __scoutBooted?: boolean; __scoutFail?: (why: string) => void };
  w.__scoutBooted = false;
  w.__scoutFail?.(`the app stopped while starting (${err instanceof Error ? err.message : String(err)}).`);
});
