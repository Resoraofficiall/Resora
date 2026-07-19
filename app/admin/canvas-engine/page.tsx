'use client';

import { useEffect, useState } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  getCanvasEngineSettings,
  upsertFramePreset,
  deleteFramePreset,
  updateLuxuryFilterParams,
  type FramePreset,
  type LuxuryFilterParams,
} from '@/services/canvasEngineService';

// ---------------------------------------------------------------------------
// RSR-APP-052 — app/admin/canvas-engine/page.tsx
// Phase 10 amendment, Step 8 (Blueprint §30.9.1). Editor over
// settings/canvasEngineFrames — category → frame-preset mappings (aspect
// ratio, crop anchor, border/vignette style, composition template) and the
// fixed luxury-filter parameters (§30.3.1: gold-tinted vignette, contrast/
// curve, grain, shadow underlay). Writes here are read live by the Phase 3.5
// preview/pipeline — no redeploy required. The "default" fallback preset
// (DEFAULT_CATEGORY_KEY) can be edited but never deleted, since every
// unmapped category depends on it existing.
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORY_KEY = 'default';

const CROP_ANCHORS = ['center', 'top', 'bottom', 'left', 'right'] as const;
const COMPOSITION_TEMPLATES = [
  'tallPortraitMacro',
  'centeredPedestal',
  'landscapeGallery',
  'wideHorizontal',
  'compactRounded',
  'custom',
] as const;

const emptyPreset: FramePreset = {
  categorySlug: '',
  aspectRatio: '4:5',
  cropAnchor: 'center',
  borderVignetteStyle: 'goldHairline',
  compositionTemplate: 'centeredPedestal',
};

