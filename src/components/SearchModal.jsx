import React, { useState } from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import AccessibleDialog from './ui/AccessibleDialog';
import SpotlightCard from './react-bits/SpotlightCard';
import { searchAyahs } from '../services/quranData';
import { toEasternArabic } from '../data/quranMetadata';
import './SearchModal.css';

/**
 * SearchModal — Instant full-text search across all 6,214 Ayahs
 */
export default function SearchModal({
  isOpen,
  onClose,
  onSelectResult,
  recitation = 'warsh'
}) {
  const [query, setQuery] = useState('');
  const results = query.trim().length >= 2 ? searchAyahs(query, 30, recitation) : [];

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="البحث في آيات القرآن الكريم" backdropClassName="search-modal-overlay" viewportClassName="is-top-aligned" popupClassName="search-modal-box reactbits-ambient-surface">
        {/* Header */}
        <div className="search-modal-head">
          <div className="search-input-wrapper">
            <Search size={20} className="search-head-icon" />
            <input
              type="text"
              className="search-head-input"
              placeholder="اكتب كلمة أو آية للبحث في القرآن كاملاً…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        {/* Results Body */}
        <div className="search-modal-body">
          {query.trim().length < 2 ? (
            <div className="search-placeholder">
              <Search size={36} className="placeholder-icon" />
              <p>اكتب حرفين على الأقل للبحث السريع في المصحف الشريف</p>
            </div>
          ) : results.length === 0 ? (
            <div className="search-placeholder">
              <p>لم يتم العثور على آيات تطابق «{query}»</p>
            </div>
          ) : (
            <div className="search-results-list">
              <div className="results-count-banner">
                <span>تم العثور على {toEasternArabic(results.length)} نتيجة:</span>
              </div>
              {results.map((res, idx) => (
                <SpotlightCard
                  key={idx}
                  className="search-result-card"
                  onClick={() => {
                    onSelectResult(res.surah, res.ayah);
                    onClose();
                  }}
                >
                  <div className="result-card-header">
                    <div className="result-surah-info">
                      <BookOpen size={16} className="gold-icon" />
                      <strong>سورة {res.surahName}</strong>
                      <span className="dot">•</span>
                      <span>الآية {toEasternArabic(res.ayah)}</span>
                      <span className="dot">•</span>
                      <span>صفحة {toEasternArabic(res.page)}</span>
                    </div>
                  </div>
                  <p className="result-ayah-text">{res.text}</p>
                </SpotlightCard>
              ))}
            </div>
          )}
        </div>
    </AccessibleDialog>
  );
}
