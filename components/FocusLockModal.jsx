import React, { useState } from 'react';
import { BookOpenCheck, Hourglass, ListChecks, Lock, Minus, Plus, X } from 'lucide-react';
import AccessibleDialog from './ui/AccessibleDialog';
import { getTodayWirdEndPage, getReadPages } from '../services/focusLockService';
import { getCustomWirds } from '../services/storageService';
import { toEasternArabic } from '../data/quranMetadata';
import './FocusLockModal.css';

const PRESETS = [10, 15, 20, 30, 45, 60];
const DEFAULT_MINUTES = 20;
const clamp = (v) => Math.max(1, Math.min(180, Math.round(Number(v) || 1)));

export default function FocusLockModal({ isOpen, onClose, khatma, onStart }) {
  const savedWirds = getCustomWirds();
  const [mode, setMode] = useState('wird');
  const [minutesText, setMinutesText] = useState(String(DEFAULT_MINUTES));
  const [customId, setCustomId] = useState(savedWirds[0]?.id || '');
  const minutes = clamp(minutesText);
  const readPages = getReadPages(khatma);
  const wirdEnd = getTodayWirdEndPage(khatma);
  const wirdDone = readPages >= wirdEnd;
  const selectedWird = savedWirds.find((w) => w.id === customId);
  const disabled = (mode === 'wird' && wirdDone) || (mode === 'custom' && !selectedWird);

  const start = () => {
    if (disabled) return;
    const base = { mode, startedAt: Date.now() };
    if (mode === 'countdown') onStart({ ...base, minutes, endsAt: Date.now() + minutes * 60000 });
    else if (mode === 'wird') onStart({ ...base, targetPage: wirdEnd });
    else {
      const sequence = selectedWird.surahs.flatMap(({ surah, repeats }) => Array.from({ length: repeats }, () => surah));
      onStart({ ...base, wirdId: selectedWird.id, name: selectedWird.name }, sequence);
    }
    onClose?.();
  };

  const options = [
    { id: 'wird', icon: BookOpenCheck, title: 'حتى أنهي ورد اليوم', sub: wirdDone ? 'ورد اليوم مكتمل بالفعل' : `حتى الصفحة ${toEasternArabic(wirdEnd)}` },
    { id: 'custom', icon: ListChecks, title: 'حتى أنهي وردي المخصص', sub: savedWirds.length ? 'اختر أحد أوردتك المحفوظة' : 'لا يوجد ورد مخصص محفوظ بعد' },
    { id: 'countdown', icon: Hourglass, title: 'حتى ينتهي العدّ التنازلي', sub: 'اكتب المدة أو اختر مدة جاهزة' },
  ];

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="وضع التركيز" backdropClassName="focus-lock-overlay" popupClassName="focus-lock-dialog">
      <header className="focus-lock-head">
        <div><Lock size={20} /><h2>وضع التركيز</h2></div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
      </header>
      <p className="focus-lock-intro">اختياري: اختر هدفًا، وسيمنعك التطبيق من الخروج حتى تُتمّه.</p>
      <div className="focus-lock-options" role="radiogroup">
        {options.map(({ id, icon: Icon, title, sub }) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} className={`focus-lock-option ${mode === id ? 'is-selected' : ''}`} onClick={() => setMode(id)} disabled={id === 'custom' && !savedWirds.length}>
            <Icon size={20} /><span><strong>{title}</strong><small>{sub}</small></span>
          </button>
        ))}
      </div>
      {mode === 'custom' && savedWirds.length > 0 && (
        <div className="focus-lock-wirds">
          {savedWirds.map((w) => (
            <button key={w.id} type="button" className={w.id === customId ? 'is-selected' : ''} onClick={() => setCustomId(w.id)}>{w.name}</button>
          ))}
        </div>
      )}
      {mode === 'countdown' && (
        <>
          <div className="focus-lock-stepper">
            <button type="button" onClick={() => setMinutesText(String(clamp(minutes - 5)))} aria-label="إنقاص"><Minus size={16} /></button>
            <input type="number" inputMode="numeric" min="1" max="180" value={minutesText} onChange={(e) => setMinutesText(e.target.value)} onBlur={() => setMinutesText(String(minutes))} aria-label="عدد الدقائق" />
            <span>دقيقة</span>
            <button type="button" onClick={() => setMinutesText(String(clamp(minutes + 5)))} aria-label="زيادة"><Plus size={16} /></button>
          </div>
          <div className="focus-lock-presets">
            {PRESETS.map((m) => (
              <button key={m} type="button" className={m === minutes ? 'is-selected' : ''} onClick={() => setMinutesText(String(m))}>{toEasternArabic(m)} د</button>
            ))}
          </div>
        </>
      )}
      <div className="focus-lock-actions">
        <button type="button" className="focus-lock-start" onClick={start} disabled={disabled}><Lock size={16} /> تفعيل القفل</button>
        <button type="button" className="focus-lock-cancel" onClick={onClose}>إلغاء</button>
      </div>
    </AccessibleDialog>
  );
}
