/**
 * Quran Data Service — riwaya-aware Quran text loader and indexer
 */

import { MUSHAF_PAGE_RECITATIONS, recitationSupportsMushafPages } from '../data/recitations';

const dataCache = new Map();
const OFFLINE_CACHE_NAME = 'quran-riwayat-v1';
const MUSHAF_SVG_BASE = 'https://raw.githubusercontent.com/quran-ws/quran-svg/main/mushafs';
export const MUSHAF_SVG_PAGE_COUNT = 604;

// Riwayas with published Mushaf page artwork (SVG). Plain 'warsh' uses the Moroccan font page and bazzi/soosi are text-only, so none are listed here.
export const SVG_ARTWORK_RECITATIONS = MUSHAF_PAGE_RECITATIONS;
export const hasSvgArtwork = recitationSupportsMushafPages;

const RECITATION_DATA = {
  warsh: { folder: 'warsh', file: 'warshData_v10.json', fontUrl: '/fonts/aal-maghribi.woff2', family: 'AalMaghribi' },
  'warsh-normal': { folder: 'warsh', file: 'warshData_v10.json', fontUrl: '/fonts/amiri-regular.woff2', family: 'Amiri' },
  hafs: { folder: 'hafs', file: 'hafsData_v18.json', font: 'hafs.18.woff2', family: 'hafs18' },
  qalon: { folder: 'qaloon', file: 'QaloonData_v10.json', font: 'qaloon.10.woff2', family: 'qaloon10' },
  douri: { folder: 'doori', file: 'DooriData_v09.json', font: 'doori.9.woff2', family: 'doori9' },
  shubah: { folder: 'shouba', file: 'ShoubaData08.json', font: 'shouba.8.woff2', family: 'shouba8' },
  bazzi: { folder: 'bazzi', file: 'BazziData_v07.json', fontUrl: '/fonts/bazzi-7.woff2', family: 'bazzi7' },
  soosi: { folder: 'soosi', file: 'SoosiData09.json', fontUrl: '/fonts/soosi-9.woff2', family: 'soosi9' },
};

function getDataUrl(recitation) {
  if (recitation === 'warsh' || recitation === 'warsh-normal') return '/data/warshData.json';
  const { folder, file } = RECITATION_DATA[recitation];
  return `https://cdn.jsdelivr.net/gh/thetruetruth/quran-data-kfgqpc@main/${folder}/data/${file}`;
}

function getFontUrl(recitation) {
  const { folder, font, fontUrl } = RECITATION_DATA[recitation];
  if (fontUrl) return fontUrl;
  return `https://cdn.jsdelivr.net/gh/thetruetruth/quran-data-kfgqpc@main/${folder}/font/${font}`;
}

export function mushafSvgUrl(pageNumber, recitation = 'hafs') {
  const page = String(pageNumber).padStart(3, '0');
  const pageRecitation = recitation === 'warsh-normal' ? 'warsh' : recitation;
  return `${MUSHAF_SVG_BASE}/${pageRecitation}/kfqc/svg/${page}.svg`;
}

async function readResponseBlob(response, onProgress, progressStart = 0, progressEnd = 100) {
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body?.getReader) {
    const blob = await response.blob();
    onProgress?.({ percent: progressEnd, loaded: blob.size, total: blob.size });
    return blob;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  onProgress?.({ percent: progressStart, loaded, total });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const percent = total > 0
      ? progressStart + Math.min(1, loaded / total) * (progressEnd - progressStart)
      : null;
    onProgress?.({ percent, loaded, total });
  }
  return new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
}

async function getOfflineCache() {
  if (typeof globalThis.caches === 'undefined') return null;
  return globalThis.caches.open(OFFLINE_CACHE_NAME);
}

export async function getOfflineRecitationStatus() {
  const cache = await getOfflineCache();
  const status = {};
  if (!cache) return status;
  await Promise.all(Object.keys(RECITATION_DATA).map(async (recitation) => {
    const wantsSvg = hasSvgArtwork(recitation);
    const [data, font] = await Promise.all([
      cache.match(getDataUrl(recitation)),
      cache.match(getFontUrl(recitation)),
    ]);
    let svg = null;
    let svgCount = null;
    if (wantsSvg) {
      const svgMatches = await Promise.all(
        Array.from({ length: MUSHAF_SVG_PAGE_COUNT }, (_, index) => cache.match(mushafSvgUrl(index + 1, recitation))),
      );
      svgCount = svgMatches.filter(Boolean).length;
      svg = svgCount === MUSHAF_SVG_PAGE_COUNT;
    }
    status[recitation] = {
      data: Boolean(data),
      font: Boolean(font),
      svg,
      svgCount,
      ready: Boolean(data && font) && (!wantsSvg || svg),
    };
  }));
  return status;
}

