'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Card } from '@/components/Card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { listCorporateLeads, updateCorporateLeadStatus, addCorporateLeadNote } from '@/services/corporateLeadService';

// ---------------------------------------------------------------------------
// RSR-APP-051 — app/admin/marketing/corporate-leads/page.tsx
// Blueprint §15 / Build Prompt Phase 12 Step 4. This is a lead-tracking
// status list fed by the public /corporate inquiry form — deliberately NOT a
// generic CRM. Status pipeline: new → inDiscussion → quoted → confirmed →
// completed (a lead can also be marked lost at any stage).
// ---------------------------------------------------------------------------

type LeadStatus = 'new' | 'inDiscussion' | 'quoted' | 'confirmed' | 'completed' | 'lost';

interface CorporateLead {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  quantity: number;
  budgetRange: string;
  deliveryDate: string;
  customRequirements: string;
  status: LeadStatus;
  notes: { text: string; authorName: string; createdAt: string }[];
  createdAt: string;
}

const STATUS_COLUMNS: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'inDiscussion', label: 'In Discussion' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'lost', label: 'Lost' },
];

export default function AdminCorporateLeadsPage() {
  const { allowed, checking } = useRouteGuard({
    requiredPermissions: ['marketing:manage'],
    fallbackRoute: '/admin/overview',
  });

  const [leads, setLeads] = useState<CorporateLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCorporateLeads();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load corporate leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking && allowed) load();
  }, [checking, allowed]);

  const activeLead = useMemo(() => leads.find((l) => l.id === activeLeadId) ?? null, [leads, activeLeadId]);

  const handleStatusChange = async (lead: CorporateLead, status: LeadStatus) => {
    const prev = leads;
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await updateCorporateLeadStatus(lead.id, status);
    } catch (e) {
      setLeads(prev);
      setError(e instanceof Error ? e.message : 'Failed to update lead status.');
    }
  };

  const submitNote = async () => {
    if (!activeLead || !noteDraft.trim()) return;
    setSavingNote(true);
    try {
      const updated = await addCorporateLeadNote(activeLead.id, noteDraft.trim());
      setLeads(leads.map((l) => (l.id === activeLead.id ? updated : l)));
      setNoteDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add note.');
    } finally {
      setSavingNote(false);
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
          message="Corporate lead tracking is limited to Marketing Manager and Founder roles."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="font-[var(--font-display)] text-[length:var(--text-h1)] text-[var(--color-black-900)]">
          Corporate Inquiries
        </h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-gray-700)]">
          Leads submitted through the public bulk/business inquiry form.
        </p>
      </header>

      {error && (
        <div className="mb-6">
          <ErrorState title="Something went wrong" message={error} onRetry={load} />
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No corporate inquiries yet"
          message="Submissions from the /corporate inquiry form will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key}>
              <h2 className="mb-3 text-[length:var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gray-500)]">
                {col.label} ({leads.filter((l) => l.status === col.key).length})
              </h2>
              <div className="space-y-3">
                {leads
                  .filter((l) => l.status === col.key)
                  .map((lead) => (
                    <Card
                      key={lead.id}
                      className="cursor-pointer p-3 hover:shadow-[var(--shadow-hover)]"
                      onClick={() => setActiveLeadId(lead.id)}
                    >
                      <p className="text-[length:var(--text-body)] font-medium text-[var(--color-black-900)]">
                        {lead.companyName}
                      </p>
                      <p className="text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
                        {lead.contactPerson} · Qty {lead.quantity}
                      </p>
                      <select
                        className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-2 py-1 text-[length:var(--text-micro)]"
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                      >
                        {STATUS_COLUMNS.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-[var(--shadow-modal)]">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-[length:var(--text-h3)] text-[var(--color-black-900)]">{activeLead.companyName}</h2>
              <button
                className="text-[length:var(--text-caption)] text-[var(--color-gray-500)]"
                onClick={() => setActiveLeadId(null)}
              >
                Close
              </button>
            </div>

            <dl className="mb-4 space-y-2 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
              <div className="flex justify-between"><dt>Contact</dt><dd>{activeLead.contactPerson}</dd></div>
              <div className="flex justify-between"><dt>Email</dt><dd>{activeLead.email}</dd></div>
              <div className="flex justify-between"><dt>Phone</dt><dd>{activeLead.phone}</dd></div>
              <div className="flex justify-between"><dt>Quantity</dt><dd>{activeLead.quantity}</dd></div>
              <div className="flex justify-between"><dt>Budget</dt><dd>{activeLead.budgetRange}</dd></div>
              <div className="flex justify-between"><dt>Delivery date</dt><dd>{activeLead.deliveryDate}</dd></div>
            </dl>

            {activeLead.customRequirements && (
              <div className="mb-4">
                <h3 className="mb-1 text-[length:var(--text-caption)] font-medium text-[var(--color-gray-700)]">
                  Custom requirements
                </h3>
                <p className="text-[length:var(--text-body)] text-[var(--color-black-900)]">
                  {activeLead.customRequirements}
                </p>
              </div>
            )}

            <div className="mb-4">
              <h3 className="mb-2 text-[length:var(--text-caption)] font-medium text-[var(--color-gray-700)]">Notes</h3>
              {activeLead.notes.length === 0 ? (
                <p className="text-[length:var(--text-caption)] text-[var(--color-gray-500)]">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {activeLead.notes.map((n, i) => (
                    <li key={i} className="rounded-[var(--radius-sm)] bg-[var(--color-ivory-100)] p-2 text-[length:var(--text-caption)]">
                      <p className="text-[var(--color-black-900)]">{n.text}</p>
                      <p className="mt-1 text-[var(--color-gray-500)]">
                        {n.authorName} · {n.createdAt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-caption)]"
                placeholder="Add an internal note…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <button
                className="rounded-[var(--radius-sm)] bg-[var(--color-black-900)] px-4 py-2 text-[length:var(--text-caption)] text-[var(--color-ivory-50)] disabled:opacity-50"
                onClick={submitNote}
                disabled={savingNote || !noteDraft.trim()}
              >
                Add
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
