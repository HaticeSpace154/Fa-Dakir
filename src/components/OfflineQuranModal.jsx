import React, { useEffect, useState } from 'react';
import { BookOpenText, Check, Download, HardDriveDownload, LoaderCircle, Trash2, X } from 'lucide-react';
import AccessibleDialog from './ui/AccessibleDialog';
import { QURAN_RECITATIONS } from '../data/recitations';
import { downloadQuranRecitation, getOfflineRecitationStatus, hasSvgArtwork, removeOfflineQuranRecitation } from '../services/quranData';
import './OfflineQuranModal.css';

export default function OfflineQuranModal({ isOpen, onClose, selectedRecitation = 'warsh' }) {
  const [status, setStatus] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const refreshStatus = async () => {
    setIsChecking(true);
    try {
      setStatus(await getOfflineRecitationStatus());
    } catch (checkError) {
      setError(checkError.message || 'تعذر فحص الملفات المحفوظة على هذا الجهاز.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    setError('');
    refreshStatus();
    return undefined;
  }, [isOpen]);

  const handleDownload = async (recitation) => {
    setBusyId(recitation);
    setProgress({ percent: 0, phase: 'text' });
    setError('');
    try {
      await downloadQuranRecitation(recitation, setProgress);
      await refreshStatus();
    } catch (downloadError) {
      setError(downloadError.message || 'تعذر تنزيل الرواية. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
    } finally {
      setBusyId('');
      setProgress(null);
    }
  };

  const handleRemove = async (recitation) => {
    try {
      await removeOfflineQuranRecitation(recitation);
      await refreshStatus();
    } catch (removeError) {
      setError(removeError.message || 'تعذر حذف النسخة المحفوظة.');
    }
  };

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="تنزيل القرآن للقراءة دون إنترنت" backdropClassName="offline-quran-overlay" popupClassName="offline-quran-dialog">
      <header className="offline-quran-header">
        <div><span className="offline-quran-icon"><HardDriveDownload size={19} /></span><div><h2>تنزيل القرآن</h2><p>زر واحد يحفظ الرواية وخطها، وللروايات المصوّرة جميع صفحات المصحف الـ604.</p></div></div>
        <button type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
      </header>

      <div className="offline-quran-list" aria-label="الروايات المتاحة للتنزيل">
        {QURAN_RECITATIONS.map((recitation) => {
          const saved = status[recitation.id] || {};
          const isReady = Boolean(saved.ready);
          const wantsSvg = hasSvgArtwork(recitation.id);
          const svgSaved = saved.svg === true;
          const svgCount = typeof saved.svgCount === 'number' ? saved.svgCount : 0;
          const hasPartial = Boolean(saved.data || saved.font || (wantsSvg && svgCount > 0));
          const isBusy = busyId === recitation.id;
          const percent = typeof progress?.percent === 'number' ? Math.round(progress.percent) : null;
          const phaseLabel = progress?.phase === 'text' ? 'النص' : progress?.phase === 'font' ? 'الخط' : progress?.phase === 'mushaf' ? 'المصحف المصوّر' : 'جارٍ التنزيل';
          return (
            <article className={`offline-quran-row ${recitation.id === selectedRecitation ? 'is-selected' : ''} ${isReady ? 'is-downloaded' : ''}`} key={recitation.id}>
              <div className="offline-quran-row-copy">
                <div className="offline-quran-row-title"><BookOpenText size={16} /><strong>{recitation.name}</strong>{recitation.id === selectedRecitation && <span className="offline-quran-current">المستخدمة</span>}</div>
                <small>{recitation.detail}{wantsSvg ? ' · يتضمن المصحف المصوّر' : ''}{wantsSvg && svgCount > 0 && !svgSaved ? ` · صفحات محفوظة: ${svgCount}/604` : ''}{hasPartial && !isReady ? ' · تنزيل جزئي' : ''}</small>
              </div>
              {isBusy ? (
                <span className="offline-quran-progress-label"><LoaderCircle size={16} className="offline-quran-spinner" />{percent === null ? phaseLabel : `${phaseLabel} ${percent}٪`}</span>
              ) : isReady ? (
                <button type="button" className="offline-quran-remove" onClick={() => handleRemove(recitation.id)} title="حذف النسخة المحفوظة" aria-label={`حذف ${recitation.name} من هذا الهاتف`}><Check size={15} /><Trash2 size={14} /></button>
              ) : (
                <button type="button" className="offline-quran-download" disabled={isChecking || Boolean(busyId)} onClick={() => handleDownload(recitation.id)} aria-label={`تنزيل ${recitation.name}`}><Download size={15} /><span>{hasPartial ? 'إكمال' : 'تنزيل'}</span></button>
              )}
              {isBusy && <div className="offline-quran-progress-track" aria-label={percent === null ? 'جارٍ التنزيل' : `اكتمل ${percent} بالمئة`}><span className={percent === null ? 'is-indeterminate' : ''} style={percent === null ? undefined : { width: `${percent}%` }} /></div>}
            </article>
          );
        })}
      </div>

      {error && <p className="offline-quran-error" role="alert">{error}</p>}
      <p className="offline-quran-note">سيتم حفظ نص الرواية وخطها{' — وللروايات المصوّرة صفحات المصحف الـ604 — '}على الهاتف فقط؛ صفحات المصحف المصوّرة تبلغ نحو 250 ميغابايت تقريبًا.</p>
    </AccessibleDialog>
  );
}
