import React, { useState } from 'react';
import { Hourglass, Minus, Play, Plus, Square, X } from 'lucide-react';
import AccessibleDialog from './ui/AccessibleDialog';
import { getStoredAutoScrollMinutes, setStoredAutoScrollMinutes } from '../services/storageService';
import './AutoScrollTimerModal.css';

const PRESETS = [5, 10, 15, 20, 30, 45, 60];
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const STEP = 5;

const clampMinutes = (value) => Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(Number(value) || MIN_MINUTES)));

// Arabic number agreement: دقيقة / دقيقتان / ٣–١٠ دقائق / ١١+ دقيقة
function formatMinutes(count) {
  if (count === 1) return 'دقيقة واحدة';
  if (count === 2) return 'دقيقتان';
  return count <= 10 ? `${count} دقائق` : `${count} دقيقة`;
}

export default function AutoScrollTimerModal({ isOpen, onClose, activeMinutes = 0, onStart, onStop }) {
  const [text, setText] = useState(() => String(activeMinutes || getStoredAutoScrollMinutes()));
  const minutes = clampMinutes(text);

  const handleStart = () => {
    setStoredAutoScrollMinutes(minutes);
    onStart?.(minutes);
    onClose?.();
  };

  const handleStop = () => {
    onStop?.();
    onClose?.();
  };

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="مؤقت التمرير التلقائي" backdropClassName="scroll-timer-overlay" popupClassName="scroll-timer-dialog">
      <header className="scroll-timer-head">
        <div><Hourglass size={20} /><h2>مؤقت التمرير التلقائي</h2></div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
      </header>
      <p className="scroll-timer-intro">اختر المدة التي تريد أن تُقرأ فيها السورة، وتُضبط سرعة التمرير تلقائيًا لتصل إلى نهايتها مع انتهاء الوقت.</p>

      <div className="scroll-timer-presets" role="radiogroup" aria-label="مدة التمرير">
        {PRESETS.map((preset) => (
          <button key={preset} type="button" role="radio" aria-checked={minutes === preset} className={`scroll-timer-chip ${minutes === preset ? 'is-selected' : ''}`} onClick={() => setText(String(preset))}>
            {preset}<small>د</small>
          </button>
        ))}
      </div>

      <div className="scroll-timer-custom">
        <button type="button" onClick={() => setText(String(clampMinutes(minutes - STEP)))} disabled={minutes <= MIN_MINUTES} aria-label={`إنقاص ${STEP} دقائق`}><Minus size={17} /></button>
        <label className="scroll-timer-input">
          <input type="number" inputMode="numeric" min={MIN_MINUTES} max={MAX_MINUTES} value={text} onChange={(event) => setText(event.target.value)} onBlur={() => setText(String(minutes))} aria-label="عدد الدقائق" />
          <span>دقيقة</span>
        </label>
        <button type="button" onClick={() => setText(String(clampMinutes(minutes + STEP)))} disabled={minutes >= MAX_MINUTES} aria-label={`زيادة ${STEP} دقائق`}><Plus size={17} /></button>
      </div>

      <p className="scroll-timer-note">سيبدأ التمرير من موضعك الحالي حتى نهاية السورة خلال <strong>{formatMinutes(minutes)}</strong>. انقر مرتين على النص لإيقاف التمرير مؤقتًا أو استئنافه.</p>

      <div className="scroll-timer-actions">
        <button type="button" className="scroll-timer-start" onClick={handleStart}><Play size={16} fill="currentColor" />{activeMinutes > 0 ? 'تحديث المدة وإعادة البدء' : 'ابدأ التمرير'}</button>
        {activeMinutes > 0 && <button type="button" className="scroll-timer-stop" onClick={handleStop}><Square size={14} fill="currentColor" />إلغاء المؤقت</button>}
      </div>
    </AccessibleDialog>
  );
}
