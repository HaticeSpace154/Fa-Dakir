import React, { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { getReadPages } from '../services/focusLockService';
import { toEasternArabic } from '../data/quranMetadata';

const HOLD_MS = 3000;

// Status pill shown while the focus lock is on. The only way out before the goal is met is a deliberate 3-second hold.
export default function FocusLockBanner({ lock, khatma, onRelease }) {
  const [now, setNow] = useState(Date.now());
  const [holding, setHolding] = useState(false);
  const holdRef = useRef(null);

  useEffect(() => {
    if (lock?.mode !== 'countdown') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lock?.mode]);

  useEffect(() => () => clearTimeout(holdRef.current), []);
  if (!lock) return null;

  let label;
  if (lock.mode === 'countdown') {
    const left = Math.max(0, Math.ceil(((lock.endsAt || 0) - now) / 1000));
    const h = Math.floor(left / 3600);
    const mm = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    label = `متبقٍّ ${toEasternArabic(h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`)}`;
  } else if (lock.mode === 'custom') {
    label = lock.name || 'الورد المخصص';
  } else {
    const remaining = Math.max(0, (lock.targetPage || 604) - getReadPages(khatma));
    label = `متبقٍّ ${toEasternArabic(remaining)} صفحة`;
  }

  const begin = () => { setHolding(true); holdRef.current = setTimeout(() => { setHolding(false); onRelease?.(); }, HOLD_MS); };
  const cancel = () => { setHolding(false); clearTimeout(holdRef.current); };

  return (
    <div className="focus-lock-banner" role="status" dir="rtl">
      <Lock size={14} />
      <span>وضع التركيز · {label}</span>
      <button type="button" className={`focus-lock-release ${holding ? 'is-holding' : ''}`} onPointerDown={begin} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} title="اضغط مطولًا ٣ ثوانٍ للخروج">
        <i /><span style={{ position: 'relative' }}>{holding ? 'استمر…' : 'خروج'}</span>
      </button>
    </div>
  );
}
