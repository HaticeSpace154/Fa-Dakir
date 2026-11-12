/**
 * Build freshness check — runs on every web page load.
 *
 * Vercel injects VERCEL_GIT_COMMIT_SHA at build time; local builds fall back to a
 * per-build timestamp embedded by vite.config.js. The client stores the last seen id
 * in localStorage ('quranWarsh.appVersion'). When the id changes — i.e. a new deploy
 * shipped — it drops every CacheStorage bucket that is not the offline Quran bucket,
 * unregisters any service workers, then reloads the page once with a cache-busting
 * query so stale chunks are replaced with the fresh bundle.
 *
 * The offline Quran cache ('quran-riwayat-v1') is deliberately kept — it holds
 * ~250 MB of user-downloaded text/font/Mushaf pages.
 */
const OFFLINE_KEEP = 'quran-riwayat-v1';
const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
const STORED_KEY = 'quranWarsh.appVersion';
const RELOAD_PARAM = '_fresh';

export async function applyAppVersionGate() {
  try {
    const stored = localStorage.getItem(STORED_KEY);
    localStorage.setItem(STORED_KEY, BUILD_ID);
    if (stored === BUILD_ID) return;

    // First-ever visit of this build identity: nothing to invalidate yet.
    if (!stored) return;

    // A fresh deploy — clear stale app-shell caches but keep the offline Quran downloads.
    if (typeof globalThis.caches !== 'undefined') {
      try {
        const keys = await globalThis.caches.keys();
        await Promise.all(keys.filter((key) => key !== OFFLINE_KEEP).map((key) => globalThis.caches.delete(key)));
      } catch { /* ignore — best effort */ }
    }

    // Unregister any stray service worker so its HTTP cache cannot serve stale app assets.
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch { /* ignore */ }
    }

    // Reload once with a cache-busting query param so index.html and the bundle are re-fetched.
    if (typeof window !== 'undefined' && !window.location.search.includes(`${RELOAD_PARAM}=`)) {
      const url = new URL(window.location.href);
      url.searchParams.set(RELOAD_PARAM, BUILD_ID);
      window.location.replace(url.toString());
      return true;
    }
  } catch {
    // localStorage unavailable (private mode / quota) — nothing to gate.
  }
  return false;
}
