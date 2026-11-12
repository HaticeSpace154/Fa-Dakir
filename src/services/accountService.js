import { firebaseConfig } from './firebaseConfig';
import { Capacitor, registerPlugin } from '@capacitor/core';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_NAME = 'fa-dakir-backup.json';
const AUTH_SESSION_KEY = 'quranWarsh.firebaseSession';
const NativeGoogleAuth = registerPlugin('GoogleAuth');

export function getAccountConfiguration() {
  return {
    firebaseConfigured: Boolean(firebaseConfig.apiKey && firebaseConfig.projectId),
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '',
  };
}

function getFirebaseError(payload, fallback) {
  const code = payload?.error?.message || '';
  const messages = {
    EMAIL_EXISTS: 'يوجد حساب مسجل بهذا البريد الإلكتروني.',
    EMAIL_NOT_FOUND: 'لم يُعثر على حساب بهذا البريد.',
    INVALID_PASSWORD: 'كلمة المرور غير صحيحة.',
    INVALID_LOGIN_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    USER_DISABLED: 'تم إيقاف هذا الحساب.',
    WEAK_PASSWORD: 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.',
    OPERATION_NOT_ALLOWED: 'فعّل مزوّد Google في Firebase Authentication ثم أعد المحاولة.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.',
    PROJECT_NOT_FOUND: 'تعذر العثور على مشروع Firebase المحدد.',
    INVALID_API_KEY: 'مفتاح Firebase غير صالح.',
  };
  return messages[code] || payload?.error?.message || fallback;
}

function persistAuthSession(payload) {
  const session = {
    uid: payload.localId || payload.user_id,
    email: payload.email || '',
    idToken: payload.idToken || payload.id_token || payload.access_token,
    refreshToken: payload.refreshToken || payload.refresh_token,
    expiresAt: Date.now() + Math.max(0, Number(payload.expiresIn || payload.expires_in) || 3600) * 1000,
  };
  if (!session.uid || !session.idToken || !session.refreshToken) throw new Error('لم يُرجع Firebase جلسة صالحة.');
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getFirebaseSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
    return session?.uid && session?.idToken && session?.refreshToken ? session : null;
  } catch {
    return null;
  }
}

export async function authenticateWithEmail({ email, password, mode }) {
  const action = mode === 'signup' ? 'signUp' : 'signInWithPassword';
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getFirebaseError(payload, 'تعذر تسجيل الدخول إلى Firebase.'));
  return persistAuthSession(payload);
}

function requestGoogleAccessToken(scope) {
  const { googleClientId } = getAccountConfiguration();
  if (!googleClientId) throw new Error('أضف OAuth Web Client ID إلى VITE_GOOGLE_CLIENT_ID.');
  return loadGoogleIdentity().then((google) => new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope,
      callback: (token) => token.error ? reject(new Error(token.error_description || token.error)) : resolve(token.access_token),
      error_callback: (error) => reject(new Error(error.message || 'تعذر التفويض من Google.')),
    });
    client.requestAccessToken({ prompt: 'consent' });
  }));
}

export async function authenticateWithGoogle() {
  let idToken;
  let accessToken;
  if (Capacitor.getPlatform() === 'android') {
    const credential = await NativeGoogleAuth.signIn();
    idToken = credential.idToken;
  } else {
    accessToken = await requestGoogleAccessToken('openid email profile');
  }
  const postBody = new URLSearchParams({
    providerId: 'google.com',
    ...(idToken ? { id_token: idToken } : { access_token: accessToken }),
  });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: postBody.toString(),
      requestUri: `https://${firebaseConfig.authDomain}`,
      returnSecureToken: true,
      returnIdpCredential: true,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getFirebaseError(payload, 'تعذر تسجيل الدخول باستخدام Google.'));
  return persistAuthSession(payload);
}

export async function sendFirebasePasswordReset(email) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: email.trim() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getFirebaseError(payload, 'تعذر إرسال رسالة إعادة تعيين كلمة المرور.'));
}

