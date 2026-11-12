// Optional "focus lock": while active, the reader tries to keep the user inside the app until the chosen goal is done.
// Modes: 'wird' (today's wird of the khatma plan), 'custom' (a saved custom wird), 'countdown' (minutes the user picks or types).
const KEY = 'quranWarsh.focusLock';
const TOTAL_PAGES = 604;

export function getFocusLock() {
  try {
    const lock = JSON.parse(localStorage.getItem(KEY) || 'null');
    return lock && lock.mode ? lock : null;
  } catch { return null; }
}

export function setFocusLock(lock) {
  try { localStorage.setItem(KEY, JSON.stringify(lock)); } catch { /* ignore */ }
  window.dispatchEvent(new Event('focuslock:changed'));
  return lock;
}

export function clearFocusLock() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event('focuslock:changed'));
}

const dayNumberFromKey = (key) => {
  const [y, m, d] = String(key || '').split('-').map(Number);
  return y && m && d ? Math.floor(Date.UTC(y, m - 1, d) / 86400000) : null;
};

// Last page of today's wird for the active khatma plan (same schedule the dashboard shows).
export function getTodayWirdEndPage(khatma) {
  const plans = Array.isArray(khatma?.plans) ? khatma.plans : [];
  const plan = plans.find((p) => p.id === khatma?.activePlanId) || khatma || {};
  const durationDays = Math.max(1, Number(plan.durationDays || khatma?.durationDays) || 30);
  const start = dayNumberFromKey(plan.startDate);
  const now = new Date();
  const today = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const day = start === null ? 1 : Math.max(1, Math.min(durationDays, today - start + 1));
  return Math.floor((day * TOTAL_PAGES) / durationDays);
}

export function getReadPages(khatma) {
  const plans = Array.isArray(khatma?.plans) ? khatma.plans : [];
  const plan = plans.find((p) => p.id === khatma?.activePlanId);
  return Number(plan?.readPages ?? khatma?.readPages) || 0;
}

export function isFocusLockSatisfied(lock, khatma) {
  if (!lock) return true;
  if (lock.mode === 'countdown') return Date.now() >= (lock.endsAt || 0);
  if (lock.mode === 'custom') return false; // cleared by the reader once the custom wird sequence finishes
  return getReadPages(khatma) >= (lock.targetPage || TOTAL_PAGES);
}

// Used by the Android back button / page unload, which have no access to React state.
export function isFocusLockedNow(khatma) {
  const lock = getFocusLock();
  return Boolean(lock) && !isFocusLockSatisfied(lock, khatma);
}
