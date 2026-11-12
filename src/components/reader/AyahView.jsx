import React from 'react';
import { toEasternArabic } from '../../data/quranMetadata';
import './AyahView.css';

/**
 * AyahView — Renders an individual ayah with its decorative verse marker
 */
export default function AyahView({
  ayah,
  isBookmarked = false,
  suppressBookmarkClickUntilRef,
  onBookmarkAyah,
  onToggleAutoScroll,
  fontSize = 22
}) {
  if (!ayah) return null;

  return (
    <span
      id={`ayah-${ayah.surah}-${ayah.ayah}`}
      className={`ayah-span ${isBookmarked ? 'is-bookmarked' : ''}`}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (onToggleAutoScroll) onToggleAutoScroll();
      }}
      title={`الآية ${ayah.ayah} من سورة رقم ${ayah.surah} — انقر مرتين للتنقل التلقائي`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <span className="ayah-text-content">{ayah.mainText}</span>
      {/* Decorative Ayah Rosette ۝ */}
      <span className={`ayah-rosette-wrap ${isBookmarked ? 'is-bookmarked' : ''}`} aria-label={`آية ${ayah.ayah}`}>
        <span className="rosette-symbol">۝</span>
        <button
          type="button"
          className="rosette-number"
          aria-label={`${isBookmarked ? 'إزالة علامة' : 'حفظ'} الآية ${ayah.ayah}`}
          aria-pressed={isBookmarked}
          title={isBookmarked ? 'إزالة العلامة المرجعية' : 'حفظ الآية'}
          onClick={(event) => {
            event.stopPropagation();
            if (Date.now() >= (suppressBookmarkClickUntilRef?.current || 0)) {
              onBookmarkAyah?.(ayah.surah, ayah.ayah, ayah.mainText);
            }
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >{toEasternArabic(ayah.ayah)}</button>
      </span>
      {' '}
    </span>
  );
}
