import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const beamPaths = [
  'M-100 175C125 60 285 54 480 145S820 275 1100 82',
  'M-120 285C124 181 312 132 520 218S842 340 1120 174',
  'M-80 390C144 275 342 226 575 296S880 410 1135 265',
];

export default function BackgroundBeams() {
  const reduceMotion = useReducedMotion();
  return (
    <svg className="aceternity-background-beams" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="landing-beam" x1="0" x2="1">
          <stop offset="0%" stopColor="#9c927d" stopOpacity="0" />
          <stop offset="50%" stopColor="#9c927d" stopOpacity=".38" />
          <stop offset="100%" stopColor="#727c84" stopOpacity="0" />
        </linearGradient>
      </defs>
      {beamPaths.map((path, index) => (
        <motion.path
          key={path}
          d={path}
          fill="none"
          stroke="url(#landing-beam)"
          strokeWidth="1.2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={reduceMotion ? { pathLength: 1, opacity: 0.42 } : { pathLength: [0, 1], opacity: [0, 0.5, 0] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 5.5 + index, repeat: Infinity, delay: index * 0.8, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}
