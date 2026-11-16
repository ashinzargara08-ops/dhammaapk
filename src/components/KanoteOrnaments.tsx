import React, { useState } from 'react';
import { resolveApiUrl } from '../lib/apiUrl';

export function KanoteCorner({
  position = 'tl',
  className = '',
}: {
  position?: 'tl' | 'tr' | 'bl' | 'br';
  className?: string;
}) {
  const transformMap = {
    tl: '',
    tr: 'scale(-1, 1)',
    bl: 'scale(1, -1)',
    br: 'scale(-1, -1)',
  };

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ transform: transformMap[position] }}
    >
      <path
        d="M3 46V14C3 7.925 7.925 3 14 3H46"
        stroke="url(#kanoteGold)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 38V16C8 11.582 11.582 8 16 8H38"
        stroke="url(#kanoteGold)"
        strokeWidth="0.9"
        strokeOpacity="0.65"
        strokeLinecap="round"
      />
      <path
        d="M11 26C11 17 17 11 26 11C21 15 19 20 22 24C18 22 14 23 11 26Z"
        fill="url(#kanoteGold)"
        fillOpacity="0.25"
        stroke="url(#kanoteGold)"
        strokeWidth="1"
      />
      <circle cx="14" cy="14" r="2.2" fill="#E8C96A" />
      <path
        d="M27 7C31 7 34 4 38 4M7 27C7 31 4 34 4 38"
        stroke="#E8C96A"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <defs>
        <linearGradient id="kanoteGold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8C96A" />
          <stop offset="0.55" stopColor="#C9A227" />
          <stop offset="1" stopColor="#8C6D16" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function KanoteDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A227]/45 to-[#C9A227]/80" />
      <svg viewBox="0 0 48 20" className="w-11 h-4 shrink-0" fill="none">
        <path
          d="M24 2C26.5 6.5 31 9 36 10C31 11 26.5 13.5 24 18C21.5 13.5 17 11 12 10C17 9 21.5 6.5 24 2Z"
          fill="#C9A227"
          fillOpacity="0.22"
          stroke="#E8C96A"
          strokeWidth="1.2"
        />
        <circle cx="24" cy="10" r="2" fill="#E8C96A" />
        <path d="M2 10H10M38 10H46" stroke="#C9A227" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A227]/45 to-[#C9A227]/80" />
    </div>
  );
}

export function SafeArtwork({
  src,
  alt,
  className = '',
  fallbackTitle,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src ? resolveApiUrl(src) : '';

  if (!resolvedSrc || failed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#063B2B] via-[#0B120E] to-[#050505] border border-[#C9A227]/30 ${className}`}
      >
        <svg viewBox="0 0 64 64" className="w-10 h-10 text-[#C9A227]/75" fill="none" aria-hidden="true">
          <path
            d="M32 10C36 18 42 24 42 32C42 38 37.5 43 32 43C26.5 43 22 38 22 32C22 24 28 18 32 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M16 34C21 34 26 38 28 44C21 44 16 40 16 34ZM48 34C43 34 38 38 36 44C43 44 48 40 48 34Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path d="M18 49H46" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {fallbackTitle && (
          <span className="mt-1.5 px-2 text-[10px] text-[#E8C96A]/80 text-center line-clamp-1">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