export default function AdminCanvasEnginePage() {
  const { allowed, checking } = useRouteGuard({
    requiredPermissions: ['canvas-engine:manage'],
    fallbackRoute: '/admin/overview',
  });

  const [presets, setPresets] = useState<FramePreset[]>([]);
  const [filters, setFilters] = useState<LuxuryFilterParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FramePreset>(emptyPreset);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCanvasEngineSettings();
      setPresets(data.framePresets);
      setFilters(data.luxuryFilterParams);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Canvas Engine settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking && allowed) load();
  }, [checking, allowed]);

  const openCreate = () => {
    setEditingSlug(null);
    setForm(emptyPreset);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: FramePreset) => {
    setEditingSlug(p.categorySlug);
    setForm(p);
    setFormError(null);
    setShowForm(true);
  };

  const validate = (): string | null => {
    if (!form.categorySlug.trim()) return 'Category slug is required.';
    if (!/^[a-z0-9-]+$/.test(form.categorySlug) && form.categorySlug !== DEFAULT_CATEGORY_KEY) {
      return 'Category slug may only contain lowercase letters, numbers, and hyphens.';
    }
    if (!editingSlug && presets.some((p) => p.categorySlug === form.categorySlug)) {
      return 'A frame preset for this category already exists — edit it instead.';
    }
    return null;
  };

  const submitForm = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await upsertFramePreset(form);
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save frame preset.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setSaving(true);
    try {
      await deleteFramePreset(pendingDelete);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete frame preset.');
    } finally {
      setSaving(false);
    }
  };

  const saveFilters = async () => {
    if (!filters) return;
    setSaving(true);
    setError(null);
    try {
      await updateLuxuryFilterParams(filters);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save filter parameters.');
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
          message="Canvas Engine configuration is limited to the Founder role."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-[length:var(--text-h1)] text-[var(--color-black-900)]">
            Canvas Engine
          </h1>
          <p className="mt-1 max-w-2xl text-[length:var(--text-body)] text-[var(--color-gray-700)]">
            Deterministic, non-generative image compositing. Editing a mapping here updates the live
            product-creation preview immediately — no redeploy.
          </p>
        </div>
        <Button onClick={openCreate}>Add Category Mapping</Button>
      </header>

      {error && (
        <div className="mb-6">
          <ErrorState title="Something went wrong" message={error} onRetry={load} />
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          <Card className="mb-8 overflow-x-auto p-0">
            {presets.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No frame presets configured"
                  message="A default fallback preset must exist before the Canvas Engine can process any upload."
                  actionLabel="Add Category Mapping"
                  onAction={openCreate}
                />
              </div>
            ) : (
              <table className="w-full text-left text-[length:var(--text-body)]">
                <thead className="border-b border-[var(--color-gray-300)] text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Aspect ratio</th>
                    <th className="px-4 py-3">Crop anchor</th>
                    <th className="px-4 py-3">Vignette style</th>
                    <th className="px-4 py-3">Composition</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {presets.map((p) => (
                    <tr key={p.categorySlug} className="border-b border-[var(--color-gray-100)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-black-900)]">
                        {p.categorySlug === DEFAULT_CATEGORY_KEY ? (
                          <span className="rounded-[var(--radius-full)] bg-[var(--color-gold-100)] px-2 py-1 text-[length:var(--text-micro)]">
                            default fallback
                          </span>
                        ) : (
                          p.categorySlug
                        )}
                      </td>
                      <td className="px-4 py-3">{p.aspectRatio}</td>
                      <td className="px-4 py-3 capitalize">{p.cropAnchor}</td>
                      <td className="px-4 py-3">{p.borderVignetteStyle}</td>
                      <td className="px-4 py-3">{p.compositionTemplate}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="mr-3 text-[length:var(--text-caption)] text-[var(--color-gold-600)] hover:underline"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                        {p.categorySlug !== DEFAULT_CATEGORY_KEY && (
                          <button
                            className="text-[length:var(--text-caption)] text-[var(--color-error)] hover:underline"
                            onClick={() => setPendingDelete(p.categorySlug)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {filters && (
            <Card className="p-6">
              <h2 className="mb-1 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
                Luxury Filter Parameters
              </h2>
              <p className="mb-4 text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
                Applied uniformly by every frame preset — gold-tinted vignette, contrast/curve, grain, and
                shadow underlay. Adjusting values here changes every category's output consistently.
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                    Vignette intensity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={filters.vignetteIntensity}
                    onChange={(e) => setFilters({ ...filters, vignetteIntensity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                    Contrast
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={filters.contrast}
                    onChange={(e) => setFilters({ ...filters, contrast: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                    Grain amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={filters.grainAmount}
                    onChange={(e) => setFilters({ ...filters, grainAmount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                    Shadow underlay opacity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={filters.shadowUnderlayOpacity}
                    onChange={(e) => setFilters({ ...filters, shadowUnderlayOpacity: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Button className="mt-4" onClick={saveFilters} disabled={saving}>
                Save Filter Parameters
              </Button>
            </Card>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md p-6 shadow-[var(--shadow-modal)]">
            <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
              {editingSlug ? 'Edit Frame Mapping' : 'Add Category Mapping'}
            </h2>

            {formError && (
              <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--color-error)]/10 px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-error)]">
                {formError}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Category slug
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.categorySlug}
                  onChange={(e) => setForm({ ...form, categorySlug: e.target.value.toLowerCase() })}
                  disabled={!!editingSlug}
                  placeholder="e.g. jewelry"
                />
              </div>
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Aspect ratio
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.aspectRatio}
                  onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })}
                  placeholder="e.g. 4:5"
                />
              </div>
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Crop anchor
                </label>
                <select
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.cropAnchor}
                  onChange={(e) => setForm({ ...form, cropAnchor: e.target.value as FramePreset['cropAnchor'] })}
                >
                  {CROP_ANCHORS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Border / vignette style
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.borderVignetteStyle}
                  onChange={(e) => setForm({ ...form, borderVignetteStyle: e.target.value })}
                  placeholder="e.g. goldHairline"
                />
              </div>
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Composition template
                </label>
                <select
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.compositionTemplate}
                  onChange={(e) =>
                    setForm({ ...form, compositionTemplate: e.target.value as FramePreset['compositionTemplate'] })
                  }
                >
                  {COMPOSITION_TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={saving}>
                {saving ? 'Saving…' : 'Save Mapping'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-sm p-6 shadow-[var(--shadow-modal)]">
            <h2 className="mb-2 text-[length:var(--text-h3)] text-[var(--color-black-900)]">Delete mapping?</h2>
            <p className="mb-4 text-[length:var(--text-body)] text-[var(--color-gray-700)]">
              Products in "{pendingDelete}" will fall back to the default frame preset immediately.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={confirmDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
