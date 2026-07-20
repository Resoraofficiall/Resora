/**
 * components/ShareButtons.tsx
 * RSR-CMP — Simple share row (copy link, WhatsApp, X). Default export
 * — studio/StudioHero.tsx imports it as `import ShareButtons from ...`.
 */

"use client";

import * as React from "react";

export interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-[var(--space-2)]">
      <button
        type="button"
        onClick={handleCopy}
        className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)]"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)]"
      >
        WhatsApp
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)]"
      >
        Share on X
      </a>
    </div>
  );
}
