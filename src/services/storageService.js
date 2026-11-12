/**
 * Local storage manager for Khatma, bookmarks, and user reading preferences
 */

const STORAGE_KEYS = {
  theme: 'quranWarsh.theme',
  lastSurah: 'quranWarsh.lastSurah',
  lastAyah: 'quranWarsh.lastAyah',
  lastPage: 'quranWarsh.lastPage',
  lastPosition: 'quranWarsh.lastPosition',
  bookmarks: 'quranWarsh.bookmarks',
  khatma: 'quranWarsh.khatma',
  readingStats: 'quranWarsh.readingStats',
  fontSize: 'quranWarsh.fontSize',
  recitation: 'quranWarsh.recitation',
  customWird: 'quranWarsh.customWird',
  autoScrollMinutes: 'quranWarsh.autoScrollMinutes',
};

function normalizeCustomWird(saved, index = 0) {
  if (!saved || typeof saved !== 'object') return null;
  const surahs = Array.isArray(saved.surahs) ? saved.surahs
    .map((entry, entryIndex) => ({ id: String(entry.id || `custom-wird-${index}-${entryIndex}`), surah: Math.max(1, Math.min(114, Math.floor(Number(entry.surah) || 1))), repeats: Math.max(1, Math.min(999, Math.floor(Number(entry.repeats) || 1))) })) : [];
  if (!surahs.length) return null;
  return {
    id: String(saved.id || `custom-wird-${saved.updatedAt || index}`),
    name: String(saved.name || 'وردي المخصص').slice(0, 40),
    surahs,
    updatedAt: saved.updatedAt || '',
  };
}

export function getCustomWirds() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.customWird) || 'null');
    const list = Array.isArray(saved) ? saved : saved ? [saved] : [];
    return list.map(normalizeCustomWird).filter(Boolean);
  } catch { return []; }
}

export function getCustomWird() {
  return getCustomWirds()?.[0] || null;
}

