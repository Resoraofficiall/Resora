'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  getCmsDocument,
  updateCmsDocument,
  reorderHomepageBlocks,
  toggleHomepageBlock,
} from '@/services/cmsService';

// ---------------------------------------------------------------------------
// RSR-APP-048 — app/admin/cms/page.tsx
// Founder Admin Panel: CMS hub covering cms/homepage, cms/navigation,
// cms/footer, cms/theme, and policy pages, per Blueprint §12.2 / §12.3 Step 3.
// Every surface reads/writes directly to its `cms/{docId}` Firestore document
// (Blueprint §6.2) through cmsService — this component never calls Firestore
// directly (§18.2). Changes publish instantly (no build/deploy step); the
// public homepage picks them up within its 60s CDN-cache TTL.
// ---------------------------------------------------------------------------

type CmsSurface = 'homepage' | 'navigation' | 'footer' | 'theme' | 'pages';

interface HomepageBlock {
  id: string;
  type: 'hero' | 'featuredStudios' | 'featuredCollections' | 'journal' | 'testimonials' | 'announcementBar' | 'custom';
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

interface HomepageDoc {
  blocks: HomepageBlock[];
  updatedAt?: string;
}

interface NavigationDoc {
  primaryItems: { id: string; label: string; href: string }[];
  updatedAt?: string;
}

interface FooterDoc {
  linkGroups: { id: string; title: string; links: { label: string; href: string }[] }[];
  legalLinks: { label: string; href: string }[];
  socialLinks: { platform: string; href: string }[];
  newsletterEnabled: boolean;
  updatedAt?: string;
}

interface ThemeDoc {
  activeAnnouncementText: string;
  announcementBarEnabled: boolean;
  updatedAt?: string;
}

interface PolicyDoc {
  slug: 'shipping' | 'returns' | 'privacy' | 'terms';
  title: string;
  bodyRichText: string;
  updatedAt?: string;
}

const SURFACES: { key: CmsSurface; label: string }[] = [
  { key: 'homepage', label: 'Homepage Builder' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'footer', label: 'Footer' },
  { key: 'theme', label: 'Theme & Announcement' },
  { key: 'pages', label: 'Policy Pages' },
];

const BLOCK_LABELS: Record<HomepageBlock['type'], string> = {
  hero: 'Hero',
  featuredStudios: 'Featured Studios',
  featuredCollections: 'Featured Collections',
  journal: 'Journal Highlights',
  testimonials: 'Testimonials',
  announcementBar: 'Announcement Bar',
  custom: 'Custom Block',
};

export default function AdminCmsPage() {
  const { user, role } = useAuth();
  const { allowed, checking } = useRouteGuard({
    requiredPermissions: ['cms:edit'],
    fallbackRoute: '/admin/overview',
  });

  const [surface, setSurface] = useState<CmsSurface>('homepage');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [homepage, setHomepage] = useState<HomepageDoc | null>(null);
  const [navigation, setNavigation] = useState<NavigationDoc | null>(null);
  const [footer, setFooter] = useState<FooterDoc | null>(null);
  const [theme, setTheme] = useState<ThemeDoc | null>(null);
  const [policies, setPolicies] = useState<PolicyDoc[] | null>(null);
  const [activePolicySlug, setActivePolicySlug] = useState<PolicyDoc['slug']>('shipping');

  const loadSurface = useCallback(async (target: CmsSurface) => {
    setLoading(true);
    setError(null);
    try {
      if (target === 'homepage') {
        const doc = await getCmsDocument<HomepageDoc>('homepage');
        setHomepage(doc ?? { blocks: [] });
      } else if (target === 'navigation') {
        const doc = await getCmsDocument<NavigationDoc>('navigation');
        setNavigation(doc ?? { primaryItems: [] });
      } else if (target === 'footer') {
        const doc = await getCmsDocument<FooterDoc>('footer');
        setFooter(doc ?? { linkGroups: [], legalLinks: [], socialLinks: [], newsletterEnabled: true });
      } else if (target === 'theme') {
        const doc = await getCmsDocument<ThemeDoc>('theme');
        setTheme(doc ?? { activeAnnouncementText: '', announcementBarEnabled: false });
      } else {
        const docs = await getCmsDocument<PolicyDoc[]>('pages');
        setPolicies(docs ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CMS content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checking && allowed) {
      loadSurface(surface);
    }
  }, [surface, checking, allowed, loadSurface]);

  const handleBlockToggle = async (blockId: string, enabled: boolean) => {
    if (!homepage) return;
    const prev = homepage;
    const next: HomepageDoc = {
      ...homepage,
      blocks: homepage.blocks.map((b) => (b.id === blockId ? { ...b, enabled } : b)),
    };
    setHomepage(next);
    setSaving(true);
    try {
      await toggleHomepageBlock(blockId, enabled);
    } catch (e) {
      setHomepage(prev);
      setError(e instanceof Error ? e.message : 'Failed to update block visibility.');
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || !homepage || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...homepage.blocks];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const withOrder = reordered.map((b, i) => ({ ...b, order: i }));
    const prev = homepage;
    setHomepage({ ...homepage, blocks: withOrder });
    setDragIndex(null);
    setSaving(true);
    try {
      await reorderHomepageBlocks(withOrder.map((b) => b.id));
    } catch (e) {
      setHomepage(prev);
      setError(e instanceof Error ? e.message : 'Failed to save new block order.');
    } finally {
      setSaving(false);
    }
  };

  const saveNavigation = async () => {
    if (!navigation) return;
    setSaving(true);
    setError(null);
    try {
      await updateCmsDocument('navigation', navigation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save navigation.');
    } finally {
      setSaving(false);
    }
  };

  const saveFooter = async () => {
    if (!footer) return;
    setSaving(true);
    setError(null);
    try {
      await updateCmsDocument('footer', footer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save footer.');
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async () => {
    if (!theme) return;
    setSaving(true);
    setError(null);
    try {
      await updateCmsDocument('theme', theme);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save theme settings.');
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async (policy: PolicyDoc) => {
    if (!policies) return;
    setSaving(true);
    setError(null);
    try {
      const nextPolicies = policies.map((p) => (p.slug === policy.slug ? policy : p));
      await updateCmsDocument('pages', nextPolicies);
      setPolicies(nextPolicies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save policy page.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="p-8">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-8">
        <ErrorState
          title="Access restricted"
          message="Your role does not have CMS edit permission. Content edits are limited to Founder and Content Manager roles."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] px-6 py-8 md:px-10">
      <header className="mb-8">
        <h1 className="font-[var(--font-display)] text-[length:var(--text-h1)] text-[var(--color-black-900)]">
          Content Management
        </h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-gray-700)]">
          Every change here publishes instantly to the live site — no deploy required.
        </p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-gray-300)] pb-2">
        {SURFACES.map((s) => (
          <button
            key={s.key}
            onClick={() => setSurface(s.key)}
            className={`rounded-[var(--radius-full)] px-4 py-2 text-[length:var(--text-caption)] transition-colors duration-[var(--duration-fast)] ${
              surface === s.key
                ? 'bg-[var(--color-black-900)] text-[var(--color-ivory-50)]'
                : 'bg-[var(--color-ivory-50)] text-[var(--color-gray-700)] hover:bg-[var(--color-gold-100)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {saving && (
        <div className="mb-4 text-[length:var(--text-caption)] text-[var(--color-gold-600)]">
          Saving…
        </div>
      )}

      {error && (
        <div className="mb-6">
          <ErrorState title="Something went wrong" message={error} onRetry={() => loadSurface(surface)} />
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          {surface === 'homepage' && homepage && (
            <Card className="p-6">
              <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
                Homepage Blocks
              </h2>
              {homepage.blocks.length === 0 ? (
                <EmptyState
                  title="No homepage blocks yet"
                  message="Homepage blocks are seeded during initial setup. Contact engineering if this list should not be empty."
                />
              ) : (
                <ul className="space-y-2">
                  {[...homepage.blocks]
                    .sort((a, b) => a.order - b.order)
                    .map((block, index) => (
                      <li
                        key={block.id}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(index)}
                        className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] px-4 py-3 shadow-[var(--shadow-card)]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="cursor-grab select-none text-[var(--color-gray-500)]" aria-hidden>
                            ⠿
                          </span>
                          <span className="text-[length:var(--text-body)] text-[var(--color-black-900)]">
                            {BLOCK_LABELS[block.type]}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                          <input
                            type="checkbox"
                            checked={block.enabled}
                            onChange={(e) => handleBlockToggle(block.id, e.target.checked)}
                          />
                          {block.enabled ? 'Visible' : 'Hidden'}
                        </label>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          )}

          {surface === 'navigation' && navigation && (
            <Card className="p-6">
              <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
                Primary Navigation
              </h2>
              {navigation.primaryItems.length === 0 ? (
                <EmptyState title="No navigation items" message="Add items to populate the primary nav." />
              ) : (
                <div className="space-y-3">
                  {navigation.primaryItems.map((item, i) => (
                    <div key={item.id} className="flex gap-3">
                      <input
                        className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-body)]"
                        value={item.label}
                        onChange={(e) => {
                          const next = [...navigation.primaryItems];
                          next[i] = { ...next[i], label: e.target.value };
                          setNavigation({ ...navigation, primaryItems: next });
                        }}
                      />
                      <input
                        className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-body)]"
                        value={item.href}
                        onChange={(e) => {
                          const next = [...navigation.primaryItems];
                          next[i] = { ...next[i], href: e.target.value };
                          setNavigation({ ...navigation, primaryItems: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <Button className="mt-4" onClick={saveNavigation} disabled={saving}>
                Save Navigation
              </Button>
            </Card>
          )}

          {surface === 'footer' && footer && (
            <Card className="p-6">
              <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
                Footer
              </h2>
              <label className="mb-4 flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                <input
                  type="checkbox"
                  checked={footer.newsletterEnabled}
                  onChange={(e) => setFooter({ ...footer, newsletterEnabled: e.target.checked })}
                />
                Show newsletter signup
              </label>
              {footer.linkGroups.length === 0 ? (
                <EmptyState title="No footer link groups" message="Add a link group to populate the footer." />
              ) : (
                footer.linkGroups.map((group, gi) => (
                  <div key={group.id} className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-gray-300)] p-4">
                    <input
                      className="mb-2 w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-body)] font-medium"
                      value={group.title}
                      onChange={(e) => {
                        const next = [...footer.linkGroups];
                        next[gi] = { ...next[gi], title: e.target.value };
                        setFooter({ ...footer, linkGroups: next });
                      }}
                    />
                    {group.links.map((link, li) => (
                      <div key={li} className="mb-1 flex gap-2">
                        <input
                          className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-2 py-1 text-[length:var(--text-caption)]"
                          value={link.label}
                          onChange={(e) => {
                            const nextGroups = [...footer.linkGroups];
                            const nextLinks = [...nextGroups[gi].links];
                            nextLinks[li] = { ...nextLinks[li], label: e.target.value };
                            nextGroups[gi] = { ...nextGroups[gi], links: nextLinks };
                            setFooter({ ...footer, linkGroups: nextGroups });
                          }}
                        />
                        <input
                          className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-2 py-1 text-[length:var(--text-caption)]"
                          value={link.href}
                          onChange={(e) => {
                            const nextGroups = [...footer.linkGroups];
                            const nextLinks = [...nextGroups[gi].links];
                            nextLinks[li] = { ...nextLinks[li], href: e.target.value };
                            nextGroups[gi] = { ...nextGroups[gi], links: nextLinks };
                            setFooter({ ...footer, linkGroups: nextGroups });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))
              )}
              <Button onClick={saveFooter} disabled={saving}>
                Save Footer
              </Button>
            </Card>
          )}

          {surface === 'theme' && theme && (
            <Card className="p-6">
              <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
                Announcement Bar
              </h2>
              <p className="mb-3 text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
                Operational copy and links only — brand colors are locked to the token system and cannot be
                changed here.
              </p>
              <label className="mb-3 flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                <input
                  type="checkbox"
                  checked={theme.announcementBarEnabled}
                  onChange={(e) => setTheme({ ...theme, announcementBarEnabled: e.target.checked })}
                />
                Enabled
              </label>
              <textarea
                className="mb-4 w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-body)]"
                rows={2}
                value={theme.activeAnnouncementText}
                onChange={(e) => setTheme({ ...theme, activeAnnouncementText: e.target.value })}
                placeholder="e.g. Complimentary wrapping on every order this week."
              />
              <Button onClick={saveTheme} disabled={saving}>
                Save Theme Settings
              </Button>
            </Card>
          )}

          {surface === 'pages' && policies && (
            <Card className="p-6">
              <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
                Policy Pages
              </h2>
              {policies.length === 0 ? (
                <EmptyState title="No policy pages found" message="Shipping, Returns, Privacy and Terms pages are seeded during setup." />
              ) : (
                <>
                  <div className="mb-4 flex gap-2">
                    {policies.map((p) => (
                      <button
                        key={p.slug}
                        onClick={() => setActivePolicySlug(p.slug)}
                        className={`rounded-[var(--radius-full)] px-3 py-1 text-[length:var(--text-caption)] ${
                          activePolicySlug === p.slug
                            ? 'bg-[var(--color-gold-500)] text-[var(--color-black-900)]'
                            : 'bg-[var(--color-gray-100)] text-[var(--color-gray-700)]'
                        }`}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                  {policies
                    .filter((p) => p.slug === activePolicySlug)
                    .map((p) => (
                      <div key={p.slug}>
                        <textarea
                          className="mb-4 w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-body)]"
                          rows={12}
                          value={p.bodyRichText}
                          onChange={(e) =>
                            setPolicies(
                              policies.map((pp) => (pp.slug === p.slug ? { ...pp, bodyRichText: e.target.value } : pp))
                            )
                          }
                        />
                        <Button onClick={() => savePolicy(p)} disabled={saving}>
                          Save {p.title}
                        </Button>
                      </div>
                    ))}
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
