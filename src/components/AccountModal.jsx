import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Cloud, CloudDownload, CloudUpload, LogIn, LogOut, X } from 'lucide-react';
import { toast } from 'sonner';
import AccessibleDialog from './ui/AccessibleDialog';
import {
  authenticateWithGoogle,
  deleteAccountAndAppData,
  getAccountConfiguration,
  getBackupFromGoogleDrive,
  getFirebaseSession,
  refreshFirebaseSession,
  requestGoogleDriveAccess,
  restoreBackupToDevice,
  saveBackupToGoogleDrive,
  signOutFirebase,
} from '../services/accountService';
import './AccountModal.css';

export default function AccountModal({ isOpen, onClose }) {
  const [busy, setBusy] = useState(false);
  const [googleToken, setGoogleToken] = useState('');
  const [session, setSession] = useState(getFirebaseSession);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const config = getAccountConfiguration();

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const currentSession = getFirebaseSession();
    setSession(currentSession);
    if (!currentSession) setPoliciesAccepted(false);
    if (currentSession) {
      refreshFirebaseSession()
        .then((freshSession) => { if (active) setSession(freshSession); })
        .catch(() => { if (active) setSession(null); });
    }
    return () => { active = false; };
  }, [isOpen]);

  const run = async (task) => {
    setBusy(true);
    try { await task(); } catch (error) { toast.error(error.message || 'حدث خطأ.'); }
    finally { setBusy(false); }
  };

  const handleGoogleAuth = () => {
    run(async () => {
      const authenticatedSession = await authenticateWithGoogle();
      setSession(authenticatedSession);
      toast.success('تم تسجيل الدخول إلى Firebase. جارٍ طلب إذن Google Drive…');
      try {
        const token = await requestGoogleDriveAccess();
        setGoogleToken(token);
        toast.success('أصبح النسخ الاحتياطي والاستعادة على Google Drive جاهزين.');
      } catch (error) {
        toast.error(`تم تسجيل الدخول، لكن تعذر تفعيل Google Drive: ${error.message}`);
      }
    });
  };

  const backup = () => run(async () => {
    const token = googleToken || await requestGoogleDriveAccess();
    setGoogleToken(token);
    await saveBackupToGoogleDrive(token);
    toast.success('تم حفظ نسخة بياناتك على Google Drive.');
  });

  const restore = (getBackup, sourceName) => run(async () => {
    const backupData = await getBackup();
    setConfirmation({
      title: 'استعادة النسخة الاحتياطية؟',
      description: 'ستحل النسخة محل بيانات التطبيق المحفوظة على هذا الجهاز.',
      actionLabel: 'استعادة النسخة',
      onConfirm: () => {
        restoreBackupToDevice(backupData);
        toast.success(`تمت استعادة بياناتك من ${sourceName}. جارٍ تحديث التطبيق…`);
        window.setTimeout(() => window.location.reload(), 450);
      },
    });
  });

  const restoreDrive = () => restore(async () => {
    const token = googleToken || await requestGoogleDriveAccess();
    setGoogleToken(token);
    return getBackupFromGoogleDrive(token);
  }, 'Google Drive');

  const deleteAccount = () => setConfirmation({
    title: 'حذف الحساب والبيانات؟',
    description: 'سيُحذف حسابك ونسخة Google Drive وبيانات القراءة المحلية. لا يمكن التراجع عن هذه العملية.',
    actionLabel: 'حذف نهائي',
    destructive: true,
    onConfirm: () => run(async () => {
      const token = googleToken || await requestGoogleDriveAccess();
      await deleteAccountAndAppData(token);
      setGoogleToken('');
      setSession(null);
      toast.success('تم حذف الحساب والنسخة الاحتياطية والبيانات المحلية.');
      window.setTimeout(() => window.location.reload(), 700);
    }),
  });

  return (
    <>
    <AccessibleDialog open={isOpen} onClose={onClose} label="تسجيل الدخول والنسخ الاحتياطي" backdropClassName="account-overlay" popupClassName="account-dialog reactbits-ambient-surface">
        <header className="account-header">
          <div><span className="account-eyebrow">حسابك وبياناتك</span><h2 id="account-title">تسجيل الدخول والنسخ الاحتياطي</h2></div>
          <button type="button" className="account-close" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        </header>
        <div className="account-body">
          {session ? (
            <>
              <div className="account-user-card">
                <div><strong>{session.email}</strong><small>مسجل الدخول بحساب Firebase</small></div>
                <button type="button" className="account-secondary account-signout" onClick={() => { signOutFirebase(); setSession(null); setGoogleToken(''); setPoliciesAccepted(false); toast.success('تم تسجيل الخروج.'); }}><LogOut size={15} /> خروج</button>
              </div>
              <button type="button" className="account-delete-btn" onClick={deleteAccount} disabled={busy}><AlertTriangle size={15} /> حذف الحساب والبيانات</button>
            </>
          ) : (
            <>
              <div className="account-google-auth">
                <p>سجّل الدخول أو أنشئ حساب Firebase باستخدام حساب Google.</p>
                <label className="account-policy-consent">
                  <input type="checkbox" checked={policiesAccepted} onChange={(event) => setPoliciesAccepted(event.target.checked)} />
                  <span>أوافق على <a href="/privacy-policy.html" target="_blank" rel="noreferrer">سياسة الخصوصية</a> و<a href="/terms-of-service.html" target="_blank" rel="noreferrer">شروط الاستخدام</a>.</span>
                </label>
                <button type="button" className="account-primary" onClick={handleGoogleAuth} disabled={busy || !policiesAccepted || !config.firebaseConfigured}><LogIn size={17} />{busy ? 'جارٍ الاتصال…' : 'المتابعة باستخدام Google'}</button>
                {!config.firebaseConfigured && <p className="account-hint">إعداد Firebase غير مكتمل.</p>}
              </div>
            </>
          )}
          {session && <>
          <div className="account-separator"><span>النسخ الاحتياطي والاستعادة</span></div>
          <div className={`drive-card ${googleToken ? 'is-connected' : ''}`}>
            <div className="drive-card-head">
              <span className="drive-icon-wrap"><Cloud size={22} /></span>
              <div className="drive-copy"><strong>نسخة احتياطية على Google Drive</strong><small>احفظ علاماتك وختماتك وإعداداتك بأمان</small></div>
              <span className={`drive-status ${googleToken ? 'is-connected' : ''}`}>{googleToken ? <><Check size={12} /> متصل</> : 'غير مرتبط'}</span>
            </div>
            <div className="drive-actions">
              <button type="button" className="account-primary drive-action" onClick={backup} disabled={busy}><CloudUpload size={17} />{busy ? 'جارٍ التنفيذ…' : 'حفظ نسخة'}</button>
              <button type="button" className="account-secondary drive-action drive-restore-action" onClick={restoreDrive} disabled={busy}><CloudDownload size={17} />استعادة نسخة</button>
            </div>
          </div>
          </>}
          <nav className="account-legal-links" aria-label="المعلومات القانونية">
            <a href="/privacy-policy.html">سياسة الخصوصية</a>
            <span aria-hidden="true">·</span>
            <a href="/terms-of-service.html">شروط الاستخدام</a>
            <span aria-hidden="true">·</span>
            <a href="/account-deletion.html">حذف الحساب</a>
          </nav>
        </div>
      {confirmation && (
        <AccessibleDialog
          open
          onClose={() => setConfirmation(null)}
          label={confirmation.title}
          backdropClassName="account-confirm-overlay"
          viewportClassName="is-confirmation"
          popupClassName="account-confirm-dialog"
        >
          <h3>{confirmation.title}</h3>
          <p>{confirmation.description}</p>
          <div className="account-confirm-actions">
            <button type="button" className="account-secondary" onClick={() => setConfirmation(null)}>إلغاء</button>
            <button type="button" className={`account-primary ${confirmation.destructive ? 'is-destructive' : ''}`} onClick={() => {
              const { onConfirm } = confirmation;
              setConfirmation(null);
              onConfirm?.();
            }}>{confirmation.actionLabel || 'تأكيد'}</button>
          </div>
        </AccessibleDialog>
      )}
    </AccessibleDialog>
    </>
  );
}
