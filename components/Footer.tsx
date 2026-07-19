/**
 * components/Footer.tsx
 * RSR-CMP-003
 *
 * Structure only in this phase — content is fully CMS-driven
 * (Blueprint §4.6, §18.2 layering rule: no component calls Firestore
 * directly). Reads from cms/footer via services/cmsService.ts
 * (RSR-SVC-010). Zero hardcoded link text/labels in this component —
 * if the CMS document doesn't exist yet, a placeholder doc must be
 * seeded in Firestore, never a fallback string literal here.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { getFooterContent, type FooterContent } from "@/services/cmsService";
import { SkeletonLine } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";

type LoadState = "loading" | "loaded" | "error";

export function Footer() {
  const [content, setContent] = React.useState<FooterContent | null>(null);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchContent = React.useCallback(async () => {
    setState("loading");
    try {
      const data = await getFooterContent();
      setContent(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  if (state === "error") {
    return (
      <footer className="bg-[var(--color-black-950)] px-[var(--space-4)] py-[var(--space-6)]">
        <ErrorState
          message="We couldn't load the footer content."
          onRetry={fetchContent}
          className="max-w-md mx-auto"
        />
      </footer>
    );
  }

  return (
    <footer className="bg-[var(--color-black-950)] text-[var(--color-gray-300)]">
      <div className="mx-auto max-w-[1440px] px-[var(--space-4)] md:px-[var(--space-5)] py-[var(--space-8)]">
        {state === "loading" || !content ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-5)]">
            {Array.from({ length: 4 }).map((_, groupIndex) => (
              <div key={groupIndex} className="flex flex-col gap-[var(--space-2)]">
                <SkeletonLine width="60%" height="16px" />
                <SkeletonLine width="80%" height="12px" />
                <SkeletonLine width="70%" height="12px" />
                <SkeletonLine width="50%" height="12px" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-5)]">
              {content.linkGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-[var(--space-2)]">
                  <h3 className="text-[var(--text-caption)] font-semibold text-[var(--color-ivory-100)] uppercase tracking-wide">
                    {group.title}
                  </h3>
                  <ul className="flex flex-col gap-[var(--space-1)]">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-[var(--text-caption)] hover:text-[var(--color-gold-500)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-luxury)]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {content.newsletter && (
              <div className="mt-[var(--space-7)] pt-[var(--space-5)] border-t border-[var(--color-charcoal-800)] flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--space-3)]">
                <div>
                  <h3 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                    {content.newsletter.heading}
                  </h3>
                  <p className="text-[var(--text-caption)] mt-[var(--space-1)]">{content.newsletter.subtext}</p>
                </div>
                <form
                  className="flex gap-[var(--space-2)]"
                  onSubmit={(event) => event.preventDefault() /* wiring lands with newsletter service, later phase */}
                >
                  <input
                    type="email"
                    required
                    placeholder={content.newsletter.placeholder}
                    className="h-11 rounded-[var(--radius-sm)] bg-[var(--color-charcoal-800)] px-[var(--space-3)] text-[var(--text-body)] text-[var(--color-ivory-100)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]"
                  />
                  <button
                    type="submit"
                    className="h-11 px-[var(--space-4)] rounded-[var(--radius-sm)] bg-[var(--color-gold-500)] text-[var(--color-black-900)] font-medium hover:bg-[var(--color-gold-600)] transition-colors duration-[var(--duration-base)] ease-[var(--ease-luxury)]"
                  >
                    {content.newsletter.ctaLabel}
                  </button>
                </form>
              </div>
            )}

            <div className="mt-[var(--space-6)] pt-[var(--space-4)] border-t border-[var(--color-charcoal-800)] flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--space-2)]">
              <div className="flex gap-[var(--space-3)]">
                {content.social.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={item.label}
                    className="text-[var(--color-gray-500)] hover:text-[var(--color-gold-500)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-luxury)]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
              <p className="text-[var(--text-micro)] text-[var(--color-gray-500)]">{content.legalText}</p>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}

export default Footer;