export function signOutFirebase() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export async function refreshFirebaseSession() {
  const session = getFirebaseSession();
  if (!session) throw new Error('لا يوجد حساب مسجل الدخول.');
  if (session.expiresAt > Date.now() + 60_000) return session;

  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refreshToken });
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    signOutFirebase();
    throw new Error(getFirebaseError(payload, 'انتهت جلسة الدخول. سجّل الدخول مجددًا.'));
  }
  return persistAuthSession(payload);
}

function collectAppData() {
  const localData = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('quranWarsh.') && key !== AUTH_SESSION_KEY) localData[key] = localStorage.getItem(key);
  }
  return { schemaVersion: 1, app: 'تلاوة و ختم | Fa-dakir', savedAt: new Date().toISOString(), localData };
}

function parseBackup(payload) {
  const backup = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!backup || typeof backup !== 'object' || !backup.localData || typeof backup.localData !== 'object' || Array.isArray(backup.localData)) {
    throw new Error('ملف النسخة الاحتياطية غير صالح.');
  }
  return backup;
}

export function restoreBackupToDevice(payload) {
  const backup = parseBackup(payload);
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('quranWarsh.') && key !== AUTH_SESSION_KEY) localStorage.removeItem(key);
  }
  Object.entries(backup.localData).forEach(([key, value]) => {
    if (key.startsWith('quranWarsh.') && key !== AUTH_SESSION_KEY && typeof value === 'string') localStorage.setItem(key, value);
  });
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true });
      existing.addEventListener('error', () => reject(new Error('تعذر تحميل تسجيل الدخول من Google.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('تعذر تحميل تسجيل الدخول من Google.'));
    document.head.appendChild(script);
  });
}

export async function requestGoogleDriveAccess() {
  if (Capacitor.getPlatform() === 'android') {
    try {
      const result = await NativeGoogleAuth.requestDriveAccess();
      return result.accessToken;
    } catch (error) {
      throw new Error(error.message || 'تعذر تفويض Google Drive. تأكد من تفعيل Google Drive API وإعداد OAuth لتطبيق Android.');
    }
  }
  const { googleClientId } = getAccountConfiguration();
  if (!googleClientId) throw new Error('Google Drive يحتاج إلى OAuth Web Client ID في VITE_GOOGLE_CLIENT_ID.');
  return requestGoogleAccessToken(DRIVE_SCOPE);
}

async function findDriveBackup(accessToken) {
  const query = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${BACKUP_NAME}' and trashed=false`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: '1',
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error('تعذر العثور على نسخة Google Drive. تحقق من تفعيل Drive API.');
  return (await response.json()).files?.[0] || null;
}

export async function saveBackupToGoogleDrive(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const existing = await findDriveBackup(accessToken);
  const body = JSON.stringify(collectAppData(), null, 2);
  if (existing?.id) {
    const updated = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body,
    });
    if (!updated.ok) throw new Error('تعذر تحديث نسخة Google Drive.');
    return;
  }
  const boundary = `faDakir${crypto.randomUUID().replaceAll('-', '')}`;
  const metadata = JSON.stringify({ name: BACKUP_NAME, parents: ['appDataFolder'], mimeType: 'application/json' });
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const created = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { ...headers, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
  });
  if (!created.ok) throw new Error('تعذر إنشاء النسخة في Google Drive.');
}

export async function getBackupFromGoogleDrive(accessToken) {
  const backupFile = await findDriveBackup(accessToken);
  if (!backupFile?.id) throw new Error('لا توجد نسخة احتياطية في Google Drive لهذا الحساب.');
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(backupFile.id)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('تعذر تنزيل نسخة Google Drive.');
  return parseBackup(await response.json());
}

async function deleteGoogleDriveBackup(accessToken) {
  const backupFile = await findDriveBackup(accessToken);
  if (!backupFile?.id) return;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(backupFile.id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('تعذر حذف النسخة الاحتياطية من Google Drive.');
}

export async function deleteAccountAndAppData(googleAccessToken) {
  const session = getFirebaseSession();
  if (!session?.idToken) throw new Error('سجّل الدخول قبل حذف الحساب.');
  await deleteGoogleDriveBackup(googleAccessToken);
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: session.idToken }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getFirebaseError(payload, 'تعذر حذف الحساب. أعد تسجيل الدخول ثم حاول مجددًا.'));
  signOutFirebase();
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('quranWarsh.')) localStorage.removeItem(key);
  }
}