export async function downloadQuranRecitation(recitation, onProgress) {
  const selected = RECITATION_DATA[recitation] ? recitation : 'warsh';
  const cache = await getOfflineCache();
  if (!cache) throw new Error('التخزين المحلي غير متاح في هذا المتصفح.');
  const urls = [getDataUrl(selected), getFontUrl(selected)];
  const existing = await Promise.all(urls.map((url) => cache.match(url)));
  const wantsSvg = hasSvgArtwork(selected);
  if (existing.every(Boolean)) {
    if (!wantsSvg) {
      onProgress?.({ percent: 100, phase: 'complete' });
      return { recitation: selected, cached: true };
    }
    const svgUrls = Array.from({ length: MUSHAF_SVG_PAGE_COUNT }, (_, index) => mushafSvgUrl(index + 1, selected));
    const cachedSvg = await Promise.all(svgUrls.map((url) => cache.match(url)));
    if (cachedSvg.every(Boolean)) {
      onProgress?.({ percent: 100, phase: 'complete' });
      return { recitation: selected, cached: true };
    }
  }

  if (!existing[0]) {
    const response = await fetch(urls[0]);
    if (!response.ok) throw new Error(`تعذر تنزيل نص الرواية (HTTP ${response.status}).`);
    const blob = await readResponseBlob(response, (progress) => onProgress?.({ ...progress, phase: 'text' }), 0, 60);
    const rows = JSON.parse(await blob.text());
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('ملف نص الرواية فارغ أو غير صالح.');
    await cache.put(urls[0], new Response(blob, { headers: { 'Content-Type': 'application/json' } }));
  }

  if (!existing[1]) {
    onProgress?.({ percent: existing[0] ? 0 : 60, phase: 'font' });
    const response = await fetch(urls[1]);
    if (!response.ok) throw new Error(`تعذر تنزيل خط الرواية (HTTP ${response.status}).`);
    const blob = await readResponseBlob(response, (progress) => onProgress?.({ ...progress, phase: 'font' }), existing[0] ? 0 : 60, 70);
    await cache.put(urls[1], new Response(blob, { headers: { 'Content-Type': 'font/woff2' } }));
  }

  if (wantsSvg) {
    const svgUrls = Array.from({ length: MUSHAF_SVG_PAGE_COUNT }, (_, index) => mushafSvgUrl(index + 1, selected));
    const cachedSvg = await Promise.all(svgUrls.map((url) => cache.match(url)));
    const total = svgUrls.length;
    let done = cachedSvg.filter(Boolean).length;
    const svgPhaseStart = existing[1] ? 0 : 70;
    const svgPhaseSpan = existing[1] ? 100 : 30;
    const pending = [];
    for (let index = 0; index < total; index += 1) {
      if (!cachedSvg[index]) pending.push(index);
    }
    if (pending.length) {
      const CONCURRENCY = 6;
      const worker = async () => {
        while (pending.length) {
          const index = pending.shift();
          if (index === undefined) return;
          const response = await fetch(svgUrls[index]);
          if (!response.ok) throw new Error(`تعذر تنزيل صفحة المصحف ${index + 1} (HTTP ${response.status}).`);
          const blob = await response.blob();
          await cache.put(svgUrls[index], new Response(blob, { headers: { 'Content-Type': 'image/svg+xml' } }));
          done += 1;
          onProgress?.({ percent: svgPhaseStart + (done / total) * svgPhaseSpan, loaded: done, total, phase: 'mushaf' });
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    } else {
      onProgress?.({ percent: 100, loaded: total, total, phase: 'complete' });
    }
  }

  onProgress?.({ percent: 100, phase: 'complete' });
  return { recitation: selected, cached: false };
}

export async function removeOfflineQuranRecitation(recitation) {
  const selected = RECITATION_DATA[recitation] ? recitation : 'warsh';
  const cache = await getOfflineCache();
  if (!cache) return;
  await cache.delete(getFontUrl(selected));
  if (hasSvgArtwork(selected)) {
    await Promise.all(Array.from({ length: MUSHAF_SVG_PAGE_COUNT }, (_, index) => cache.delete(mushafSvgUrl(index + 1, selected))));
  }
  if (selected === 'warsh' || selected === 'warsh-normal') {
    const otherVariant = selected === 'warsh' ? 'warsh-normal' : 'warsh';
    if (!(await cache.match(getFontUrl(otherVariant)))) await cache.delete(getDataUrl(selected));
    dataCache.delete('warsh');
    dataCache.delete('warsh-normal');
    return;
  }
  await cache.delete(getDataUrl(selected));
  dataCache.delete(selected);
}

export async function loadOfflineRecitationFont(recitation) {
  const selected = RECITATION_DATA[recitation] ? recitation : 'warsh';
  const cache = await getOfflineCache();
  if (!cache || typeof FontFace === 'undefined') return false;
  const cachedFont = await cache.match(getFontUrl(selected));
  if (!cachedFont) return false;
  const objectUrl = URL.createObjectURL(await cachedFont.blob());
  try {
    const fontFace = new FontFace(RECITATION_DATA[selected].family, `url(${objectUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);
    return true;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Split ayah text to separate trailing Eastern Arabic number
function splitAyahText(text) {
  if (!text) return { mainText: '', numText: '' };
  const match = text.match(/[\s\u00A0]*([\u0660-\u0669\u06F0-\u06F90-9]+)$/);
  if (match) {
    return {
      mainText: text.slice(0, match.index),
      numText: match[1],
    };
  }
  return { mainText: text, numText: '' };
}

// Normalize Arabic text for search
export function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Load and index all 6,214 ayahs
 */
export async function loadQuranData(recitation = 'warsh') {
  const selected = RECITATION_DATA[recitation] ? recitation : 'warsh';
  if (dataCache.has(selected)) return dataCache.get(selected);

  try {
    let rows;
    const url = getDataUrl(selected);
    try {
      const cache = await getOfflineCache();
      const cached = await cache?.match(url);
      if (cached) rows = await cached.json();
    } catch (cacheError) {
      console.warn('Could not read the offline Quran cache:', cacheError);
    }
    if (!rows) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load ${selected} text (HTTP ${response.status})`);
      rows = await response.json();
    }
    if (!Array.isArray(rows) || rows.length === 0) throw new Error(`The ${selected} Quran text dataset is empty or invalid`);

    const bySurah = {};
    const byPage = {};

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const sNum = Number(r.sura_no ?? r.sora_no);
      const aNum = Number(r.aya_no);
      // Some KFGQPC editions encode a split-page ayah as a range (e.g. "42–43").
      const pageNum = Number(String(r.page || '').match(/\d+/)?.[0]) || 1;
      const jozzNum = Number(r.jozz) || 1;

      // Index by Surah
      if (!bySurah[sNum]) {
        bySurah[sNum] = {
          number: sNum,
          nameAr: (r.sura_name_ar || r.sora_name_ar || `سورة ${sNum}`).trim(),
          nameEn: (r.sura_name_en || r.sora_name_en || `Surah ${sNum}`).trim(),
          ayahs: [],
        };
      }

      const rawText = r.aya_text || '';
      const { mainText, numText } = splitAyahText(rawText);

      const ayahObj = {
        id: r.id || `${sNum}:${aNum}`,
        surah: sNum,
        ayah: aNum,
        page: pageNum,
        juz: jozzNum,
        rawText,
        mainText: mainText || rawText,
        numText,
        norm: normalizeArabic(mainText || rawText),
      };

      bySurah[sNum].ayahs.push(ayahObj);

      // Index by Page (1 - 604)
      if (!byPage[pageNum]) {
        byPage[pageNum] = {
          page: pageNum,
          juz: jozzNum,
          ayahs: [],
          surahs: new Set(),
        };
      }
      byPage[pageNum].ayahs.push(ayahObj);
      byPage[pageNum].surahs.add(sNum);
    }

    const data = { bySurah, byPage, recitation: selected };
    dataCache.set(selected, data);
    return data;
  } catch (err) {
    console.error(`Failed to load Quran text for ${selected}:`, err);
    throw err;
  }
}

export function getSurah(bySurah, surahNumber) {
  return bySurah?.[surahNumber] || null;
}

export function getPage(byPage, pageNumber) {
  return byPage?.[pageNumber] || null;
}

/**
 * Fast search across all 6,214 Ayahs
 */
export function searchAyahs(query, limit = 50, recitation = 'warsh') {
  const quranData = dataCache.get(RECITATION_DATA[recitation] ? recitation : 'warsh');
  if (!quranData || !query.trim()) return [];
  const q = normalizeArabic(query);
  const results = [];
  for (const surah of Object.values(quranData.bySurah)) {
    for (const ayah of surah.ayahs) {
      if (ayah.norm.includes(q)) {
        results.push({
          id: ayah.id,
          surah: ayah.surah,
          surahName: surah.nameAr,
          ayah: ayah.ayah,
          page: ayah.page,
          juz: ayah.juz,
          text: ayah.rawText,
        });
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}
