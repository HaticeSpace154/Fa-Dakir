import React from 'react';
import { Search, BookOpen, Layers, BarChart3, UserRound, Maximize, Minimize } from 'lucide-react';
import ShinyText from './react-bits/ShinyText';
import { toEasternArabic } from '../data/quranMetadata';
import './ModernHeader.css';

/**
 * ModernHeader — React Bits styled header
 * Elegant floating glass bar displaying Surah title in ShinyText, Juz/Hizb info, and quick actions.
 */
export default function ModernHeader({
  surahName = 'الفاتحة',
  surahNumber = 1,
  juzNumber = 1,
  hizbNumber = 1,
  readingPercent = 0,
  onOpenSearch,
  onOpenStatistics,
  onOpenAccount,
  onOpenSurahs,
  isZenMode,
  isFullScreen = false,
  onToggleFullScreen,
  showFullScreenButton = false
}) {
  return (
    <header className={`modern-header ${isZenMode ? 'is-zen' : ''}`} dir="rtl">
      <div className="header-glass-bar reactbits-ambient-surface">
        {/* Right side: Quick Surah trigger & Name */}
        <button
          type="button"
          className="surah-title-chip"
          onClick={onOpenSurahs}
          title="اضغط لاختيار سورة أخرى"
        >
          <div className="surah-badge-pill">
            <BookOpen size={15} className="chip-icon" />
            <span className="surah-num">{toEasternArabic(surahNumber)}</span>
          </div>

          <div className="surah-name-wrap">
            <ShinyText
              text={`سورة ${surahName}`}
              speed={4.5}
              color="var(--gold)"
              className="surah-name-shiny"
            />
          </div>
        </button>

        {/* Center: Juz' & Hizb information */}
        <div className="juz-hizb-indicator" aria-label="موضع القراءة الحالي">
          <span className="juz-label">
            <Layers size={13} className="meta-icon" />
            الجزء {toEasternArabic(juzNumber)}
          </span>
          <span className="meta-dot">•</span>
          <span className="hizb-label">الحزب {toEasternArabic(hizbNumber)}</span>
        </div>

        {/* Left side: Reading Percentage & Quick Actions */}
        <div className="header-actions">
          {/* Reading progress percentage pill */}
          <div className="reading-pct-pill" title="نسبة الإنجاز في المصحف">
            <span className="pct-dot" />
            <span className="pct-num">{toEasternArabic(readingPercent)}٪</span>
          </div>

          {/* Quick Search */}
          <button
            type="button"
            className="action-icon-btn"
            onClick={onOpenSearch}
            title="بحث في القرآن"
            aria-label="بحث"
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            className="action-icon-btn"
            onClick={onOpenStatistics}
            title="إحصائيات القراءة"
            aria-label="إحصائيات القراءة"
          >
            <BarChart3 size={18} />
          </button>

          <button
            type="button"
            className="action-icon-btn"
            onClick={onOpenAccount}
            title="تسجيل الدخول والنسخ الاحتياطي"
            aria-label="الحساب"
          >
            <UserRound size={18} />
          </button>

          {showFullScreenButton && (
            <button
              type="button"
              className="action-icon-btn fullscreen-action-btn"
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'الخروج من وضع ملء الشاشة' : 'ملء الشاشة'}
              aria-label={isFullScreen ? 'الخروج من وضع ملء الشاشة' : 'ملء الشاشة'}
            >
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
