import React from 'react';

export default function MarkIcon({ symbol, sizeClass = '' }) {
  if (symbol === 'X') {
    return (
      <svg
        className={`mark-svg mark-x ${sizeClass}`}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <line x1="22" y1="22" x2="78" y2="78" />
        <line x1="78" y1="22" x2="22" y2="78" />
      </svg>
    );
  }
  if (symbol === 'O') {
    return (
      <svg
        className={`mark-svg mark-o ${sizeClass}`}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="30" />
      </svg>
    );
  }
  return null;
}
