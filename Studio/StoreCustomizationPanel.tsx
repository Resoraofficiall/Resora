"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { Studio } from "@/types/schema";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorState from "@/components/ErrorState";

/**
 * RSR-STU-004 — Store Customization Panel.
 * §30.8.1: sellers customize their store only within founder-approved
 * bounds — theme, hero, collection order, gallery layout, font pairing,
 * spacing density, background treatment, section order, and animation
 * preset. 🔒 LOCKED: no custom CSS field, no free-text color-hex input,
 * anywhere in this component.
 *
 * Every option list here is read live from
 * settings/storeCustomizationOptions (Phase 3 amendment, Ch.30 §30.8.1) —
 * never hardcoded — so /admin/store-customization (Phase 10) can add or
 * remove options without a redeploy. Per that same amendment: if the
 * seller's current selection is later removed from the founder's option
 * list, it must still render as a valid, selected choice (just not
 * re-offered to other sellers) — never silently reset.
 */

export interface StoreCustomizationValue {
  themeId: string;
  fontPairingId: string;
  spacingDensity: "compact" | "standard" | "airy";
  backgroundTreatmentId: string;
  galleryLayoutId: string;
  animationPresetId: string;
  sectionOrder: string[];
}

interface CustomizationOption {
  id: string;
  label: string;
  previewUrl?: string;
}

interface StoreCustomizationOptionsDoc {
  themes: CustomizationOption[];
  fontPairings: CustomizationOption[];
  spacingPresets: { id: "compact" | "standard" | "airy"; label: string }[];
  backgroundTreatments: CustomizationOption[];
  galleryLayouts: CustomizationOption[];
  animationPresets: CustomizationOption[];
  allowedSections: { id: string; label: string }[];
}

export interface StoreCustomizationPanelProps {
  studioId: string;
  current: StoreCustomizationValue;
  onSaved?: (next: StoreCustomizationValue) => void;
}

export default function StoreCustomizationPanel({
  studioId,
  current,
  onSaved,
}: StoreCustomizationPanelProps) {
  const [options, setOptions] = useState<StoreCustomizationOptionsDoc | null>(null);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<StoreCustomizationValue>(current);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, "settings", "storeCustomizationOptions");
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setOptions(snap.data() as StoreCustomizationOptionsDoc);
        } else {
          setError(true);
        }
      },
      () => setError(true)
    );
    return () => unsubscribe();
  }, []);

  const update = <K extends keyof StoreCustomizationValue>(
    key: K,
    value: StoreCustomizationValue[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const moveSectionOrder = (id: string, direction: -1 | 1) => {
    setDraft((prev) => {
      const order = [...prev.sectionOrder];
      const idx = order.indexOf(id);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return prev;
      [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
      return { ...prev, sectionOrder: order };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, "studios", studioId), {
        storeCustomization: draft,
        updatedAt: new Date().toISOString(),
      });
      onSaved?.(draft);
    } catch {
      setSaveError("Couldn't save your changes — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <ErrorState
        message="Couldn't load customization options."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!options) {
    return <LoadingSkeleton variant="panel" />;
  }

  // Ensure the seller's currently-selected values are always rendered even
  // if since removed from the founder's live option list (§30.8.1 rule:
  // existing selection persists as valid until the seller changes it).
  const withCurrentEnsured = (
    list: CustomizationOption[],
    currentId: string
  ): CustomizationOption[] => {
    if (list.some((o) => o.id === currentId)) return list;
    if (!currentId) return list;
    return [...list, { id: currentId, label: `${currentId} (no longer offered)` }];
  };

  return (
    <div className="max-w-2xl space-y-8">
      <OptionGroup
        label="Theme"
        options={withCurrentEnsured(options.themes, draft.themeId)}
        selectedId={draft.themeId}
        onSelect={(id) => update("themeId", id)}
      />

      <OptionGroup
        label="Font Pairing"
        options={withCurrentEnsured(options.fontPairings, draft.fontPairingId)}
        selectedId={draft.fontPairingId}
        onSelect={(id) => update("fontPairingId", id)}
      />

      <OptionGroup
        label="Gallery Layout"
        options={withCurrentEnsured(options.galleryLayouts, draft.galleryLayoutId)}
        selectedId={draft.galleryLayoutId}
        onSelect={(id) => update("galleryLayoutId", id)}
      />

      <OptionGroup
        label="Background Treatment"
        options={withCurrentEnsured(options.backgroundTreatments, draft.backgroundTreatmentId)}
        selectedId={draft.backgroundTreatmentId}
        onSelect={(id) => update("backgroundTreatmentId", id)}
      />

      <OptionGroup
        label="Entrance / Scroll Animation"
        options={withCurrentEnsured(options.animationPresets, draft.animationPresetId)}
        selectedId={draft.animationPresetId}
        onSelect={(id) => update("animationPresetId", id)}
      />

      <div className="space-y-2">
        <span className="text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gray-700)]">
          Spacing Density
        </span>
        <div className="flex gap-2">
          {options.spacingPresets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={draft.spacingDensity === p.id}
              onClick={() => update("spacingDensity", p.id)}
              className={[
                "rounded-[var(--radius-sm)] border px-4 py-2 text-[var(--text-body)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)]",
                draft.spacingDensity === p.id
                  ? "border-[var(--color-gold-500)] bg-[var(--color-gold-100)] text-[var(--color-black-900)]"
                  : "border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] text-[var(--color-gray-700)] hover:border-[var(--color-gold-500)]",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gray-700)]">
          Store Section Order
        </span>
        <ul className="divide-y divide-[var(--color-gray-100)] rounded-[var(--radius-md)] border border-[var(--color-gray-100)]">
          {draft.sectionOrder.map((sectionId, i) => {
            const meta = options.allowedSections.find((s) => s.id === sectionId);
            return (
              <li
                key={sectionId}
                className="flex items-center justify-between px-4 py-3 text-[var(--text-body)] text-[var(--color-black-900)]"
              >
                <span>{meta?.label ?? sectionId}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => moveSectionOrder(sectionId, -1)}
                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-gray-500)] hover:text-[var(--color-black-900)] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === draft.sectionOrder.length - 1}
                    onClick={() => moveSectionOrder(sectionId, 1)}
                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-gray-500)] hover:text-[var(--color-black-900)] disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {saveError && (
        <p className="text-[var(--text-caption)] text-[var(--color-error)]">{saveError}</p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-[var(--radius-sm)] bg-[var(--color-gold-500)] px-6 py-3 text-[var(--text-body)] font-medium text-[var(--color-black-900)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)] hover:bg-[var(--color-gold-600)] hover:shadow-[var(--shadow-gold-glow)] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function OptionGroup({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: CustomizationOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gray-700)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={selectedId === opt.id}
            onClick={() => onSelect(opt.id)}
            className={[
              "rounded-[var(--radius-sm)] border px-4 py-2 text-[var(--text-body)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)]",
              selectedId === opt.id
                ? "border-[var(--color-gold-500)] bg-[var(--color-gold-100)] text-[var(--color-black-900)]"
                : "border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] text-[var(--color-gray-700)] hover:border-[var(--color-gold-500)]",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
