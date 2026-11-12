import React from 'react';
import './ShinyText.css';

/**
 * ShinyText — React Bits component
 * Shimmering text with customizable speed and gradient glow.
 */
export default function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className = '',
  color = 'var(--gold)',
  children
}) {
  const content = text || children;
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{
        animationDuration,
        '--shiny-color': color,
      }}
    >
      {content}
    </span>
  );
}