export function saveCustomWird(plan) {
  const surahs = Array.isArray(plan?.surahs) ? plan.surahs
    .map((entry, index) => ({ id: String(entry.id || `custom-wird-${index}`), surah: Math.max(1, Math.min(114, Math.floor(Number(entry.surah) || 1))), repeats: Math.max(1, Math.min(999, Math.floor(Number(entry.repeats) || 1))) })) : [];
  if (!surahs.length) return null;
  const name = String(plan.name || 'وردي المخصص').trim().slice(0, 40) || 'وردي المخصص';
  const current = getCustomWirds() || [];
  const existing = current.find((item) => item.id === plan.id || item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
  const saved = { id: existing?.id || `custom-wird-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, surahs, updatedAt: new Date().toISOString() };
  const next = [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 50);
  try { localStorage.setItem(STORAGE_KEYS.customWird, JSON.stringify(next)); } catch {}
  return saved;
}

export function removeCustomWird(id) {
  if (!id) {
    try { localStorage.removeItem(STORAGE_KEYS.customWird); } catch {}
    return [];
  }
  const next = (getCustomWirds() || []).filter((item) => item.id !== id);
  try { if (next.length) localStorage.setItem(STORAGE_KEYS.customWird, JSON.stringify(next)); else localStorage.removeItem(STORAGE_KEYS.customWird); } catch {}
  return next;
}

export function getLastReadingPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.lastPosition) || 'null');
    if (saved && typeof saved === 'object') {
      return {
        viewMode: saved.viewMode === 'page' ? 'page' : 'surah',
        page: Math.max(1, Math.min(604, Math.floor(Number(saved.page) || 1))),
        surah: Math.max(1, Math.min(114, Math.floor(Number(saved.surah) || 1))),
        ayah: Math.max(1, Math.floor(Number(saved.ayah) || 1)),
        juz: Math.max(1, Math.min(30, Math.floor(Number(saved.juz) || 1))),
        hizb: Math.max(1, Math.min(60, Math.floor(Number(saved.hizb) || 1))),
        recitation: typeof saved.recitation === 'string' ? saved.recitation : 'warsh',
      };
    }
    const oldPage = Math.max(1, Math.min(604, Math.floor(Number(localStorage.getItem(STORAGE_KEYS.lastPage)) || 2)));
    const oldSurah = Math.max(1, Math.min(114, Math.floor(Number(localStorage.getItem(STORAGE_KEYS.lastSurah)) || 2)));
    const oldAyah = Math.max(1, Math.floor(Number(localStorage.getItem(STORAGE_KEYS.lastAyah)) || 1));
    return { viewMode: 'surah', page: oldPage, surah: oldSurah, ayah: oldAyah, juz: 1, hizb: 1, recitation: 'warsh' };
  } catch {
    return { viewMode: 'surah', page: 2, surah: 2, ayah: 1, juz: 1, hizb: 1, recitation: 'warsh' };
  }
}

export function saveLastReadingPosition(position) {
  if (!position || typeof position !== 'object') return;
  const saved = {
    viewMode: position.viewMode === 'page' ? 'page' : 'surah',
    page: Math.max(1, Math.min(604, Math.floor(Number(position.page) || 1))),
    surah: Math.max(1, Math.min(114, Math.floor(Number(position.surah) || 1))),
    ayah: Math.max(1, Math.floor(Number(position.ayah) || 1)),
    juz: Math.max(1, Math.min(30, Math.floor(Number(position.juz) || 1))),
    hizb: Math.max(1, Math.min(60, Math.floor(Number(position.hizb) || 1))),
    recitation: typeof position.recitation === 'string' ? position.recitation : 'warsh',
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEYS.lastPosition, JSON.stringify(saved));
    localStorage.setItem(STORAGE_KEYS.lastPage, String(saved.page));
    localStorage.setItem(STORAGE_KEYS.lastSurah, String(saved.surah));
    localStorage.setItem(STORAGE_KEYS.lastAyah, String(saved.ayah));
  } catch {}
}

export function getReadingStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.readingStats) || '{}');
    const dailySeconds = parsed.dailySeconds && typeof parsed.dailySeconds === 'object' && !Array.isArray(parsed.dailySeconds)
      ? Object.fromEntries(Object.entries(parsed.dailySeconds).map(([day, seconds]) => [day, Math.max(0, Number(seconds) || 0)]))
      : {};
    return {
      totalSeconds: Math.max(0, Number(parsed.totalSeconds) || 0),
      currentSessionSeconds: Math.max(0, Number(parsed.currentSessionSeconds) || 0),
      sessions: Math.max(0, Number(parsed.sessions) || 0),
      activeDays: Array.isArray(parsed.activeDays) ? [...new Set(parsed.activeDays.filter((day) => typeof day === 'string'))] : [],
      dailySeconds,
    };
  } catch {
    return { totalSeconds: 0, currentSessionSeconds: 0, sessions: 0, activeDays: [], dailySeconds: {} };
  }
}

export function startReadingSession() {
  const stats = getReadingStats();
  const next = { ...stats, currentSessionSeconds: 0, sessions: stats.sessions + 1 };
  try { localStorage.setItem(STORAGE_KEYS.readingStats, JSON.stringify(next)); } catch {}
  return next;
}

export function addReadingSeconds(seconds = 1) {
  const stats = getReadingStats();
  const increment = Math.max(0, Math.floor(Number(seconds) || 0));
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const next = {
    ...stats,
    totalSeconds: stats.totalSeconds + increment,
    currentSessionSeconds: stats.currentSessionSeconds + increment,
    activeDays: increment > 0 ? [...new Set([...stats.activeDays, today])] : stats.activeDays,
    dailySeconds: {
      ...stats.dailySeconds,
      ...(increment > 0 ? { [today]: (stats.dailySeconds[today] || 0) + increment } : {}),
    },
  };
  try { localStorage.setItem(STORAGE_KEYS.readingStats, JSON.stringify(next)); } catch {}
  return next;
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  } catch {
    return 'light';
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {}
}

// Last duration (in minutes) chosen for the timed auto-scroll.
export function getStoredAutoScrollMinutes() {
  try {
    const saved = Math.round(Number(localStorage.getItem(STORAGE_KEYS.autoScrollMinutes)));
    return Number.isFinite(saved) && saved >= 1 && saved <= 180 ? saved : 30;
  } catch { return 30; }
}

export function setStoredAutoScrollMinutes(minutes) {
  const value = Math.max(1, Math.min(180, Math.round(Number(minutes) || 30)));
  try { localStorage.setItem(STORAGE_KEYS.autoScrollMinutes, String(value)); } catch {}
  return value;
}

export function getStoredFontSize() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEYS.fontSize));
    return Number.isFinite(saved) && saved >= 16 && saved <= 48 ? Math.round(saved) : 22;
  } catch { return 22; }
}

export function setStoredFontSize(fontSize) {
  const value = Math.max(16, Math.min(48, Math.round(Number(fontSize) || 22)));
  try { localStorage.setItem(STORAGE_KEYS.fontSize, String(value)); } catch {}
  return value;
}

export function getBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bookmarks);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((bookmark) => bookmark && typeof bookmark === 'object');
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).filter((bookmark) => bookmark && typeof bookmark === 'object');
    }
    return [];
  } catch {
    return [];
  }
}

export function saveBookmark(surah, ayah, text = '', recitation = 'warsh') {
  try {
    const list = getBookmarks();
    const exists = list.some((b) => b.type !== 'mushaf-page' && Number(b.surah) === Number(surah) && Number(b.ayah) === Number(ayah) && (b.recitation || 'warsh') === recitation);
    const next = exists
      ? list.filter((b) => !(b.type !== 'mushaf-page' && Number(b.surah) === Number(surah) && Number(b.ayah) === Number(ayah) && (b.recitation || 'warsh') === recitation))
      : [{
        surah,
        ayah,
        recitation,
        text: text.slice(0, 60),
        date: new Date().toLocaleDateString('ar-EG'),
      }, ...list];
    localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function getStoredRecitation() {
  try {
    const supported = ['warsh', 'warsh-normal', 'hafs', 'qalon', 'douri', 'shubah', 'bazzi', 'soosi'];
    const stored = localStorage.getItem(STORAGE_KEYS.recitation);
    return supported.includes(stored) ? stored : 'warsh';
  } catch { return 'warsh'; }
}

export function setStoredRecitation(recitation) {
  const supported = ['warsh', 'warsh-normal', 'hafs', 'qalon', 'douri', 'shubah', 'bazzi', 'soosi'];
  if (!supported.includes(recitation)) return;
  try { localStorage.setItem(STORAGE_KEYS.recitation, recitation); } catch {}
}

export function saveMushafPageBookmark(page, recitation = 'warsh') {
  try {
    const list = getBookmarks();
    const exists = list.some((bookmark) => bookmark.type === 'mushaf-page' && Number(bookmark.page) === Number(page) && (bookmark.recitation || 'warsh') === recitation);
    const next = exists
      ? list.filter((bookmark) => !(bookmark.type === 'mushaf-page' && Number(bookmark.page) === Number(page) && (bookmark.recitation || 'warsh') === recitation))
      : [{
        type: 'mushaf-page',
        page: Number(page),
        recitation,
        title: `صفحة المصحف ${page}`,
        date: new Date().toLocaleDateString('ar-EG'),
      }, ...list];
    localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function removeBookmark(surah, ayah, recitation = 'warsh') {
  try {
    const list = getBookmarks().filter((bookmark) => {
      if (surah && typeof surah === 'object') {
        return bookmark.type === 'mushaf-page'
          ? !(bookmark.type === surah.type && Number(bookmark.page) === Number(surah.page) && (bookmark.recitation || 'warsh') === (surah.recitation || 'warsh'))
          : !(Number(bookmark.surah) === Number(surah.surah) && Number(bookmark.ayah) === Number(surah.ayah) && (bookmark.recitation || 'warsh') === (surah.recitation || 'warsh'));
      }
      return !(Number(bookmark.surah) === Number(surah) && Number(bookmark.ayah) === Number(ayah) && (bookmark.recitation || 'warsh') === recitation);
    });
    localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

function toLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return toLocalDateKey(new Date());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Plans saved before start dates existed get one inferred from when they were
// created/last edited, so the daily schedule can be anchored to a real day.
function withPlanStartDates(khatma) {
  if (!khatma || !Array.isArray(khatma.plans)) return { data: khatma, changed: false };
  let changed = false;
  const plans = khatma.plans.map((plan) => {
    if (plan?.startDate) return plan;
    changed = true;
    return { ...plan, startDate: toLocalDateKey(plan?.createdAt || plan?.updatedAt || new Date()) };
  });
  if (!changed) return { data: khatma, changed: false };
  const active = plans.find((plan) => plan.id === khatma.activePlanId);
  return { data: { ...khatma, plans, ...(active ? { startDate: active.startDate } : {}) }, changed: true };
}

export function getKhatmaProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.khatma);
    if (!raw) return { readPages: 14, durationDays: 30 };
    const { data, changed } = withPlanStartDates(JSON.parse(raw));
    if (changed) { try { localStorage.setItem(STORAGE_KEYS.khatma, JSON.stringify(data)); } catch {} }
    return data;
  } catch {
    return { readPages: 14, durationDays: 30 };
  }
}

export function updateKhatmaPage(page) {
  try {
    const k = getKhatmaProgress();
    const nextPage = Math.max(k.readPages || 1, page);
    k.readPages = nextPage;
    if (Array.isArray(k.plans) && k.activePlanId) {
      k.plans = k.plans.map((plan) => plan.id === k.activePlanId
        ? { ...plan, readPages: Math.max(plan.readPages || 1, page) }
        : plan);
    }
    localStorage.setItem(STORAGE_KEYS.khatma, JSON.stringify(k));
    return k;
  } catch {
    return { readPages: page, durationDays: 30 };
  }
}

export function updateKhatmaPlan(plan) {
  try {
    const current = getKhatmaProgress();
    const plans = Array.isArray(current.plans) ? current.plans : [];
    const id = plan.id || `khatma-${Date.now()}`;
    const existing = plans.find((item) => item.id === id);
    const savedPlan = {
      id,
      name: (plan.name || existing?.name || `ختمة ${plans.length + 1}`).trim(),
      unit: plan.unit,
      durationDays: plan.durationDays,
      readPages: existing ? (existing.readPages ?? 0) : 0,
      // The schedule is anchored to the day the plan was created; editing the
      // plan's name/unit/duration must not restart it.
      startDate: existing?.startDate || toLocalDateKey(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextPlans = existing
      ? plans.map((item) => item.id === id ? savedPlan : item)
      : [...plans, savedPlan];
    const next = { ...current, ...savedPlan, plans: nextPlans, activePlanId: id };
    localStorage.setItem(STORAGE_KEYS.khatma, JSON.stringify(next));
    return next;
  } catch {
    return { ...getKhatmaProgress(), ...plan };
  }
}

export function selectKhatmaPlan(id) {
  try {
    const current = getKhatmaProgress();
    const selected = current.plans?.find((plan) => plan.id === id);
    if (!selected) return current;
    const next = { ...current, ...selected, activePlanId: id };
    localStorage.setItem(STORAGE_KEYS.khatma, JSON.stringify(next));
    return next;
  } catch {
    return getKhatmaProgress();
  }
}

export function removeKhatmaPlan(id) {
  try {
    const current = getKhatmaProgress();
    const plans = (current.plans || []).filter((plan) => plan.id !== id);
    const active = plans.find((plan) => plan.id === current.activePlanId) || plans[0];
    const next = active
      ? { ...current, ...active, plans, activePlanId: active.id }
      : { ...current, plans, activePlanId: null, unit: 'juz', durationDays: 30 };
    localStorage.setItem(STORAGE_KEYS.khatma, JSON.stringify(next));
    return next;
  } catch {
    return getKhatmaProgress();
  }
}
