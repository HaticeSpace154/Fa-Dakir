import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, BookOpen, Layers, Bookmark, Sparkles, Trash2 } from 'lucide-react';
import SpotlightCard from './react-bits/SpotlightCard';
import ShinyText from './react-bits/ShinyText';
import AccessibleDialog from './ui/AccessibleDialog';
import { SURAHS, JUZ_LIST, toEasternArabic } from '../data/quranMetadata';
import './SurahDrawer.css';

/**
 * SurahDrawer — Slide-over drawer with instant search and SpotlightCards
 */
export default function SurahDrawer({
  isOpen,
  onClose,
  initialTab = 'surahs',
  currentSurahId = 1,
  onSelectSurah,
  onSelectJuz,
  onSelectPage,
  bookmarks = [],
  onRemoveBookmark
}) {
  const bookmarkList = Array.isArray(bookmarks) ? bookmarks : [];
  const [activeTab, setActiveTab] = useState('surahs'); // 'surahs' | 'juz' | 'bookmarks'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  // Normalize Arabic text for diacritics-free search
  const normalize = (text) => {
    return text
      ? text
          .replace(/[ًٌٍَُِّْـ]/g, '')
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .toLowerCase()
      : '';
  };

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAHS;
    const q = normalize(searchQuery.trim());
    return SURAHS.filter(
      (s) =>
        normalize(s.name).includes(q) ||
        s.english.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        toEasternArabic(s.id).includes(q)
    );
  }, [searchQuery]);

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="فهرس القرآن الكريم" backdropClassName="surah-drawer-overlay" viewportClassName="is-drawer" popupClassName="surah-drawer-sheet reactbits-ambient-surface">
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-row">
            <div className="drawer-title-group">
              <Sparkles size={18} className="gold-accent" />
              <ShinyText text="فهرس المصحف الشريف" speed={4} color="var(--gold)" className="drawer-title" />
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="إغلاق الفهرس"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Box */}
          <div className="drawer-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="ابحث باسم السورة، رقمها، أو معناها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${activeTab === 'surahs' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('surahs')}
            >
              <BookOpen size={16} />
              <span>السور ({toEasternArabic(filteredSurahs.length)})</span>
            </button>

            <button
              type="button"
              className={`drawer-tab ${activeTab === 'juz' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('juz')}
            >
              <Layers size={16} />
              <span>الأجزاء (30)</span>
            </button>

            <button
              type="button"
              className={`drawer-tab ${activeTab === 'bookmarks' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              <Bookmark size={16} />
              <span>العلامات ({toEasternArabic(bookmarkList.length)})</span>
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="drawer-scroll-area">
          {activeTab === 'surahs' && (
            <div className="surahs-grid">
              {filteredSurahs.map((surah) => {
                const isActive = surah.id === currentSurahId;
                return (
                  <SpotlightCard
                    key={surah.id}
                    className={`surah-card-item ${isActive ? 'current-surah' : ''}`}
                    active={isActive}
                    onClick={() => {
                      onSelectSurah(surah.id);
                      onClose();
                    }}
                  >
                    <div className="surah-card-inner">
                      {/* Number rosette */}
                      <div className="surah-number-badge">
                        <span>{toEasternArabic(surah.id)}</span>
                      </div>

                      {/* Info */}
                      <div className="surah-details">
                        <div className="surah-main-name">
                          <span className="ar-name">سورة {surah.name}</span>
                          <span className={`surah-type-tag ${surah.type === 'مدنية' ? 'is-madani' : 'is-makki'}`}>
                            {surah.type}
                          </span>
                        </div>
                        <div className="surah-sub-info">
                          <span>{surah.english}</span>
                          <span className="dot">•</span>
                          <span>{toEasternArabic(surah.ayahs)} آية</span>
                          <span className="dot">•</span>
                          <span>ص {toEasternArabic(surah.page)}</span>
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}

          {activeTab === 'juz' && (
            <div className="juz-grid">
              {JUZ_LIST.map((juz) => (
                <SpotlightCard
                  key={juz.id}
                  className="juz-card-item"
                  onClick={() => {
                    onSelectJuz(juz.page, juz.startSurahId);
                    onClose();
                  }}
                >
                  <div className="juz-card-inner">
                    <div className="juz-num-rosette">
                      <span>{toEasternArabic(juz.id)}</span>
                    </div>
                    <div className="juz-info">
                      <div className="juz-title">{juz.name}</div>
                      <div className="juz-start-text">
                        يبدأ من: سورة {juz.startSurah} (صفحة {toEasternArabic(juz.page)})
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="bookmarks-list">
              {bookmarkList.length === 0 ? (
                <div className="empty-bookmarks">
                  <Bookmark size={36} className="empty-icon" />
                  <p>لا توجد علامات مرجعية محفوظة حاليًا.</p>
                  <small>انقر على أي آية أثناء القراءة لإضافتها إلى العلامات المرجعية.</small>
                </div>
              ) : (
                bookmarkList.map((bm) => {
                  const surahName = bm.surahName || SURAHS[bm.surah - 1]?.name || `رقم ${bm.surah}`;
                  const isMushafPage = bm.type === 'mushaf-page';
                  return (
                  <SpotlightCard
                    key={isMushafPage ? `page:${bm.recitation || 'warsh'}:${bm.page}` : `${bm.recitation || 'warsh'}:${bm.surah}:${bm.ayah}`}
                    className="bookmark-card-item"
                    onClick={() => {
                      if (isMushafPage) onSelectPage?.(bm.page, bm.recitation || 'warsh');
                      else if (bm.surah) onSelectSurah(bm.surah, bm.ayah, bm.recitation || 'warsh');
                      onClose();
                    }}
                  >
                    <div className="bookmark-card-inner">
                      <Bookmark size={18} className="gold-accent" />
                      <div className="bookmark-details">
                        <strong>{isMushafPage ? `صفحة المصحف ${toEasternArabic(bm.page)} · ${({ warsh: 'ورش (الخط المغربي)', 'warsh-normal': 'ورش (أميري)', hafs: 'حفص', qalon: 'قالون', douri: 'الدوري', shubah: 'شعبة', bazzi: 'البزي', soosi: 'السوسي' })[bm.recitation || 'warsh']}` : `سورة ${surahName} — الآية ${toEasternArabic(bm.ayah || 1)} · ${({ warsh: 'ورش (الخط المغربي)', 'warsh-normal': 'ورش (أميري)', hafs: 'حفص', qalon: 'قالون', douri: 'الدوري', shubah: 'شعبة', bazzi: 'البزي', soosi: 'السوسي' })[bm.recitation || 'warsh']}`}</strong>
                        {bm.text && <p className="bookmark-ayah-text">{bm.text}</p>}
                        <div className="bm-date">{bm.date || 'موضع محفوظ'}</div>
                      </div>
                      <button type="button" className="remove-bookmark-btn" aria-label={isMushafPage ? `حذف علامة صفحة ${bm.page}` : `حذف علامة سورة ${surahName} الآية ${bm.ayah}`} title="حذف العلامة" onClick={(event) => { event.stopPropagation(); onRemoveBookmark?.(bm); }}><Trash2 size={16} /></button>
                    </div>
                  </SpotlightCard>
                  );
                })
              )}
            </div>
          )}
        </div>
    </AccessibleDialog>
  );
}
