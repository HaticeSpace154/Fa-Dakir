import React from 'react';
import './Aurora.css';

/**
 * Aurora — React Bits component
 * Subtle, serene ambient lighting beams that evoke spiritual tranquility.
 */
export default function Aurora({
  colorStops = ['#1b4332', 'var(--gold)', '#0f2027'],
  amplitude = 1.0,
  className = ''
}) {
  return (
    <div className={`aurora-container ${className}`} aria-hidden="true">
      <div
        className="aurora-beam beam-1"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${colorStops[0]} 0%, transparent 70%)`,
          opacity: 0.15 * amplitude,
        }}
      />
      <div
        className="aurora-beam beam-2"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${colorStops[1]} 0%, transparent 65%)`,
          opacity: 0.12 * amplitude,
        }}
      />
      <div
        className="aurora-beam beam-3"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${colorStops[2] || colorStops[0]} 0%, transparent 70%)`,
          opacity: 0.10 * amplitude,
        }}
      />
    </div>
  );
}
