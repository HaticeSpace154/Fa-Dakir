import React from 'react';
import { motion } from 'motion/react';
import './AppSplash.css';

export default function AppSplash() {
  return (
    <motion.div className="app-splash" aria-hidden="true" initial={{ opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.36, ease: 'easeOut' }}>
      <div className="app-splash-glow" />
      <div className="app-splash-emblem">
        <span className="app-splash-orbit app-splash-orbit-one" />
        <span className="app-splash-orbit app-splash-orbit-two" />
        <img className="app-splash-mark" src="/branding/splash-mark.png" alt="" />
      </div>
      <div className="app-splash-loader"><i /></div>
    </motion.div>
  );
}
