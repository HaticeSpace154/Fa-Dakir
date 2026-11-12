import React from 'react';
import { BookOpenText, Check, X } from 'lucide-react';
import AccessibleDialog from './ui/AccessibleDialog';
import { QURAN_RECITATIONS } from '../data/recitations';
import './RecitationModal.css';

export { QURAN_RECITATIONS };

export default function RecitationModal({ isOpen, onClose, value = 'warsh', onSelect }) {
  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="اختيار رواية المصحف" backdropClassName="recitation-overlay" popupClassName="recitation-dialog">
        <header className="recitation-head">
          <div><BookOpenText size={20} /><h2 id="recitation-title">اختيار رواية المصحف</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        </header>
        <p className="recitation-intro">اختر الرواية والخط. يتوفر نص ورش بخط مغربي أو بخط أميري عادي.</p>
        <div className="recitation-options" role="radiogroup" aria-label="رواية المصحف">
          {QURAN_RECITATIONS.map((option) => (
            <button key={option.id} type="button" role="radio" aria-checked={value === option.id} className={`recitation-option ${value === option.id ? 'is-selected' : ''}`} onClick={() => onSelect(option.id)}>
              <span className="recitation-option-copy"><strong>{option.name}</strong><small>{option.detail}</small></span>
              <span className="recitation-option-check">{value === option.id && <Check size={16} />}</span>
            </button>
          ))}
        </div>
        <small className="recitation-source-note">اختيار أحد خطّي ورش يغيّر شكل النص فقط، ولا يغيّر الرواية أو ترقيم الآيات.</small>
    </AccessibleDialog>
  );
}
