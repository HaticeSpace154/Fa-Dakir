import React, { useState, useEffect, useRef } from 'react';
import { loadQuranData, getSurah, getPage, loadOfflineRecitationFont } from '../../services/quranData';
import SurahHeader from './SurahHeader';
import AyahView from './AyahView';
import MushafSvgPage from './MushafSvgPage';
import ShinyText from '../react-bits/ShinyText';
import SpotlightCard from '../react-bits/SpotlightCard';
import Aurora from '../react-bits/Aurora';
import { toEasternArabic, SURAHS } from '../../data/quranMetadata';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useReaderStore } from '../../stores/readerStore';
import './PureQuranReader.css';

const RECITATION_LABELS = {
  warsh: 'ورش عن نافع',
  'warsh-normal': 'ورش عن نافع بالخط العادي',
  hafs: 'حفص عن عاصم',
  qalon: 'قالون عن نافع',
  douri: 'الدوري عن أبي عمرو',
  shubah: 'شعبة عن عاصم',
  bazzi: 'البزي عن ابن كثير',
  soosi: 'السوسي عن أبي عمرو',
};

const AUTO_SCROLL_SPEEDS = [12, 18, 26, 36, 48, 64];

function CircularReadingProgress({ label, value, percent }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const boundedPercent = Math.min(100, Math.max(0, percent));
  return (
    <div className="mushaf-progress-item" aria-label={`${label} ${value}، إنجاز ${Math.round(boundedPercent)} بالمئة`}>
      <span className="mushaf-progress-circle">
        <svg className="mushaf-progress-ring" viewBox="0 0 32 32" aria-hidden="true">
          <circle className="mushaf-progress-track" cx="16" cy="16" r={radius} />
          <circle className="mushaf-progress-value" cx="16" cy="16" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - boundedPercent / 100)} />
        </svg>
        <span className="mushaf-progress-percent">{Math.round(boundedPercent)}%</span>
      </span>
      <span className="mushaf-progress-label">{label} {value}</span>
    </div>
  );
}

function PageProgressFooter({ pageNumber }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, (pageNumber / 604) * 100));
  return (
    <div className="mushaf-page-footer" dir="rtl" role="img" aria-label={`صفحة ${pageNumber}، التقدم ${Math.round(percent)} بالمئة`}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle className="page-footer-track" cx="16" cy="16" r={radius} />
        <circle className="page-footer-progress" cx="16" cy="16" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} />
      </svg>
      <span>{toEasternArabic(pageNumber)}</span>
    </div>
  );
}

function MushafProgress({ pageNumber, juzNumber, pagesByNumber }) {
  const pages = Object.values(pagesByNumber || {}).sort((left, right) => left.page - right.page);
  const startPage = pages.find((page) => page.juz === juzNumber)?.page || pageNumber;
  const nextJuzPage = pages.find((page) => page.juz === juzNumber + 1)?.page || 605;
  const endPage = Math.max(startPage, nextJuzPage - 1);
  const juzLength = endPage - startPage + 1;
  const juzPercent = ((pageNumber - startPage + 1) / juzLength) * 100;
  const splitPage = startPage + Math.ceil(juzLength / 2);
  const hizbNumber = (juzNumber - 1) * 2 + (pageNumber >= splitPage ? 2 : 1);
  const hizbStart = hizbNumber % 2 === 1 ? startPage : splitPage;
  const hizbEnd = hizbNumber % 2 === 1 ? splitPage - 1 : endPage;
  const hizbPercent = ((pageNumber - hizbStart + 1) / Math.max(1, hizbEnd - hizbStart + 1)) * 100;
  return (
    <div className="mushaf-progress-trackers" role="group" aria-label="تقدم القراءة في المصحف">
      <CircularReadingProgress label="الجزء" value={toEasternArabic(juzNumber)} percent={juzPercent} />
      <CircularReadingProgress label="الحزب" value={toEasternArabic(hizbNumber)} percent={hizbPercent} />
    </div>
  );
}

/**
 * PureQuranReader — 100% Native React Quran Reader
 * Renders Warsh Quran text and reader navigation entirely with native React components.
 */
