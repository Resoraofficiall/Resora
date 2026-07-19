/**
 * app/admin/categories/page.tsx
 * RSR-APP-040
 *
 * Founder CMS for /category taxonomy. Zero hardcoding principle
 * (Blueprint §1.2, rule 2) — categories live in Firestore, editable
 * here, and drive both public /category/{slug} pages and the
 * categoryCardMap used by the Canvas Engine (§30.9.1).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { cmsService } from "@/services/cmsService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface Category {
  categoryId: string;
  name: string;
  slug: string;
  imageUrl: string;
  description: string;
  displayOrder: number;
  active: boolean;
}

type ViewState = "loading" | "ready" | "empty" | "error";

export default function AdminCategoriesPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [categories, setCategories] = useState<Category[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setViewState("loading");
    try {
      const data = await cmsService.getCategories();
      setCategories(data.sort((a, b) => a.displayOrder - b.displayOrder));
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load categories."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setShowNewForm(true);
  };

  const openEditForm = (category: Category) => {
    setEditingId(category.categoryId);
    setFormName(category.name);
    setFormSlug(category.slug);
    setFormDescription(category.description);
    setShowNewForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      setErrorMessage("Name and slug are required.");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    try {
      if (editingId) {
        await cmsService.updateCategory(editingId, {
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim(),
        });
      } else {
        await cmsService.createCategory({
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim(),
        });
      }
      setShowNewForm(false);
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save this category."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    const previous = categories;
    setCategories((current) =>
      current.map((c) =>
        c.categoryId === category.categoryId
          ? { ...c, active: !c.active }
          : c
      )
    );
    try {
      await cmsService.setCategoryActive(category.categoryId, !category.active);
    } catch (err) {
      setCategories(previous);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not update this category."
      );
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Categories
        </h1>
        <LoadingSkeleton variant="list" count={5} />
      </div>
    );
  }

  if (viewState === "error" && !showNewForm) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Categories
        </h1>
        <ErrorState message={errorMessage} onRetry={loadCategories} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-h1 text-black-900">Categories</h1>
        {!showNewForm && (
          <Button variant="primary" onClick={openNewForm}>
            Add Category
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {showNewForm && (
        <div className="mb-8 rounded-md bg-ivory-50 p-6 shadow-card">
          <h2 className="font-display text-h3 text-black-900 mb-4">
            {editingId ? "Edit Category" : "New Category"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="mb-1 block text-caption text-gray-700">
                Name
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-caption text-gray-700">
                Slug
              </label>
              <input
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="wall-clocks"
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-caption text-gray-700">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
            <Button variant="ghost" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {viewState === "empty" && !showNewForm ? (
        <EmptyState
          title="No categories yet."
          description="Add your first category to organize products across the marketplace."
          actionLabel="Add Category"
          onAction={openNewForm}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((category) => (
            <div
              key={category.categoryId}
              className="flex items-center justify-between rounded-md bg-ivory-50 p-4 shadow-card"
            >
              <div>
                <p className="text-body text-black-900">{category.name}</p>
                <p className="text-caption text-gray-500">/{category.slug}</p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-micro ${
                    category.active
                      ? "bg-success/10 text-success"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {category.active ? "Active" : "Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => openEditForm(category)}
                  className="text-caption text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gold-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(category)}
                  className="text-caption text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-error"
                >
                  {category.active ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
            }
