'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// RSR-CMP-015 — components/ShareButtons.tsx
// Blueprint §15. Social sharing (WhatsApp / Instagram-link / Facebook / X /
// Pinterest / copy-link) for Product, Studio, and Collection pages. Relies
// entirely on the caller's own OG metadata (Phase 12 Step 1's
// generateSeoMetadata) for correct preview rendering — this component never
// generates its own preview image or description, only shares the URL.
// ---------------------------------------------------------------------------

interface ShareButtonsProps {
  title: string;
  url: string;
  imageUrl?: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}` },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — fail silently, the link remains
      // shareable via the other channels.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[var(--radius-full)] border border-[var(--color-gray-300)] px-3 py-1.5 text-[length:var(--text-caption)] text-[var(--color-gray-700)] transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-gold-500)] hover:text-[var(--color-gold-600)]"
        >
          {link.label}
        </a>
      ))}
      <a
        href={`https://www.instagram.com/`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-[var(--radius-full)] border border-[var(--color-gray-300)] px-3 py-1.5 text-[length:var(--text-caption)] text-[var(--color-gray-700)] transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-gold-500)] hover:text-[var(--color-gold-600)]"
      >
        Instagram
      </a>
      <button
        onClick={handleCopy}
        className="rounded-[var(--radius-full)] bg-[var(--color-black-900)] px-3 py-1.5 text-[length:var(--text-caption)] text-[var(--color-ivory-50)] transition-opacity duration-[var(--duration-fast)] hover:opacity-90"
      >
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
