/**
 * components/shareButtons.tsx
 * Social sharing component - PROPER CASE (lowercase)
 * No external dependencies
 */

'use client';

import React from 'react';

export interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function shareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={handleCopy}
        className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)] transition"
      >
        {copied ? '✓ Copied!' : '🔗 Share Link'}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)] transition"
      >
        📱 WhatsApp
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)] transition"
      >
        𝕏 Share
      </a>
    </div>
  );
}
