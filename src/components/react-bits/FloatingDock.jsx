import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  BookText,
  Maximize2,
  Minimize2,
  Bookmark,
  Eye,
  EyeOff,
  Gauge,
  Hourglass,
  Download,
  Languages,
  Lock,
  Palette,
  ScrollText,
  Timer,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { addReadingSeconds, startReadingSession } from '../../services/storageService';
import { useReaderStore } from '../../stores/readerStore';
import { recitationSupportsMushafPages } from '../../data/recitations';
import SuggestionFeedback from '../SuggestionFeedback';
import OfflineQuranModal from '../OfflineQuranModal';
import AutoScrollTimerModal from '../AutoScrollTimerModal';
import './FloatingDock.css';

export default function FloatingDock({
  onOpenSurahDrawer,
  onOpenKhatma,
  onOpenBookmarks,
  onOpenRecitation,
  isCurrentPageBookmarked = false,
  bookmarkActionLabel = 'العلامات المحفوظة',
  isDarkTheme,
  theme = isDarkTheme ? 'dark' : 'light',
  onToggleTheme,
  autoScrollSpeed = 0,
  onIncreaseAutoScrollSpeed,
  isAutoScrolling = false,
  onOpenFocusLock,
  isFocusLocked = false,
  onToggleAutoScroll,
  autoScrollTimerMinutes = 0,
  isCoveredByWindow = false,
  onStartScrollTimer,
  onStopScrollTimer,
  recitation = 'warsh'
}) {
  const isZenMode = useReaderStore((state) => state.isZenMode);
  const toggleZenMode = useReaderStore((state) => state.toggleZenMode);
  const setZenMode = useReaderStore((state) => state.setZenMode);
  const scrollTimerRemainingSec = useReaderStore((state) => state.scrollTimerRemainingSec);
  const fontSize = useReaderStore((state) => state.fontSize);
  const zoomIn = useReaderStore((state) => state.zoomIn);
  const zoomOut = useReaderStore((state) => state.zoomOut);
  const viewMode = useReaderStore((state) => state.viewMode);
  const toggleViewMode = useReaderStore((state) => state.toggleViewMode);
  const supportsMushafPages = recitationSupportsMushafPages(recitation);
  const [expanded, setExpanded] = useState(false);
  const [isOfflineQuranOpen, setIsOfflineQuranOpen] = useState(false);
  const [isScrollTimerOpen, setIsScrollTimerOpen] = useState(false);
  const [isReadingTimerRunning, setIsReadingTimerRunning] = useState(true);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const zoomHoldRef = useRef(null);
  const zoomDelayRef = useRef(null);
  const zoomHeldRef = useRef(false);
  const speedClickRef = useRef(null);

  const stopZoomHold = () => {
    if (zoomDelayRef.current) clearTimeout(zoomDelayRef.current);
    if (zoomHoldRef.current) clearInterval(zoomHoldRef.current);
    zoomDelayRef.current = null;
    zoomHoldRef.current = null;
  };

  const startZoomHold = (callback) => {
    stopZoomHold();
    zoomHeldRef.current = false;
    zoomDelayRef.current = setTimeout(() => {
      zoomHeldRef.current = true;
      callback?.();
      zoomHoldRef.current = setInterval(() => callback?.(), 140);
    }, 360);
  };

  const handleZoomClick = (callback) => {
    if (zoomHeldRef.current) {
      zoomHeldRef.current = false;
      return;
    }
    callback?.();
  };

  const handleAutoScrollClick = () => {
    if (speedClickRef.current) clearTimeout(speedClickRef.current);
    speedClickRef.current = setTimeout(() => onIncreaseAutoScrollSpeed?.(), 260);
  };

  const handleAutoScrollDoubleClick = () => {
    if (speedClickRef.current) clearTimeout(speedClickRef.current);
    onToggleAutoScroll?.();
    // Keep the reader's controls hidden after both starting and stopping.
    setZenMode(true);
  };

  useEffect(() => () => {
    stopZoomHold();
    if (speedClickRef.current) clearTimeout(speedClickRef.current);
  }, []);

  const isAutoScrollingRef = useRef(isAutoScrolling);
  isAutoScrollingRef.current = isAutoScrolling;

  useEffect(() => {
    startReadingSession();
  }, []);

  useEffect(() => {
    if (!isReadingTimerRunning) return undefined;
    // Count only while the reader is active: any touch, click, key press or scroll counts as activity,
    // and after IDLE_LIMIT_MS without it the counter pauses until the next interaction. Auto-scroll counts as reading.
    const IDLE_LIMIT_MS = 30000;
    let lastActivity = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((name) => window.addEventListener(name, markActive, { passive: true, capture: true }));
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (!isAutoScrollingRef.current && Date.now() - lastActivity > IDLE_LIMIT_MS) return;
      setReadingSeconds((seconds) => seconds + 1);
      addReadingSeconds(1);
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, markActive, { capture: true }));
    };
  }, [isReadingTimerRunning]);

  const formatReadingTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    return hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  };

  const formatCountdown = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(remaining).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  };
  const isTimedRunning = isAutoScrolling && autoScrollTimerMinutes > 0 && scrollTimerRemainingSec != null;
  // While the countdown bead is visible it replaces the hourglass button (tap it to reopen the dialog).
  // The reading-time counter is switched off and hidden for the whole countdown, then restored afterwards.
  const readingTimerWasRunningRef = useRef(true);
  useEffect(() => {
    if (!isTimedRunning) return undefined;
    readingTimerWasRunningRef.current = isReadingTimerRunning;
    setIsReadingTimerRunning(false);
    return () => setIsReadingTimerRunning(readingTimerWasRunningRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimedRunning]);

  const themeLabels = { light: 'فاتح', sepia: 'ورقي', 'pigeon-blue': 'أزرق حمامي', grey: 'رمادي', green: 'أخضر', graphite: 'رمادي غامق', dark: 'داكن' };
  const themeLabel = themeLabels[theme] || themeLabels.light;
  const nextThemeLabel = themeLabels[
    ({ light: 'sepia', sepia: 'pigeon-blue', 'pigeon-blue': 'grey', grey: 'green', green: 'graphite', graphite: 'dark', dark: 'light' })[theme] || 'sepia'
  ];

  const zoomButtonProps = (callback, label) => ({
    onClick: () => handleZoomClick(callback),
    onPointerDown: () => startZoomHold(callback),
    onPointerUp: stopZoomHold,
    onPointerLeave: stopZoomHold,
    onPointerCancel: stopZoomHold,
    onLostPointerCapture: stopZoomHold,
    title: `${label} · اضغط مطولًا للتغيير المستمر`,
    'aria-label': `${label}، الحجم الحالي ${fontSize}`
  });

  return (
    <aside className={`floating-dock-wrapper ${isCoveredByWindow ? 'is-covered-by-window' : ''} ${expanded ? 'is-expanded' : ''} ${viewMode === 'page' ? 'is-page-mode' : ''} ${isZenMode ? 'is-zen' : ''}`} aria-label="أدوات القراءة" dir="rtl">
      <div className="dock-toggle-row">
        {!isTimedRunning && <button type="button" className={`dock-toggle-bead dock-timer-bead ${isReadingTimerRunning ? 'is-active' : ''}`} onClick={() => setIsReadingTimerRunning((running) => !running)} title={isReadingTimerRunning ? 'إيقاف مؤقت القراءة' : 'استئناف مؤقت القراءة'} aria-label={`${isReadingTimerRunning ? 'إيقاف' : 'استئناف'} مؤقت القراءة ${formatReadingTime(readingSeconds)}`}>
          <Timer size={14} /><span>{formatReadingTime(readingSeconds)}</span>
        </button>}
        {isTimedRunning && (
          <button type="button" className="dock-toggle-bead dock-timer-bead dock-scroll-countdown-bead is-active" onClick={() => setIsScrollTimerOpen(true)} title="المدة المتبقية للتمرير التلقائي" aria-label={`المدة المتبقية للتمرير التلقائي ${formatCountdown(scrollTimerRemainingSec)}`}>
            <Hourglass size={13} /><span>{formatCountdown(scrollTimerRemainingSec)}</span>
          </button>
        )}
        <button type="button" className={`dock-toggle-bead dock-visibility-bead ${isZenMode ? 'is-active' : ''}`} onClick={toggleZenMode} aria-label={isZenMode ? 'إظهار أدوات القراءة' : 'إخفاء أدوات القراءة'} title={isZenMode ? 'إظهار أدوات القراءة' : 'إخفاء أدوات القراءة'}>
          {isZenMode ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>

      <nav className="floating-dock-bar reactbits-ambient-surface" aria-label="أدوات المصحف" aria-hidden={isZenMode} inert={isZenMode || undefined}>
          <button type="button" className="dock-item dock-expand-nav-item" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'تصغير شريط الأدوات' : 'توسيع شريط الأدوات'} title={expanded ? 'تصغير الأدوات' : 'إظهار جميع الأدوات'}>
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}<span className="dock-label">{expanded ? 'تصغير' : 'توسيع'}</span>
          </button>
          <button type="button" className="dock-item dock-mobile-secondary dock-mobile-page-mode" onClick={onOpenSurahDrawer} title="فهرس السور والأجزاء" aria-label="السور">
            <BookOpen size={19} /><span className="dock-label">السور</span>
          </button>
          <div className="dock-divider dock-mobile-hidden" />
          {viewMode !== 'page' && <>
            <button type="button" {...zoomButtonProps(zoomIn, 'تكبير الخط')} className="dock-item dock-mobile-text-control">
              <ZoomIn size={18} /><span className="dock-label">تكبير</span>
            </button>
            <button type="button" {...zoomButtonProps(zoomOut, 'تصغير الخط')} className="dock-item dock-mobile-text-control">
              <ZoomOut size={18} /><span className="dock-label">تصغير</span>
            </button>
          </>}
          {supportsMushafPages && (
            <button type="button" className={`dock-item ${viewMode === 'page' ? 'is-active' : ''}`} onClick={toggleViewMode} title={viewMode === 'page' ? 'عرض النص' : 'عرض صفحات المصحف'} aria-label={viewMode === 'page' ? 'عرض النص' : 'عرض صفحات المصحف'}>
              {viewMode === 'page' ? <ScrollText size={18} /> : <BookText size={18} />}<span className="dock-label">{viewMode === 'page' ? 'نصي' : 'صفحات'}</span>
            </button>
          )}
          <button type="button" className="dock-item dock-mobile-secondary" onClick={onOpenRecitation} title="اختيار رواية المصحف" aria-label="اختيار رواية المصحف">
            <Languages size={18} /><span className="dock-label">الرواية</span>
          </button>
          {viewMode !== 'page' && <button type="button" className={`dock-item dock-mobile-text-control ${isAutoScrolling ? 'is-active' : ''}`} onClick={handleAutoScrollClick} onDoubleClick={handleAutoScrollDoubleClick} title="نقرة لتغيير السرعة · نقرتان للتشغيل أو الإيقاف" aria-label={`التمرير التلقائي، السرعة ${autoScrollSpeed + 1} من 6${isAutoScrolling ? '، يعمل الآن' : ''}`}>
            <span className={`dock-icon speed-icon ${isAutoScrolling ? 'is-running' : ''}`}><Gauge size={21} strokeWidth={1.8} /><span className="reader-speed-badge">{autoScrollSpeed + 1}</span></span>
            <span className="dock-label">السرعة · {autoScrollSpeed + 1}/6</span>
          </button>}
          <button type="button" className={`dock-item dock-mobile-secondary ${isFocusLocked ? 'is-active' : ''}`} onClick={onOpenFocusLock} disabled={isFocusLocked} title="وضع التركيز: ابقَ حتى تُنهي هدفك" aria-label="وضع التركيز">
            <Lock size={18} /><span className="dock-label">تركيز</span>
          </button>
          {viewMode !== 'page' && !isTimedRunning && <button type="button" className={`dock-item dock-mobile-text-control ${autoScrollTimerMinutes > 0 ? 'is-active' : ''}`} onClick={() => setIsScrollTimerOpen(true)} title="تمرير تلقائي بمدة محددة" aria-label={autoScrollTimerMinutes > 0 ? `مؤقت التمرير، ${autoScrollTimerMinutes} دقيقة` : 'ضبط مؤقت التمرير التلقائي'}>
            <span className="dock-icon scroll-timer-icon"><Hourglass size={19} strokeWidth={1.8} />{autoScrollTimerMinutes > 0 && <span className="reader-speed-badge">{autoScrollTimerMinutes}</span>}</span>
            <span className="dock-label">{autoScrollTimerMinutes > 0 ? `${autoScrollTimerMinutes} د` : 'مؤقت'}</span>
          </button>}
          <div className="dock-divider dock-mobile-hidden" />
          <button type="button" className="dock-item" onClick={onOpenKhatma} title="ختمة القرآن وورد اليوم" aria-label="ختمتي">
            <Award size={19} /><span className="dock-label">ختمتي</span>
          </button>
          <button type="button" className={`dock-item dock-mobile-secondary dock-mobile-page-mode ${isCurrentPageBookmarked ? 'is-bookmarked' : ''}`} onClick={onOpenBookmarks} title={bookmarkActionLabel} aria-label={bookmarkActionLabel} aria-pressed={viewMode === 'page' ? isCurrentPageBookmarked : undefined}>
            <Bookmark size={18} fill={isCurrentPageBookmarked && viewMode === 'page' ? 'currentColor' : 'none'} /><span className="dock-label">{isCurrentPageBookmarked && viewMode === 'page' ? 'محفوظة' : 'العلامات'}</span>
          </button>
          <button type="button" className="dock-item" onClick={onToggleTheme} title={`المظهر ${themeLabel} · التالي ${nextThemeLabel}`} aria-label={`المظهر الحالي ${themeLabel}، انقر للتبديل إلى ${nextThemeLabel}`}>
            <Palette size={19} /><span className="dock-label">{themeLabel}</span>
          </button>
          <button type="button" className="dock-item dock-offline-download-item" onClick={() => setIsOfflineQuranOpen(true)} title="تنزيل رواية للقراءة دون إنترنت" aria-label="تنزيل القرآن على هذا الهاتف">
            <Download size={18} /><span className="dock-label">تنزيل دون إنترنت</span>
          </button>
          <SuggestionFeedback className="dock-item dock-mobile-secondary dock-suggestion-item" label="اقتراح" />
      </nav>
      {isScrollTimerOpen && (
        <AutoScrollTimerModal
          isOpen={isScrollTimerOpen}
          onClose={() => setIsScrollTimerOpen(false)}
          activeMinutes={autoScrollTimerMinutes}
          onStart={onStartScrollTimer}
          onStop={onStopScrollTimer}
        />
      )}
      <OfflineQuranModal isOpen={isOfflineQuranOpen} onClose={() => setIsOfflineQuranOpen(false)} selectedRecitation={recitation} />
    </aside>
  );
}
