'use client';

import { useEffect, useState } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  archiveCampaign,
  type CampaignInput,
} from '@/services/campaignService';

// ---------------------------------------------------------------------------
// RSR-APP-050 — app/admin/marketing/campaigns/page.tsx
// Blueprint §15 / Build Prompt Phase 12 Step 3. A campaign auto-activates
// and auto-deactivates on schedule via a scheduled Cloud Function that
// toggles the associated cms/homepage block's visibility (reusing the block
// system from Phase 5/10 — this page never renders a separate campaign
// system) and enables/disables the optional /campaign/{slug} landing page.
// ---------------------------------------------------------------------------

type CampaignStatus = 'scheduled' | 'active' | 'expired' | 'archived';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  bannerImageUrl: string;
  startDate: string;
  endDate: string;
  associatedProductIds: string[];
  associatedCollectionIds: string[];
  associatedStudioIds: string[];
  landingPageEnabled: boolean;
  status: CampaignStatus;
  createdAt: string;
}

const emptyForm: CampaignInput = {
  title: '',
  slug: '',
  bannerImageUrl: '',
  startDate: '',
  endDate: '',
  associatedProductIds: [],
  associatedCollectionIds: [],
  associatedStudioIds: [],
  landingPageEnabled: false,
};

const STATUS_STYLES: Record<CampaignStatus, string> = {
  scheduled: 'bg-[var(--color-info)] text-[var(--color-ivory-50)]',
  active: 'bg-[var(--color-success)] text-[var(--color-ivory-50)]',
  expired: 'bg-[var(--color-gray-300)] text-[var(--color-gray-700)]',
  archived: 'bg-[var(--color-gray-100)] text-[var(--color-gray-500)]',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminCampaignsPage() {
  const { allowed, checking } = useRouteGuard({
    requiredPermissions: ['marketing:manage'],
    fallbackRoute: '/admin/overview',
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCampaigns();
      setCampaigns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking && allowed) load();
  }, [checking, allowed]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      slug: c.slug,
      bannerImageUrl: c.bannerImageUrl,
      startDate: c.startDate,
      endDate: c.endDate,
      associatedProductIds: c.associatedProductIds,
      associatedCollectionIds: c.associatedCollectionIds,
      associatedStudioIds: c.associatedStudioIds,
      landingPageEnabled: c.landingPageEnabled,
    });
    setFormError(null);
    setShowForm(true);
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Campaign title is required.';
    if (!form.slug.trim()) return 'Slug is required for the /campaign/{slug} route.';
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Slug may only contain lowercase letters, numbers, and hyphens.';
    if (!form.bannerImageUrl.trim()) return 'A banner image is required.';
    if (!form.startDate || !form.endDate) return 'Start and end dates are required.';
    if (new Date(form.startDate) > new Date(form.endDate)) return 'Start date must be before end date.';
    return null;
  };

  const submitForm = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateCampaign(editingId, form);
      } else {
        await createCampaign(form);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (c: Campaign) => {
    const prev = campaigns;
    setCampaigns(campaigns.map((x) => (x.id === c.id ? { ...x, status: 'archived' } : x)));
    try {
      await archiveCampaign(c.id);
    } catch (e) {
      setCampaigns(prev);
      setError(e instanceof Error ? e.message : 'Failed to archive campaign.');
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
          message="Campaign management is limited to Marketing Manager and Founder roles."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-[length:var(--text-h1)] text-[var(--color-black-900)]">
            Seasonal Campaigns
          </h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-gray-700)]">
            Campaigns activate and deactivate automatically on their scheduled dates.
          </p>
        </div>
        <Button onClick={openCreate}>Create Campaign</Button>
      </header>

      {error && (
        <div className="mb-6">
          <ErrorState title="Something went wrong" message={error} onRetry={load} />
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          message="Create a seasonal campaign to schedule a homepage banner and optional landing page."
          actionLabel="Create Campaign"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden p-0">
              <div
                className="h-32 w-full bg-[var(--color-gray-100)] bg-cover bg-center"
                style={{ backgroundImage: c.bannerImageUrl ? `url(${c.bannerImageUrl})` : undefined }}
              />
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[length:var(--text-h3)] text-[var(--color-black-900)]">{c.title}</h3>
                  <span className={`rounded-[var(--radius-full)] px-2 py-1 text-[length:var(--text-micro)] ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <p className="mb-2 text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
                  {c.startDate} → {c.endDate}
                </p>
                <p className="mb-3 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Landing page: {c.landingPageEnabled ? `/campaign/${c.slug}` : 'disabled'}
                </p>
                <div className="flex gap-3">
                  <button
                    className="text-[length:var(--text-caption)] text-[var(--color-gold-600)] hover:underline"
                    onClick={() => openEdit(c)}
                  >
                    Edit
                  </button>
                  {c.status !== 'archived' && (
                    <button
                      className="text-[length:var(--text-caption)] text-[var(--color-error)] hover:underline"
                      onClick={() => handleArchive(c)}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-[var(--shadow-modal)]">
            <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
              {editingId ? 'Edit Campaign' : 'Create Campaign'}
            </h2>

            {formError && (
              <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--color-error)]/10 px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-error)]">
                {formError}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">Title</label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                      slug: editingId ? form.slug : slugify(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Slug (/campaign/{'{slug}'})
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                />
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Banner image URL
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.bannerImageUrl}
                  onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
                  placeholder="Uploaded via Media Library"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">Start date</label>
                  <input
                    type="date"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">End date</label>
                  <input
                    type="date"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Associated product IDs (comma-separated)
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.associatedProductIds.join(',')}
                  onChange={(e) =>
                    setForm({ ...form, associatedProductIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Associated collection IDs (comma-separated)
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.associatedCollectionIds.join(',')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      associatedCollectionIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Associated studio IDs (comma-separated)
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.associatedStudioIds.join(',')}
                  onChange={(e) =>
                    setForm({ ...form, associatedStudioIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                <input
                  type="checkbox"
                  checked={form.landingPageEnabled}
                  onChange={(e) => setForm({ ...form, landingPageEnabled: e.target.checked })}
                />
                Enable dedicated landing page at /campaign/{form.slug || '{slug}'}
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Campaign'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
