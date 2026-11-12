import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SURAHS } from '../../data/quranMetadata';
import { mushafSvgUrl } from '../../services/quranData';
import './MushafSvgPage.css';

export { mushafSvgUrl };

const RECITATION_LABELS = { warsh: 'ورش عن نافع', 'warsh-normal': 'ورش عن نافع', hafs: 'حفص عن عاصم', qalon: 'قالون عن نافع', douri: 'الدوري عن أبي عمرو', shubah: 'شعبة عن عاصم', bazzi: 'البزي عن ابن كثير', soosi: 'السوسي عن أبي عمرو' };
const PAGE_ART_RECITATIONS = new Set(['warsh', 'warsh-normal', 'hafs', 'qalon', 'douri', 'shubah']);

export default function MushafSvgPage({ pageNumber, recitation = 'warsh', fallback, ayahs = [], onPreviousPage, onNextPage }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [svgSrc, setSvgSrc] = useState('');
  const objectUrlRef = useRef(null);
  const pointerStartRef = useRef(null);
  const fontPageRef = useRef(null);
  const fontPageContentRef = useRef(null);
  const pageSurahNumbers = new Set(ayahs.map((ayah) => Number(ayah.surah)));
  const isOpeningPage = ayahs.length > 0 && ayahs.every((ayah) =>
    Number(ayah.surah) === 1 || (Number(ayah.surah) === 2 && Number(ayah.ayah) <= 7));
  const shouldFillPage = pageSurahNumbers.size > 1
    || ayahs.some((ayah) => (SURAHS[Number(ayah.surah) - 1]?.ayahs || 0) >= 100);

  useEffect(() => {
    setFailed(false);
    setLoading(true);
    setSvgSrc('');
    const url = mushafSvgUrl(pageNumber, recitation);
    let cancelled = false;
    let objectUrl = null;
    (async () => {
      if (typeof globalThis.caches !== 'undefined') {
        try {
          const cached = await globalThis.caches.open('quran-riwayat-v1').then((cache) => cache.match(url));
          if (cached && !cancelled) {
            objectUrl = URL.createObjectURL(await cached.blob());
            objectUrlRef.current = objectUrl;
            setSvgSrc(objectUrl);
            return;
          }
        } catch (cacheError) {
          console.warn('Could not read the offline Mushaf SVG cache:', cacheError);
        }
      }
      if (!cancelled) setSvgSrc(url);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
    };
  }, [pageNumber, recitation, retryKey]);

  useLayoutEffect(() => {
    if (recitation !== 'warsh' && PAGE_ART_RECITATIONS.has(recitation)) return undefined;
    if (!shouldFillPage || isOpeningPage) return undefined;
    const page = fontPageRef.current;
    const content = fontPageContentRef.current;
    if (!page || !content) return undefined;

    const fitPageText = () => {
      const lastAyah = content.lastElementChild;
      if (!lastAyah) return;
      const textHeight = lastAyah.getBoundingClientRect().bottom - content.getBoundingClientRect().top;
      const availableHeight = page.clientHeight - 24;
      if (!textHeight || !availableHeight) return;
      const fitRatio = (availableHeight * 0.94) / textHeight;
      setFontScale((current) => {
        const next = Math.max(0.65, Math.min(1.45, current * fitRatio));
        return Math.abs(next - current) < 0.015 ? current : next;
      });
    };

    fitPageText();
    const observer = new ResizeObserver(fitPageText);
    observer.observe(page);
    observer.observe(content);
    document.fonts?.ready.then(fitPageText);
    return () => observer.disconnect();
  }, [pageNumber, recitation, shouldFillPage, isOpeningPage, fontScale]);

  const handlePointerDown = (event) => {
    if (event.isPrimary === false) return;
    if (event.target.closest('button, a, input, textarea, select')) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 32 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    if (deltaX > 0) onNextPage?.();
    else onPreviousPage?.();
  };

  // Keep the same right-advance / left-back gesture on every Mushaf renderer.
  const mushafSwipeHandlers = {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: () => { pointerStartRef.current = null; },
  };

  // The published Warsh SVG pages are path artwork, so their letterforms are
  // baked into vector outlines and cannot inherit a web font. Render the page
  // text with the local Moroccan font instead for the Moroccan Warsh option.
  if (recitation === 'warsh' || !PAGE_ART_RECITATIONS.has(recitation)) {
    return (
      <section
        className={`mushaf-svg-page mushaf-font-page ${recitation}`}
        ref={fontPageRef}
        aria-label={`صفحة ${pageNumber} برواية ${RECITATION_LABELS[recitation] || RECITATION_LABELS.warsh}`}
        dir="rtl"
        {...mushafSwipeHandlers}
      >
        <div className={`mushaf-font-page-content ${recitation}`} ref={fontPageContentRef} style={{ '--mushaf-font-scale': fontScale }}>
          {fallback}
        </div>
      </section>
    );
  }

  return (
    <section
      className="mushaf-svg-page"
      aria-label={`صفحة المصحف ${pageNumber}. اسحب يمينًا أو يسارًا للتنقل بين الصفحات`}
      dir="rtl"
      {...mushafSwipeHandlers}
    >
      {!failed ? (
        <>
          {loading && <div className="mushaf-svg-loading" role="status">جارٍ تحميل صفحة المصحف…</div>}
          {svgSrc && (
            <img
              key={`${pageNumber}-${retryKey}`}
              className={`mushaf-svg-artwork ${loading ? 'is-loading' : ''}`}
              src={svgSrc}
              alt={`صفحة ${pageNumber} من مصحف المدينة برواية ${RECITATION_LABELS[recitation] || RECITATION_LABELS.warsh}`}
              draggable="false"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setFailed(true); }}
            />
          )}
        </>
      ) : (
        <div className="mushaf-svg-fallback">
          <p>تعذر تحميل صفحة المصحف. يمكنك متابعة القراءة بالنص المتاح دون اتصال.</p>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)}>إعادة تحميل الصفحة</button>
          <div className="mushaf-svg-fallback-text">{fallback}</div>
        </div>
      )}
    </section>
  );
}
