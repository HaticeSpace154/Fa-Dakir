import React from 'react';
import ShinyText from '../react-bits/ShinyText';
import { toEasternArabic } from '../../data/quranMetadata';
import './SurahHeader.css';

/**
 * SurahHeader — Sacred ornate header for each Surah
 */
export default function SurahHeader({ surah }) {
  if (!surah) return null;
  const isTawbah = surah.number === 9;

  return (
    <div className="surah-header-container" dir="rtl">
      {/* Decorative Golden Plaque Frame */}
      <div className="surah-plaque-frame">
        <div className="plaque-corner top-right" />
        <div className="plaque-corner top-left" />
        <div className="plaque-corner bottom-right" />
        <div className="plaque-corner bottom-left" />

        <div className="plaque-content">
          <div className="surah-type-badge">
            <span>{surah.type || (surah.number > 2 ? 'مكية' : 'مدنية')}</span>
          </div>

          <div className="surah-title-center">
            <ShinyText
              text={`سُورَةُ ${surah.nameAr || surah.name}`}
              speed={4}
              color="var(--gold)"
              className="surah-plaque-title"
            />
          </div>

          <div className="surah-ayahs-badge">
            <span>{toEasternArabic(surah.ayahs?.length || surah.ayahCount || 7)} آيَاتُهَا</span>
          </div>
        </div>
      </div>

      {/* Basmalah Ornament (Except for Surah At-Tawbah #9) */}
      {!isTawbah && (
        <div className="basmalah-ornament-wrap">
          <span className="basmalah-text">
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
          </span>
        </div>
      )}
    </div>
  );
}
