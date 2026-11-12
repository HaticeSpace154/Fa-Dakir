import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import PureQuranReader from '../components/reader/PureQuranReader';
import Aurora from '../components/react-bits/Aurora';
import ModernHeader from '../components/ModernHeader';
import FloatingDock from '../components/react-bits/FloatingDock';
import '../components/reader/ReadingConfirmation.css';
import {
  getStoredTheme,
  setStoredTheme,
  getBookmarks,
  saveBookmark,
  saveMushafPageBookmark,
  removeBookmark,
  getKhatmaProgress,
  updateKhatmaPage,
  updateKhatmaPlan,
  selectKhatmaPlan,
  removeKhatmaPlan,
  getReadingStats,
  getStoredRecitation,
  setStoredRecitation,
  getLastReadingPosition,
  saveLastReadingPosition
} from '../services/storageService';
import { JUZ_LIST, SURAHS } from '../data/quranMetadata';
import { recitationSupportsMushafPages } from '../data/recitations';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useReaderStore } from '../stores/readerStore';

const ImmersiveMode = registerPlugin('ImmersiveMode');
const SurahDrawer = lazy(() => import('../components/SurahDrawer'));
const KhatmaDashboard = lazy(() => import('../components/KhatmaDashboard'));
const SearchModal = lazy(() => import('../components/SearchModal'));
const StatisticsModal = lazy(() => import('../components/StatisticsModal'));
const AccountModal = lazy(() => import('../components/AccountModal'));
import FocusLockModal from '../components/FocusLockModal';
import FocusLockBanner from '../components/FocusLockBanner';
import './../components/FocusLockModal.css';
import { getFocusLock, setFocusLock, clearFocusLock, isFocusLockSatisfied } from '../services/focusLockService';
const RecitationModal = lazy(() => import('../components/RecitationModal'));

const APP_THEMES = ['light', 'sepia', 'pigeon-blue', 'grey', 'green', 'graphite', 'dark'];
const THEME_BACKGROUNDS = {
  light: '#f9f6f0',
  sepia: '#f2e8d5',
  'pigeon-blue': '#122b46',
  grey: '#e5e7e9',
  green: '#dbe8e0',
  graphite: '#3a3a3a',
  dark: '#0a0a0a',
};

function getInitialTheme() {
  // URL override: ?theme=dark (or light/sepia/pigeon-blue/grey) forces a theme on any
  // origin — useful to reproduce localhost's exact look on the deployed site.
  try {
    const requested = new URLSearchParams(window.location.search).get('theme');
    if (requested && APP_THEMES.includes(requested)) {
      setStoredTheme(requested);
      return requested;
    }
  } catch { /* ignore */ }
  const storedTheme = getStoredTheme();
  if (APP_THEMES.includes(storedTheme)) return storedTheme;
  if (storedTheme === 'mono') return 'dark';
  return 'light';
}

/**
 * 100% Pure Native React Quran Reader Application
 */