export default function PureQuranReader({
  currentSurahNumber = 1,
  onSurahChange,
  targetAyah = null,
  onTargetAyahHandled,
  targetPage = null,
  onTargetPageHandled,
  onPageChange,
  onBookmarkAyah,
  bookmarks = [],
  onProgressUpdate,
  onPositionUpdate,
  onScrollFinished,
  autoScrollSpeed = 0,
  isAutoScrolling = false,
  recitation = 'warsh',
  readingSequenceStep = 0,
  onToggleAutoScroll
}) {
  const isZenMode = useReaderStore((state) => state.isZenMode);
  const fontSize = useReaderStore((state) => state.fontSize);
  const viewMode = useReaderStore((state) => state.viewMode);
  const bookmarkList = Array.isArray(bookmarks) ? bookmarks : [];
  const [quranData, setQuranData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [readingProgress, setReadingProgress] = useState(0);
  const readerScrollRef = useRef(null);
  const lastProgressRef = useRef(-1);
  const autoScrollClickRef = useRef(null);
  const completionPromptedRef = useRef(null);
  const scrollIdleRef = useRef(null);
  const positionSaveTimerRef = useRef(null);
  const swipeStartRef = useRef(null);
  const swipeLockRef = useRef(false);
  const swipeLockTimerRef = useRef(null);
  const suppressAyahClickUntilRef = useRef(0);

  // Load text and page metadata for the selected riwaya.
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError('');
    loadQuranData(recitation)
      .then((data) => {
        if (mounted) {
          setQuranData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(`Error loading Quran data for ${recitation}:`, err);
        if (mounted) {
          setLoadError(err.message || 'تعذر تحميل نص الرواية المختارة');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [recitation]);

  useEffect(() => {
    loadOfflineRecitationFont(recitation).catch((error) => {
      console.warn(`Could not load the cached font for ${recitation}:`, error);
    });
  }, [recitation]);

  const currentSurah = quranData ? getSurah(quranData.bySurah, currentSurahNumber) : null;
  const currentPage = quranData ? getPage(quranData.byPage, pageNumber) : null;
  const surahMeta = SURAHS.find((s) => s.id === currentSurahNumber) || SURAHS[0];
  const visibleAyahs = viewMode === 'page' ? (currentPage?.ayahs || []) : (currentSurah?.ayahs || []);
  const pageSurahNames = [...new Set((currentPage?.ayahs || []).map((ayah) => SURAHS[ayah.surah - 1]?.name).filter(Boolean))];

  // Map the current text scroll position to the page span of the selected surah.
  const handleScroll = () => {
    if (!readerScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = readerScrollRef.current;
    const maxScroll = Math.max(1, scrollHeight - clientHeight);
    const scrollRatio = Math.min(1, Math.max(0, scrollTop / maxScroll));
    if (viewMode === 'surah') setReadingProgress(Math.round(scrollRatio * 100));
    const surahPages = currentSurah?.ayahs || [];
    const firstSurahPage = surahPages[0]?.page || surahMeta.page || 1;
    const lastSurahPage = surahPages[surahPages.length - 1]?.page || firstSurahPage;
    const estimatedPage = viewMode === 'page'
      ? pageNumber + scrollRatio
      : firstSurahPage - 1 + scrollRatio * (lastSurahPage - firstSurahPage + 1);
    const progress = (estimatedPage / 604) * 100;
    const pct = Math.min(100, Math.max(0, Math.round(progress)));
    if (onProgressUpdate && lastProgressRef.current !== pct) {
      lastProgressRef.current = pct;
      onProgressUpdate(pct, estimatedPage);
    }

    if (onPositionUpdate) {
      if (positionSaveTimerRef.current) clearTimeout(positionSaveTimerRef.current);
      const roundedPage = Math.max(1, Math.min(604, Math.round(estimatedPage)));
      const pageRows = Object.values(quranData?.byPage || {}).sort((left, right) => left.page - right.page);
      const juz = pageRows.find((row) => row.page === roundedPage)?.juz || 1;
      const juzStart = pageRows.find((row) => row.juz === juz)?.page || roundedPage;
      const nextJuzStart = pageRows.find((row) => row.juz === juz + 1)?.page || 605;
      const juzEnd = Math.max(juzStart, nextJuzStart - 1);
      const hizbSplit = juzStart + Math.ceil((juzEnd - juzStart + 1) / 2);
      const hizb = (juz - 1) * 2 + (roundedPage >= hizbSplit ? 2 : 1);
      let savedSurah = currentSurahNumber;
      let savedAyah = 1;
      if (viewMode === 'surah') {
        const containerRect = readerScrollRef.current.getBoundingClientRect();
        const firstVisibleAyah = [...readerScrollRef.current.querySelectorAll('.ayah-span[id^="ayah-"]')]
          .find((node) => node.getBoundingClientRect().bottom > containerRect.top + 48);
        const match = firstVisibleAyah?.id.match(/^ayah-(\d+)-(\d+)$/);
        if (match) {
          savedSurah = Number(match[1]);
          savedAyah = Number(match[2]);
        }
      }
      const savedPosition = { viewMode, page: roundedPage, surah: savedSurah, ayah: savedAyah, juz, hizb, recitation };
      positionSaveTimerRef.current = setTimeout(() => onPositionUpdate(savedPosition), 320);
    }

    if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
    scrollIdleRef.current = setTimeout(() => {
      const node = readerScrollRef.current;
      if (!node || viewMode !== 'surah' || !surahPages.length || node.scrollTop < 8) return;
      const reachedEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 12;
      if (reachedEnd && completionPromptedRef.current !== currentSurahNumber) {
        completionPromptedRef.current = currentSurahNumber;
        onScrollFinished?.({
          surahNumber: currentSurahNumber,
          surahName: surahMeta.name,
          startPage: firstSurahPage,
          endPage: lastSurahPage,
        });
      } else if (!reachedEnd && completionPromptedRef.current === currentSurahNumber) {
        completionPromptedRef.current = null;
      }
    }, 450);
  };

  const handleAutoScrollDoubleClick = () => {
    if (viewMode === 'page') return;
    if (autoScrollClickRef.current) clearTimeout(autoScrollClickRef.current);
    onToggleAutoScroll?.();
  };

  const handleReaderPointerDown = (event) => {
    if (viewMode !== 'surah' || event.isPrimary === false) return;
    if (event.target.closest('button, a, input, textarea, select')) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  };

  const handleReaderPointerUp = (event) => {
    if (viewMode !== 'surah') return;
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || (start.pointerId != null && event.pointerId !== start.pointerId) || swipeLockRef.current) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 32 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    const nextSurah = deltaX < 0 ? currentSurahNumber - 1 : currentSurahNumber + 1;
    if (nextSurah < 1 || nextSurah > 114) return;
    suppressAyahClickUntilRef.current = Date.now() + 500;
    swipeLockRef.current = true;
    if (swipeLockTimerRef.current) clearTimeout(swipeLockTimerRef.current);
    swipeLockTimerRef.current = setTimeout(() => { swipeLockRef.current = false; }, 420);
    onSurahChange?.(nextSurah);
  };

  const navigateReaderStep = (direction) => {
    if (viewMode === 'page') {
      setPageNumber((page) => Math.max(1, Math.min(604, page + direction)));
      return;
    }
    onSurahChange?.(Math.max(1, Math.min(114, currentSurahNumber + direction)));
  };

  const navigateMushafChevron = (side) => {
    // Mushaf navigation follows Arabic reading direction: left advances,
    // right returns to the previous page.
    setPageNumber((page) => Math.max(1, Math.min(604, page + (side === 'left' ? 1 : -1))));
  };

  useEffect(() => {
    if (viewMode === 'surah' && currentSurah?.ayahs?.length) setPageNumber(currentSurah.ayahs[0].page || surahMeta.page || 1);
  }, [currentSurahNumber, currentSurah, surahMeta.page, viewMode]);

  useEffect(() => {
    completionPromptedRef.current = null;
  }, [currentSurahNumber, viewMode, readingSequenceStep]);

  useEffect(() => () => {
    if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
    if (positionSaveTimerRef.current) clearTimeout(positionSaveTimerRef.current);
    if (swipeLockTimerRef.current) clearTimeout(swipeLockTimerRef.current);
  }, []);

  useEffect(() => {
    onPageChange?.(pageNumber);
    if (viewMode === 'page') {
      onProgressUpdate?.(Math.round((pageNumber / 604) * 100), pageNumber);
      const pageRows = Object.values(quranData?.byPage || {}).sort((left, right) => left.page - right.page);
      const juz = pageRows.find((row) => row.page === pageNumber)?.juz || 1;
      const juzStart = pageRows.find((row) => row.juz === juz)?.page || pageNumber;
      const nextJuzStart = pageRows.find((row) => row.juz === juz + 1)?.page || 605;
      const juzEnd = Math.max(juzStart, nextJuzStart - 1);
      const hizbSplit = juzStart + Math.ceil((juzEnd - juzStart + 1) / 2);
      const hizb = (juz - 1) * 2 + (pageNumber >= hizbSplit ? 2 : 1);
      const firstAyah = quranData?.byPage?.[pageNumber]?.ayahs?.[0];
      onPositionUpdate?.({ viewMode, page: pageNumber, surah: firstAyah?.surah || currentSurahNumber, ayah: firstAyah?.ayah || 1, juz, hizb, recitation });
    }
  }, [pageNumber, viewMode, onPageChange, onPositionUpdate, onProgressUpdate, quranData, currentSurahNumber, recitation]);

  useEffect(() => {
    if (viewMode !== 'page' || !targetPage) return;
    setPageNumber(Math.max(1, Math.min(604, targetPage)));
    onTargetPageHandled?.();
  }, [targetPage, viewMode, onTargetPageHandled]);

  useEffect(() => {
    if (!targetAyah || targetAyah.surah !== currentSurahNumber || !currentSurah?.ayahs?.length) return undefined;
    const target = currentSurah.ayahs.find((ayah) => ayah.ayah === targetAyah.ayah);
    if (!target) return undefined;
    if (viewMode === 'page' && target.page !== pageNumber) {
      setPageNumber(target.page);
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      if (viewMode === 'page') readerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      else document.getElementById(`ayah-${target.surah}-${target.ayah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onTargetAyahHandled?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [targetAyah, currentSurahNumber, currentSurah, viewMode, pageNumber, onTargetAyahHandled]);

  useEffect(() => {
    if (!isAutoScrolling || viewMode === 'page') return undefined;
    let frame = 0;
    let previousFrameTime = 0;
    const pixelsPerSecond = AUTO_SCROLL_SPEEDS[Math.max(0, Math.min(AUTO_SCROLL_SPEEDS.length - 1, autoScrollSpeed))];
    const advance = (now) => {
      const node = readerScrollRef.current;
      if (!node) { frame = requestAnimationFrame(advance); return; }
      const elapsed = previousFrameTime ? Math.min(48, now - previousFrameTime) : 16;
      previousFrameTime = now;
      if (node.scrollTop + node.clientHeight >= node.scrollHeight - 2) {
        onToggleAutoScroll?.();
        return;
      }
      node.scrollTop += (pixelsPerSecond * elapsed) / 1000;
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [isAutoScrolling, autoScrollSpeed, viewMode, pageNumber]);

  // Keep each selected page at its top; continuous Mushaf scrolling advances page by page.
  useEffect(() => {
    if (readerScrollRef.current) readerScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSurahNumber, pageNumber, viewMode]);

  useEffect(() => {
    if (isAutoScrolling) onToggleAutoScroll?.();
  }, [currentSurahNumber, viewMode]);

  const manuscriptContent = (
    <>
      {viewMode === 'surah' ? <SurahHeader surah={{ ...currentSurah, ...surahMeta }} /> : (
        <div className="mushaf-page-heading" dir="rtl">
          <span className="mushaf-page-surah-name">{pageNumber === 1 ? 'الفاتحة' : (pageSurahNames.join(' · ') || surahMeta.name)}</span>
          <MushafProgress pageNumber={pageNumber} juzNumber={currentPage?.juz || surahMeta.juz || 1} pagesByNumber={quranData?.byPage} />
        </div>
      )}

      {viewMode === 'page' ? (
        <MushafSvgPage
          key={`${recitation}-${pageNumber}`}
          pageNumber={pageNumber}
          recitation={recitation}
          ayahs={visibleAyahs}
          onPreviousPage={() => setPageNumber((page) => Math.max(1, page - 1))}
          onNextPage={() => setPageNumber((page) => Math.min(604, page + 1))}
          fallback={visibleAyahs.map((ayah) => (
            <AyahView
              key={ayah.id || ayah.ayah}
              ayah={ayah}
              isBookmarked={bookmarkList.some((bookmark) => Number(bookmark.surah) === ayah.surah && Number(bookmark.ayah) === ayah.ayah && (bookmark.recitation || 'warsh') === recitation)}
              suppressBookmarkClickUntilRef={suppressAyahClickUntilRef}
              onBookmarkAyah={(surah, ayahNumber, text) => onBookmarkAyah?.(surah, ayahNumber, text, recitation)}
              fontSize={fontSize}
            />
          ))}
        />
      ) : (
        <div className="surah-ayahs-flow">
          {visibleAyahs.map((ayah) => (
            <AyahView
              key={ayah.id || ayah.ayah}
              ayah={ayah}
              isBookmarked={bookmarkList.some((bookmark) => Number(bookmark.surah) === ayah.surah && Number(bookmark.ayah) === ayah.ayah && (bookmark.recitation || 'warsh') === recitation)}
              suppressBookmarkClickUntilRef={suppressAyahClickUntilRef}
              onBookmarkAyah={(surah, ayahNumber, text) => onBookmarkAyah?.(surah, ayahNumber, text, recitation)}
              onToggleAutoScroll={handleAutoScrollDoubleClick}
              fontSize={fontSize}
            />
          ))}
        </div>
      )}
      {viewMode === 'page' && <PageProgressFooter pageNumber={pageNumber} />}
    </>
  );

  if (loading) {
    return (
      <div className="pure-reader-loading" dir="rtl">
        <Sparkles size={36} className="loading-icon gold-pulse" />
        <ShinyText text={`جارٍ فتح النص القرآني برواية ${RECITATION_LABELS[recitation] || 'ورش عن نافع'}…`} speed={3} color="var(--gold)" className="loading-title" />
      </div>
    );
  }

  if (loadError || !quranData) {
    return <div className="pure-reader-error" dir="rtl" role="alert">تعذر تحميل نص الرواية المختارة. تحقق من اتصال الإنترنت ثم أعد فتح القراءة النصية.<small>{loadError}</small></div>;
  }

  return (
    <div
      className={`pure-quran-reader-container ${isZenMode ? 'is-zen' : ''} ${isAutoScrolling ? 'is-auto-scrolling' : ''} ${viewMode === 'page' ? 'is-mushaf-page-mode' : ''}`}
      ref={readerScrollRef}
      onScroll={handleScroll}
      onPointerDown={handleReaderPointerDown}
      onPointerUp={handleReaderPointerUp}
      onPointerCancel={() => { swipeStartRef.current = null; }}
      onDoubleClick={viewMode === 'surah' ? handleAutoScrollDoubleClick : undefined}
      dir="rtl"
    >
      <button type="button" className="reader-edge-nav reader-edge-nav-prev" onClick={() => viewMode === 'page' ? navigateMushafChevron('left') : navigateReaderStep(-1)} aria-label={viewMode === 'page' ? 'الصفحة التالية' : 'السورة السابقة'} title={viewMode === 'page' ? 'الصفحة التالية' : 'السورة السابقة'}>
        <ChevronLeft size={19} />
      </button>
      <button type="button" className="reader-edge-nav reader-edge-nav-next" onClick={() => viewMode === 'page' ? navigateMushafChevron('right') : navigateReaderStep(1)} aria-label={viewMode === 'page' ? 'الصفحة السابقة' : 'السورة التالية'} title={viewMode === 'page' ? 'الصفحة السابقة' : 'السورة التالية'}>
        <ChevronRight size={19} />
      </button>
      {viewMode === 'surah' && (
        <div className="quran-reading-progress" role="progressbar" aria-label="تقدم القراءة في السورة" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readingProgress}>
          <span className="quran-reading-progress-fill" style={{ height: `${readingProgress}%` }} />
        </div>
      )}
      {viewMode === 'page' ? (
        <SpotlightCard className={`reader-manuscript-wrapper is-mushaf-page-shell mushaf-react-bits-frame ${recitation}`} spotlightColor="color-mix(in srgb, var(--gold) 12%, transparent)">
          <div className="mushaf-reactbits-content">
            <Aurora className="mushaf-page-aurora" colorStops={['#d6bb61', '#dce8d5', '#b9d0d6']} amplitude={0.42} />
            <div className="mushaf-page-content">{manuscriptContent}</div>
          </div>
        </SpotlightCard>
      ) : (
        <div className={`reader-manuscript-wrapper ${recitation}`}>{manuscriptContent}</div>
      )}
    </div>
  );
}
