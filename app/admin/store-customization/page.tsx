'use client';

import { useEffect, useState } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  getStoreCustomizationOptions,
  addOption,
  removeOption,
  type StoreCustomizationOptions,
  type StoreOptionCategory,
} from '@/services/storeCustomizationService';

// ---------------------------------------------------------------------------
// RSR-APP-053 — app/admin/store-customization/page.tsx
// Phase 10 amendment, Step 8 (Blueprint §30.8.1). Editor over
// settings/storeCustomizationOptions — the founder-curated option lists a
// seller's Store Customization panel reads from. 🔒 LOCKED: no free-text CSS
// or hex-color field exists anywhere on this page — every option is a named
// preset. Removing an option here only removes it from the picker for
// sellers who have NOT already chosen it; a store currently using it keeps
// that selection until the seller changes it themselves.
// ---------------------------------------------------------------------------

const CATEGORY_META: { key: StoreOptionCategory; label: string; placeholder: string }[] = [
  { key: 'themes', label: 'Themes', placeholder: 'e.g. Ivory Gallery' },
  { key: 'fontPairings', label: 'Font Pairings', placeholder: 'e.g. Cormorant Garamond / Inter' },
  { key: 'spacingPresets', label: 'Spacing Presets', placeholder: 'e.g. airy' },
  { key: 'backgroundTreatments', label: 'Background Treatments', placeholder: 'e.g. subtle linen texture' },
  { key: 'galleryLayouts', label: 'Gallery Layouts', placeholder: 'e.g. masonry-3col' },
  { key: 'animationPresets', label: 'Animation Presets', placeholder: 'e.g. fade-rise' },
];

export default function AdminStoreCustomizationPage() {
  const { allowed, checking } = useRouteGuard({
    requiredPermissions: ['store-customization:manage'],
    fallbackRoute: '/admin/overview',
  });

  const [options, setOptions] = useState<StoreCustomizationOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<StoreOptionCategory, string>>({
    themes: '',
    fontPairings: '',
    spacingPresets: '',
    backgroundTreatments: '',
    galleryLayouts: '',
    animationPresets: '',
  });
  const [pendingRemoval, setPendingRemoval] = useState<{ category: StoreOptionCategory; value: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStoreCustomizationOptions();
      setOptions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load store customization options.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking && allowed) load();
  }, [checking, allowed]);

  const handleAdd = async (category: StoreOptionCategory) => {
    const value = drafts[category].trim();
    if (!value || !options) return;
    if (options[category].includes(value)) {
      setError(`"${value}" already exists in this list.`);
      return;
    }
    setSaving(true);
    setError(null);
    const prev = options;
    setOptions({ ...options, [category]: [...options[category], value] });
    try {
      await addOption(category, value);
      setDrafts({ ...drafts, [category]: '' });
    } catch (e) {
      setOptions(prev);
      setError(e instanceof Error ? e.message : 'Failed to add option.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval || !options) return;
    const { category, value } = pendingRemoval;
    setSaving(true);
    setError(null);
    const prev = options;
    setOptions({ ...options, [category]: options[category].filter((v) => v !== value) });
    try {
      await removeOption(category, value);
      setPendingRemoval(null);
    } catch (e) {
      setOptions(prev);
      setError(e instanceof Error ? e.message : 'Failed to remove option.');
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
          message="Store customization option management is limited to the Founder role."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="font-[var(--font-display)] text-[length:var(--text-h1)] text-[var(--color-black-900)]">
          Store Customization Options
        </h1>
        <p className="mt-1 max-w-2xl text-[length:var(--text-body)] text-[var(--color-gray-700)]">
          These are the only options sellers can choose from in their Store Customization panel. There is no
          free-text CSS or color field anywhere on the platform — every option below is a curated preset.
        </p>
      </header>

      {error && (
        <div className="mb-6">
          <ErrorState title="Something went wrong" message={error} onRetry={load} />
        </div>
      )}

      {loading || !options ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {CATEGORY_META.map(({ key, label, placeholder }) => (
            <Card key={key} className="p-5">
              <h2 className="mb-3 text-[length:var(--text-h3)] text-[var(--color-black-900)]">{label}</h2>
              {options[key].length === 0 ? (
                <EmptyState title="No options yet" message="Add at least one preset so sellers have a choice." />
              ) : (
                <ul className="mb-4 flex flex-wrap gap-2">
                  {options[key].map((value) => (
                    <li
                      key={value}
                      className="flex items-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-ivory-50)] px-3 py-1 text-[length:var(--text-caption)] shadow-[var(--shadow-card)]"
                    >
                      {value}
                      <button
                        aria-label={`Remove ${value}`}
                        className="text-[var(--color-error)]"
                        onClick={() => setPendingRemoval({ category: key, value })}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-caption)]"
                  placeholder={placeholder}
                  value={drafts[key]}
                  onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd(key)}
                />
                <Button onClick={() => handleAdd(key)} disabled={saving}>
                  Add
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pendingRemoval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-sm p-6 shadow-[var(--shadow-modal)]">
            <h2 className="mb-2 text-[length:var(--text-h3)] text-[var(--color-black-900)]">Remove "{pendingRemoval.value}"?</h2>
            <p className="mb-4 text-[length:var(--text-body)] text-[var(--color-gray-700)]">
              This removes it from the picker for sellers who haven't chosen it yet. Any store currently using
              it keeps this selection until they change it themselves.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPendingRemoval(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={confirmRemoval} disabled={saving}>
                {saving ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
