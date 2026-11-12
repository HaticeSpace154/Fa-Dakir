import React, { useRef, useState } from 'react';
import './SpotlightCard.css';

/**
 * SpotlightCard — React Bits component
 * A card that casts a cursor/touch-following radial spotlight on hover/move.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'color-mix(in srgb, var(--gold) 15%, transparent)',
  onClick,
  active = false,
  ...props
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`spotlight-card ${active ? 'is-active' : ''} ${className}`}
      {...props}
    >
      <div
        className="spotlight-card-glow"
        style={{
          opacity,
          background: `radial-gradient(280px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 75%)`,
        }}
      />
      <div className="spotlight-card-content">{children}</div>
    </div>
  );
}
