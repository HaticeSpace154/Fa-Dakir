import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isFocusLockedNow } from './services/focusLockService';
import Quran from './pages/Quran';
import AppSplash from './components/AppSplash';

export default function App() {
  const isLandingPreview = new URLSearchParams(window.location.search).has('landingPreview');
  const [showSplash, setShowSplash] = useState(() => !isLandingPreview);
  const [appTheme, setAppTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setAppTheme(document.documentElement.getAttribute('data-theme') || 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listener;
    CapacitorApp.addListener('backButton', () => {
      // Focus lock: swallow the back button until the chosen goal is done.
      try {
        const khatma = JSON.parse(localStorage.getItem('quranWarsh.khatma') || '{}');
        if (isFocusLockedNow(khatma)) { toast('وضع التركيز مفعّل — أتمم هدفك أولًا، أو اضغط مطولًا على «خروج».'); return; }
      } catch { /* fall through */ }
      const fullModeReader = document.querySelector('.quran-pure-app.is-full-mode.is-native-app');
      if (fullModeReader) {
        window.dispatchEvent(new Event('reader:exit-full-mode'));
        return;
      }
      CapacitorApp.exitApp();
    }).then((h) => {
      listener = h;
    });
    return () => listener?.remove();
  }, []);

  return (
    <>
      <Quran />
      <Toaster position="top-center" theme={appTheme === 'dark' || appTheme === 'pigeon-blue' || appTheme === 'graphite' ? 'dark' : 'light'} dir="rtl" richColors closeButton />
      <AnimatePresence>
        {showSplash && <AppSplash key="app-splash" />}
      </AnimatePresence>
    </>
  );
}
