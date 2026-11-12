import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export default function MovingBorderLink({ href, children, className = '', ...props }) {
  const reduceMotion = useReducedMotion();
  return (
    <a href={href} className={`aceternity-moving-border ${className}`} {...props}>
      <motion.span
        className="aceternity-moving-border-glow"
        aria-hidden="true"
        animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 7, repeat: Infinity, ease: 'linear' }}
      />
      <span className="aceternity-moving-border-content">{children}</span>
    </a>
  );
}
