import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { applyAppVersionGate } from './services/appVersion';
import './style.css';
import App from './App.jsx';
import Landing from './pages/Landing.jsx';

const isReaderRoute = window.location.pathname.replace(/\/$/, '') === '/reader';
const showReader = Capacitor.isNativePlatform() || isReaderRoute;

// Wait for the freshness gate so a deploy detected here does a one-time reload before
// any reader state boots. The gate preserves the ~250 MB offline Quran cache.
applyAppVersionGate().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {showReader ? <App /> : <Landing />}
    </StrictMode>,
  );
});
