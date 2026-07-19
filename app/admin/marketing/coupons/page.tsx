'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  type CouponInput,
} from '@/services/couponService';

// ---------------------------------------------------------------------------
// RSR-APP-049 — app/admin/marketing/coupons/page.tsx
// Blueprint §15 / Build Prompt Phase 12 Step 2. Coupon types are limited to
// fixed / percentage / free-shipping (Buy-X-Get-Y is explicitly deferred).
// This page only ever writes a coupon definition — actual redemption
// validation happens server-side in the validateCoupon Cloud Function
// (RSR-FBS), never trusted from the client at checkout.
// ---------------------------------------------------------------------------

type CouponType = 'fixed' | 'percentage' | 'freeShipping';
type ScopeType = 'all' | 'product' | 'category' | 'collection' | 'studio';

interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // ignored for freeShipping
  scopeType: ScopeType;
  scopeIds: string[];
  startDate: string;
  endDate: string;
  minOrderValue: number | null;
  firstPurchaseOnly: boolean;
  specificCustomerId: string | null;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  createdAt: string;
}

const emptyForm: CouponInput = {
  code: '',
  type: 'percentage',
  value: 10,
  scopeType: 'all',
  scopeIds: [],
  startDate: '',
  endDate: '',
  minOrderValue: null,
  firstPurchaseOnly: false,
  specificCustomerId: null,
  usageLimit: null,
};

export default function AdminCouponsPage() {
  const { allowed, checking } = useRouteGuard({
    requiredPermissions: ['marketing:manage'],
    fallbackRoute: '/admin/overview',
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCoupons();
      setCoupons(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking && allowed) load();
  }, [checking, allowed]);

  const filtered = useMemo(
    () => coupons.filter((c) => c.code.toLowerCase().includes(search.toLowerCase())),
    [coupons, search]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      scopeType: c.scopeType,
      scopeIds: c.scopeIds,
      startDate: c.startDate,
      endDate: c.endDate,
      minOrderValue: c.minOrderValue,
      firstPurchaseOnly: c.firstPurchaseOnly,
      specificCustomerId: c.specificCustomerId,
      usageLimit: c.usageLimit,
    });
    setFormError(null);
    setShowForm(true);
  };

  const validateForm = (): string | null => {
    if (!form.code.trim()) return 'Coupon code is required.';
    if (!/^[A-Z0-9_-]{3,20}$/i.test(form.code.trim())) return 'Code must be 3–20 alphanumeric characters.';
    if (form.type !== 'freeShipping' && (!form.value || form.value <= 0)) return 'Value must be greater than zero.';
    if (form.type === 'percentage' && form.value > 90) return 'Percentage discounts above 90% are not permitted.';
    if (!form.startDate || !form.endDate) return 'Start and end dates are required.';
    if (new Date(form.startDate) > new Date(form.endDate)) return 'Start date must be before end date.';
    if (form.scopeType !== 'all' && form.scopeIds.length === 0) return 'Select at least one item for a scoped coupon.';
    return null;
  };

  const submitForm = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateCoupon(editingId, form);
      } else {
        await createCoupon(form);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    const prev = coupons;
    setCoupons(coupons.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    try {
      await deactivateCoupon(c.id, !c.active);
    } catch (e) {
      setCoupons(prev);
      setError(e instanceof Error ? e.message : 'Failed to update coupon status.');
    }
  };

  const formatValue = (c: Coupon) =>
    c.type === 'freeShipping' ? 'Free shipping' : c.type === 'percentage' ? `${c.value}% off` : `₹${c.value} off`;

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
          message="Coupon management is limited to Marketing Manager and Founder roles."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-[length:var(--text-h1)] text-[var(--color-black-900)]">
            Coupons
          </h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-gray-700)]">
            Fixed, percentage, or free-shipping discounts. Validation is enforced server-side at checkout.
          </p>
        </div>
        <Button onClick={openCreate}>Create Coupon</Button>
      </header>

      <input
        className="mb-6 w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-body)]"
        placeholder="Search by code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <div className="mb-6">
          <ErrorState title="Something went wrong" message={error} onRetry={load} />
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          message="Create your first coupon to run a discount or free-shipping promotion."
          actionLabel="Create Coupon"
          onAction={openCreate}
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-[length:var(--text-body)]">
            <thead className="border-b border-[var(--color-gray-300)] text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-gray-100)]">
                  <td className="px-4 py-3 font-medium text-[var(--color-black-900)]">{c.code}</td>
                  <td className="px-4 py-3">{formatValue(c)}</td>
                  <td className="px-4 py-3 capitalize">{c.scopeType}</td>
                  <td className="px-4 py-3 text-[length:var(--text-caption)] text-[var(--color-gray-500)]">
                    {c.startDate} → {c.endDate}
                  </td>
                  <td className="px-4 py-3">
                    {c.usageCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-[var(--radius-full)] px-2 py-1 text-[length:var(--text-micro)] ${
                        c.active
                          ? 'bg-[var(--color-success)] text-[var(--color-ivory-50)]'
                          : 'bg-[var(--color-gray-300)] text-[var(--color-gray-700)]'
                      }`}
                    >
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="mr-3 text-[length:var(--text-caption)] text-[var(--color-gold-600)] hover:underline"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-[length:var(--text-caption)] text-[var(--color-error)] hover:underline"
                      onClick={() => toggleActive(c)}
                    >
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-[var(--shadow-modal)]">
            <h2 className="mb-4 text-[length:var(--text-h3)] text-[var(--color-black-900)]">
              {editingId ? 'Edit Coupon' : 'Create Coupon'}
            </h2>

            {formError && (
              <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--color-error)]/10 px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-error)]">
                {formError}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">Code</label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 uppercase"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={!!editingId}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">Type</label>
                  <select
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                    <option value="freeShipping">Free shipping</option>
                  </select>
                </div>
                {form.type !== 'freeShipping' && (
                  <div className="flex-1">
                    <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                      Value {form.type === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">Scope</label>
                <select
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.scopeType}
                  onChange={(e) => setForm({ ...form, scopeType: e.target.value as ScopeType, scopeIds: [] })}
                >
                  <option value="all">All products</option>
                  <option value="product">Specific products</option>
                  <option value="category">Category</option>
                  <option value="collection">Collection</option>
                  <option value="studio">Studio</option>
                </select>
                {form.scopeType !== 'all' && (
                  <input
                    className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2 text-[length:var(--text-caption)]"
                    placeholder="Comma-separated IDs"
                    value={form.scopeIds.join(',')}
                    onChange={(e) =>
                      setForm({ ...form, scopeIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                    }
                  />
                )}
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
                  Minimum order value (₹, optional)
                </label>
                <input
                  type="number"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.minOrderValue ?? ''}
                  onChange={(e) => setForm({ ...form, minOrderValue: e.target.value ? Number(e.target.value) : null })}
                />
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Usage limit (optional)
                </label>
                <input
                  type="number"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.usageLimit ?? ''}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : null })}
                />
              </div>

              <div>
                <label className="mb-1 block text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                  Restrict to customer ID (optional)
                </label>
                <input
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-3 py-2"
                  value={form.specificCustomerId ?? ''}
                  onChange={(e) => setForm({ ...form, specificCustomerId: e.target.value || null })}
                />
              </div>

              <label className="flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-gray-700)]">
                <input
                  type="checkbox"
                  checked={form.firstPurchaseOnly}
                  onChange={(e) => setForm({ ...form, firstPurchaseOnly: e.target.checked })}
                />
                First purchase only
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