export default function Quran() {
  const [initialPosition] = useState(getLastReadingPosition);
  // Riwayas without published Mushaf page artwork stay in flowing-text mode, even if a previous session saved a page position.
  const initialViewMode = initialPosition.viewMode === 'page' && recitationSupportsMushafPages(initialPosition.recitation) ? 'page' : 'surah';
  const [currentReadingPosition, setCurrentReadingPosition] = useState(initialPosition);
  const [currentSurahNumber, setCurrentSurahNumber] = useState(initialPosition.surah);
  const [readerTargetAyah, setReaderTargetAyah] = useState(initialViewMode === 'surah' ? { surah: initialPosition.surah, ayah: initialPosition.ayah } : null);
  const [readerTargetPage, setReaderTargetPage] = useState(initialViewMode === 'page' ? initialPosition.page : null);
  const [currentMushafPage, setCurrentMushafPage] = useState(initialPosition.page);
  const [readingPercent, setReadingPercent] = useState(Math.round((initialPosition.page / 604) * 100));
  const [theme, setTheme] = useState(getInitialTheme);
  const isDarkTheme = theme === 'dark' || theme === 'pigeon-blue' || theme === 'graphite';
  const isZenMode = useReaderStore((state) => state.isZenMode);
  const setIsZenMode = useReaderStore((state) => state.setZenMode);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const appShellRef = useRef(null);
  const readerViewMode = useReaderStore((state) => state.viewMode);
  const setReaderViewMode = useReaderStore((state) => state.setViewMode);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  // { minutes, token } while a timed auto-scroll is configured; null means manual speed mode.
  const [autoScrollTimer, setAutoScrollTimer] = useState(null);
  const handleStartScrollTimer = useCallback((minutes) => {
    setAutoScrollTimer({ minutes, token: Date.now() });
    setIsAutoScrolling(true);
    // Same as double-tap start: hide the controls so the text can be read undisturbed.
    setIsZenMode(true);
  }, [setIsZenMode]);
  const handleStopScrollTimer = useCallback(() => {
    setAutoScrollTimer(null);
    setIsAutoScrolling(false);
  }, []);
  const [customWirdSequence, setCustomWirdSequence] = useState([]);
  const [customWirdIndex, setCustomWirdIndex] = useState(0);
  const [isCustomWirdActive, setIsCustomWirdActive] = useState(false);
  const [bookmarks, setBookmarks] = useState(getBookmarks);
  const [recitation, setRecitation] = useState(getStoredRecitation);
  const [khatmaData, setKhatmaData] = useState(getKhatmaProgress);
  // Optional focus lock: keeps the reader in the app until the chosen goal (wird / khatma / countdown) is finished.
  const [focusLock, setFocusLockState] = useState(getFocusLock);
  const [isFocusLockOpen, setIsFocusLockOpen] = useState(false);
  const customLockSeenRef = useRef(false);
  // Custom-wird lock: lifts when the custom wird sequence finishes (or if it is no longer running, e.g. after a reload).
  useEffect(() => {
    if (focusLock?.mode !== 'custom') return undefined;
    if (isCustomWirdActive) { customLockSeenRef.current = true; return undefined; }
    const id = setTimeout(() => {
      clearFocusLock();
      if (customLockSeenRef.current) toast.success('أحسنت! أتممت وردك المخصص، وتم إنهاء وضع التركيز.');
    }, customLockSeenRef.current ? 0 : 1500);
    return () => clearTimeout(id);
  }, [focusLock, isCustomWirdActive]);
  useEffect(() => {
    const sync = () => setFocusLockState(getFocusLock());
    window.addEventListener('focuslock:changed', sync);
    return () => window.removeEventListener('focuslock:changed', sync);
  }, []);
  useEffect(() => {
    if (!focusLock) return undefined;
    const check = () => {
      if (isFocusLockSatisfied(focusLock, getKhatmaProgress())) {
        clearFocusLock();
        toast.success('أحسنت! أتممت هدفك، وتم إنهاء وضع التركيز.');
      }
    };
    check();
    const id = setInterval(check, 1000);
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => { clearInterval(id); window.removeEventListener('beforeunload', warn); };
  }, [focusLock, khatmaData]);

  // Modals state
  const [isSurahDrawerOpen, setIsSurahDrawerOpen] = useState(false);
  const [surahDrawerTab, setSurahDrawerTab] = useState('surahs');
  const [isKhatmaOpen, setIsKhatmaOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isRecitationOpen, setIsRecitationOpen] = useState(false);
  const [readingStatsSnapshot, setReadingStatsSnapshot] = useState(getReadingStats);
  const [pendingReadingConfirmation, setPendingReadingConfirmation] = useState(null);

  useEffect(() => {
    const syncFullScreenState = () => setIsFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullScreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullScreenState);
  }, []);

  useEffect(() => {
    const exitFullMode = async () => {
      if (!isFullScreen) return;
      try {
        if (Capacitor.isNativePlatform()) await ImmersiveMode.setEnabled({ enabled: false });
      } catch (error) {
        console.error('Could not exit Android immersive mode', error);
      } finally {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('reader:exit-full-mode', exitFullMode);
    return () => window.removeEventListener('reader:exit-full-mode', exitFullMode);
  }, [isFullScreen]);

  const handleToggleFullScreen = async () => {
    if (Capacitor.isNativePlatform()) {
      const next = !isFullScreen;
      try {
        await ImmersiveMode.setEnabled({ enabled: next });
        setIsFullScreen(next);
      } catch (error) {
        console.error('Could not toggle Android immersive mode', error);
      }
      return;
    }
    // On the web, use the app's viewport-filling layout only. The Fullscreen API
    // can trigger orientation changes on some mobile browsers.
    setIsFullScreen((active) => !active);
  };

  // Sync theme attribute to documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--shell-bg', THEME_BACKGROUNDS[theme]);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BACKGROUNDS[theme]);
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', isDarkTheme ? 'dark' : 'light');
    setStoredTheme(theme);
  }, [theme, isDarkTheme]);

  // Riwayas without Mushaf page artwork stay in flowing-text mode.
  const supportsMushafPages = recitationSupportsMushafPages(recitation);

  // Current surah metadata
  const surahMeta = SURAHS.find((s) => s.id === currentSurahNumber) || SURAHS[0];

  // Handlers
  const handleSelectSurah = (surahNumber, ayahNumber = 1, bookmarkRecitation = null) => {
    if (bookmarkRecitation && bookmarkRecitation !== recitation) {
      setRecitation(bookmarkRecitation);
      setStoredRecitation(bookmarkRecitation);
    }
    setIsCustomWirdActive(false);
    setCustomWirdSequence([]);
    setCurrentSurahNumber(surahNumber);
    setReaderTargetAyah({ surah: surahNumber, ayah: ayahNumber });
    const meta = SURAHS[surahNumber - 1] || SURAHS[0];
    const nextViewMode = supportsMushafPages ? readerViewMode : 'surah';
    const position = { viewMode: nextViewMode, page: meta.page, surah: surahNumber, ayah: ayahNumber, juz: meta.juz || 1, hizb: Math.max(1, (meta.juz || 1) * 2 - 1), recitation };
    setCurrentReadingPosition(position);
    saveLastReadingPosition(position);
  };

  const handleSelectJuz = (pageNumber, surahId) => {
    setIsCustomWirdActive(false);
    setCustomWirdSequence([]);
    if (surahId) setCurrentSurahNumber(surahId);
    const selectedJuz = [...JUZ_LIST].reverse().find((item) => item.page <= pageNumber);
    const juz = selectedJuz?.id || 1;
    const nextJuzStart = JUZ_LIST[juz]?.page || 605;
    const splitPage = selectedJuz.page + Math.ceil((nextJuzStart - selectedJuz.page) / 2);
    const hizb = (juz - 1) * 2 + (pageNumber >= splitPage ? 2 : 1);
    const nextViewMode = supportsMushafPages ? readerViewMode : 'surah';
    const position = { viewMode: nextViewMode, page: pageNumber, surah: surahId || currentSurahNumber, ayah: 1, juz, hizb, recitation };
    setCurrentReadingPosition(position);
    saveLastReadingPosition(position);
    setCurrentMushafPage(pageNumber);
    if (nextViewMode === 'page') setReaderTargetPage(pageNumber);
    else if (surahId) setReaderTargetAyah({ surah: surahId, ayah: 1 });
    updateKhatmaPage(pageNumber);
    setKhatmaData(getKhatmaProgress());
  };

  const handleBookmarkAyah = (surah, ayah, text, ayahRecitation = recitation) => {
    const updated = saveBookmark(surah, ayah, text, ayahRecitation);
    setBookmarks(updated);
    const isSaved = updated.some((bookmark) => bookmark.type !== 'mushaf-page' && Number(bookmark.surah) === Number(surah) && Number(bookmark.ayah) === Number(ayah) && (bookmark.recitation || 'warsh') === ayahRecitation);
    if (isSaved) toast.success('تم حفظ الآية في العلامات.');
    else toast('تمت إزالة الآية من العلامات.');
  };

  const handleToggleTheme = () => {
    setTheme((current) => APP_THEMES[(APP_THEMES.indexOf(current) + 1) % APP_THEMES.length]);
  };

  const openSurahDrawer = (tab = 'surahs') => {
    setSurahDrawerTab(tab);
    setIsSurahDrawerOpen(true);
  };

  const handleOpenBookmarks = () => {
    if (readerViewMode === 'page') {
      setBookmarks(saveMushafPageBookmark(currentMushafPage, recitation));
      return;
    }
    openSurahDrawer('bookmarks');
  };

  const handleOpenStatistics = () => {
    setReadingStatsSnapshot(getReadingStats());
    setIsStatisticsOpen(true);
  };

  const handleProgressUpdate = useCallback((pct, estimatedPage) => {
    setReadingPercent(pct);
    if (!isCustomWirdActive && readerViewMode === 'page') {
      const page = Math.max(1, Math.min(604, Math.round(estimatedPage || (pct / 100) * 604)));
      setKhatmaData(updateKhatmaPage(page));
    }
  }, [readerViewMode, isCustomWirdActive]);

  const handlePositionUpdate = useCallback((position) => {
    const savedPosition = { ...position, recitation };
    saveLastReadingPosition(savedPosition);
    setCurrentReadingPosition(savedPosition);
    if (savedPosition.viewMode === 'page') {
      setCurrentMushafPage(savedPosition.page);
      setCurrentSurahNumber(savedPosition.surah);
    }
  }, [recitation]);

  const handleConfirmTextReading = () => {
    if (!pendingReadingConfirmation) return;
    if (isCustomWirdActive) {
      setPendingReadingConfirmation(null);
      return;
    }
    setKhatmaData(updateKhatmaPage(pendingReadingConfirmation.endPage));
    setPendingReadingConfirmation(null);
  };

  // Riwayas without Mushaf page artwork cannot enter page mode — fall back to flowing text.
  useEffect(() => {
    if (!supportsMushafPages && readerViewMode === 'page') {
      setReaderViewMode('surah');
    }
  }, [supportsMushafPages, readerViewMode, setReaderViewMode]);

  const handleSelectMushafPage = (page, bookmarkRecitation) => {
    const nextRecitation = bookmarkRecitation || recitation;
    setIsCustomWirdActive(false);
    setCustomWirdSequence([]);
    if (bookmarkRecitation && bookmarkRecitation !== recitation) {
      setRecitation(bookmarkRecitation);
      setStoredRecitation(bookmarkRecitation);
    }
    if (!recitationSupportsMushafPages(nextRecitation)) {
      // Mushaf page mode is unavailable for this riwaya; there is no page anchor, so open the riwaya at its beginning in flowing text.
      const openingSurah = SURAHS[0];
      setReaderViewMode('surah');
      setCurrentSurahNumber(openingSurah.id);
      setReaderTargetAyah({ surah: openingSurah.id, ayah: 1 });
      setReaderTargetPage(null);
      setCurrentMushafPage(openingSurah.page);
      toast('لا تتوفر صفحات مصحف مصوّرة لهذه الرواية؛ تم فتحها بالنص.');
      return;
    }
    setReaderTargetAyah(null);
    setReaderViewMode('page');
    setReaderTargetPage(Number(page));
    setCurrentMushafPage(Number(page));
  };

  const handleStartCustomWird = (sequence) => {
    if (!Array.isArray(sequence) || sequence.length === 0) return;
    const firstSurah = Number(sequence[0]);
    setCustomWirdSequence(sequence.map(Number));
    setCustomWirdIndex(0);
    setIsCustomWirdActive(true);
    setReaderViewMode('surah');
    setCurrentSurahNumber(firstSurah);
    setReaderTargetAyah({ surah: firstSurah, ayah: 1 });
  };

  const handleScrollFinished = useCallback((reading) => {
    if (!isCustomWirdActive) {
      setPendingReadingConfirmation(reading);
      return;
    }
    const nextIndex = customWirdIndex + 1;
    if (nextIndex < customWirdSequence.length) {
      const nextSurah = customWirdSequence[nextIndex];
      setCustomWirdIndex(nextIndex);
      setCurrentSurahNumber(nextSurah);
      setReaderTargetAyah({ surah: nextSurah, ayah: 1 });
      return;
    }
    setIsCustomWirdActive(false);
    setCustomWirdSequence([]);
    setCustomWirdIndex(0);
  }, [isCustomWirdActive, customWirdIndex, customWirdSequence]);

  return (
    <div
      ref={appShellRef}
      className={clsx('quran-pure-app', { 'is-full-mode': isFullScreen, 'is-native-app': Capacitor.isNativePlatform() })}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--shell-bg, #f9f6f0)',
      }}
    >
      {/* React Bits: Ambient Aurora Light Mesh */}
      <Aurora
        colorStops={
          isDarkTheme
            ? ['#0f2e24', '#705b1c', '#090a0f']
            : ['#dcfce7', '#fef9c3', '#e0f2fe']
        }
        amplitude={isDarkTheme ? 0.65 : 0.4}
      />

      {/* React Bits: Modern Floating Top Header with ShinyText */}
      <ModernHeader
        surahName={surahMeta.name}
        surahNumber={surahMeta.id}
        hizbNumber={currentReadingPosition.hizb || Math.ceil((surahMeta.juz || 1) * 2)}
        juzNumber={currentReadingPosition.juz || surahMeta.juz || 1}
        readingPercent={readingPercent}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenStatistics={handleOpenStatistics}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenSurahs={() => openSurahDrawer('surahs')}
        isZenMode={isZenMode}
        onToggleZenMode={() => useReaderStore.getState().toggleZenMode()}
        isFullScreen={isFullScreen}
        onToggleFullScreen={handleToggleFullScreen}
        showFullScreenButton={Capacitor.isNativePlatform()}
      />

      {/* Pure Native React Quran Reader */}
      <PureQuranReader
        currentSurahNumber={currentSurahNumber}
        onSurahChange={setCurrentSurahNumber}
        targetAyah={readerTargetAyah}
        onTargetAyahHandled={() => setReaderTargetAyah(null)}
        targetPage={readerTargetPage}
        onTargetPageHandled={() => setReaderTargetPage(null)}
        onPageChange={setCurrentMushafPage}
        onBookmarkAyah={handleBookmarkAyah}
        bookmarks={bookmarks}
        recitation={recitation}
        readingSequenceStep={isCustomWirdActive ? customWirdIndex : 0}
        onProgressUpdate={handleProgressUpdate}
        onPositionUpdate={handlePositionUpdate}
        onScrollFinished={handleScrollFinished}
        autoScrollSpeed={autoScrollSpeed}
        autoScrollTimer={autoScrollTimer}
        isAutoScrolling={isAutoScrolling}
        onToggleAutoScroll={() => setIsAutoScrolling((running) => !running)}
      />

      <FocusLockBanner lock={focusLock} khatma={khatmaData} onRelease={() => { clearFocusLock(); toast('تم إنهاء وضع التركيز.'); }} />
      {isFocusLockOpen && <FocusLockModal isOpen={isFocusLockOpen} onClose={() => setIsFocusLockOpen(false)} khatma={khatmaData} onStart={(lock, sequence) => { customLockSeenRef.current = false; setFocusLock(lock); if (sequence?.length) handleStartCustomWird(sequence); toast.success('تم تفعيل وضع التركيز.'); }} />}

      {/* React Bits: Animated Floating Bottom Command Dock */}
      <FloatingDock
        onOpenSurahDrawer={() => openSurahDrawer('surahs')}
        onOpenKhatma={() => setIsKhatmaOpen(true)}
        onOpenFocusLock={() => setIsFocusLockOpen(true)}
        isFocusLocked={Boolean(focusLock)}
        onOpenBookmarks={handleOpenBookmarks}
        onOpenRecitation={() => setIsRecitationOpen(true)}
        isCurrentPageBookmarked={readerViewMode === 'page' && bookmarks.some((bookmark) => bookmark.type === 'mushaf-page' && Number(bookmark.page) === currentMushafPage && (bookmark.recitation || 'warsh') === recitation)}
        bookmarkActionLabel={readerViewMode === 'page' ? (bookmarks.some((bookmark) => bookmark.type === 'mushaf-page' && Number(bookmark.page) === currentMushafPage && (bookmark.recitation || 'warsh') === recitation) ? 'إزالة علامة صفحة المصحف الحالية' : 'حفظ صفحة المصحف الحالية') : 'العلامات المحفوظة'}
        isDarkTheme={isDarkTheme}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        autoScrollSpeed={autoScrollSpeed}
        // Tapping the speed button switches back to manual speed control.
        onIncreaseAutoScrollSpeed={() => { setAutoScrollTimer(null); setAutoScrollSpeed((speed) => (speed + 1) % 6); }}
        isAutoScrolling={isAutoScrolling}
        onToggleAutoScroll={() => setIsAutoScrolling((running) => !running)}
        autoScrollTimerMinutes={autoScrollTimer?.minutes || 0}
        isCoveredByWindow={isKhatmaOpen}
        onStartScrollTimer={handleStartScrollTimer}
        onStopScrollTimer={handleStopScrollTimer}
        recitation={recitation}
      />

      <Suspense fallback={null}>
      {isRecitationOpen && <RecitationModal
        isOpen={isRecitationOpen}
        onClose={() => setIsRecitationOpen(false)}
        value={recitation}
        onSelect={(nextRecitation) => {
          if (nextRecitation === recitation) {
            setIsRecitationOpen(false);
            return;
          }
          const isWarshFontSwitch = ['warsh', 'warsh-normal'].includes(recitation) && ['warsh', 'warsh-normal'].includes(nextRecitation);
          if (isWarshFontSwitch) {
            setRecitation(nextRecitation);
            setStoredRecitation(nextRecitation);
            const preservedPosition = { ...currentReadingPosition, recitation: nextRecitation };
            setCurrentReadingPosition(preservedPosition);
            saveLastReadingPosition(preservedPosition);
            setIsRecitationOpen(false);
            return;
          }
          setRecitation(nextRecitation);
          setStoredRecitation(nextRecitation);
          setCurrentSurahNumber(1);
          setReaderTargetAyah({ surah: 1, ayah: 1 });
          setCurrentMushafPage(1);
          setReaderTargetPage(1);
          const nextViewMode = recitationSupportsMushafPages(nextRecitation) ? readerViewMode : 'surah';
          const startPosition = { viewMode: nextViewMode, page: 1, surah: 1, ayah: 1, juz: 1, hizb: 1, recitation: nextRecitation };
          setCurrentReadingPosition(startPosition);
          saveLastReadingPosition(startPosition);
          setIsRecitationOpen(false);
        }}
      />}

      {/* Slide-over Surah & Juz Drawer with SpotlightCards */}
      {isSurahDrawerOpen && <SurahDrawer
        isOpen={isSurahDrawerOpen}
        onClose={() => setIsSurahDrawerOpen(false)}
        initialTab={surahDrawerTab}
        currentSurahId={currentSurahNumber}
        onSelectSurah={handleSelectSurah}
        onSelectJuz={handleSelectJuz}
        onSelectPage={handleSelectMushafPage}
        bookmarks={bookmarks}
        onRemoveBookmark={(bookmark) => setBookmarks(removeBookmark(bookmark))}
      />}

      {/* Khatma Progress Dashboard */}
      {isKhatmaOpen && <KhatmaDashboard
        isOpen={isKhatmaOpen}
        onClose={() => setIsKhatmaOpen(false)}
        khatmaData={khatmaData}
        onStartCustomWird={handleStartCustomWird}
        onSavePlan={(plan) => {
          const updated = updateKhatmaPlan(plan);
          setKhatmaData(updated);
          return updated;
        }}
        onSelectPlan={(id) => setKhatmaData(selectKhatmaPlan(id))}
        onDeletePlan={(id) => {
          const updated = removeKhatmaPlan(id);
          setKhatmaData(updated);
          return updated;
        }}
        onStartWird={(page) => {
          setIsCustomWirdActive(false);
          setCustomWirdSequence([]);
          // Find the surah that contains this page (last surah starting on or before it)
          const targetSurah = [...SURAHS].reverse().find((s) => s.page <= page) || SURAHS[0];
          setCurrentSurahNumber(targetSurah.id);
        }}
      />}

      {/* Instant Ayahs Search Modal */}
      {isSearchModalOpen && <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        recitation={recitation}
        onSelectResult={(surah, ayah) => {
          setCurrentSurahNumber(surah);
          setReaderTargetAyah({ surah, ayah });
        }}
      />}

      {isStatisticsOpen && <StatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
        stats={readingStatsSnapshot}
        khatmaData={khatmaData}
      />}

      {isAccountOpen && <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />}
      </Suspense>

      {pendingReadingConfirmation && (
        <div className="reading-confirm-overlay" dir="rtl">
          <section className="reading-confirm-dialog reactbits-ambient-surface" role="dialog" aria-modal="true" aria-labelledby="reading-confirm-title">
            <div className="reading-confirm-mark">✓</div>
            <h2 id="reading-confirm-title">هل أتممت قراءة سورة {pendingReadingConfirmation.surahName}؟</h2>
            <p>وصلت إلى نهاية السورة. أكّد القراءة لتحديث ختمتك حتى صفحة {pendingReadingConfirmation.endPage}.</p>
            <div className="reading-confirm-actions">
              <button type="button" className="reading-confirm-primary" onClick={handleConfirmTextReading}>نعم، أتممت القراءة</button>
              <button type="button" className="reading-confirm-secondary" onClick={() => setPendingReadingConfirmation(null)}>ليس الآن</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
