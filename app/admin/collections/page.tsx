/**
 * app/admin/collections/page.tsx
 * RSR-APP-041
 *
 * Founder CMS for /collection curation (e.g. "Festive Edit", "New This
 * Month" — manually curated product groupings, distinct from category
 * taxonomy). Zero hardcoding (§1.2 rule 2): collections and their
 * product membership live in Firestore.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { cmsService } from "@/services/cmsService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface Collection {
  collectionId: string;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string;
  productCount: number;
  active: boolean;
  featured: boolean;
}

type ViewState = "loading" | "ready" | "empty" | "error";

export default function AdminCollectionsPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [collections, setCollections] = useState<Collection[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setViewState("loading");
    try {
      const data = await cmsService.getCollections();
      setCollections(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load collections."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setShowNewForm(true);
  };

  const openEditForm = (collection: Collection) => {
    setEditingId(collection.collectionId);
    setFormName(collection.name);
    setFormSlug(collection.slug);
    setFormDescription(collection.description);
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
        await cmsService.updateCollection(editingId, {
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim(),
        });
      } else {
        await cmsService.createCollection({
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim(),
        });
      }
      setShowNewForm(false);
      setEditingId(null);
      await loadCollections();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save this collection."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (collection: Collection) => {
    setTogglingId(collection.collectionId);
    const previous = collections;
    setCollections((current) =>
      current.map((c) =>
        c.collectionId === collection.collectionId
          ? { ...c, featured: !c.featured }
          : c
      )
    );
    try {
      await cmsService.setCollectionFeatured(
        collection.collectionId,
        !collection.featured
      );
    } catch (err) {
      setCollections(previous);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not update this collection."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleActive = async (collection: Collection) => {
    const previous = collections;
    setCollections((current) =>
      current.map((c) =>
        c.collectionId === collection.collectionId
          ? { ...c, active: !c.active }
          : c
      )
    );
    try {
      await cmsService.setCollectionActive(
        collection.collectionId,
        !collection.active
      );
    } catch (err) {
      setCollections(previous);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not update this collection."
      );
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Collections
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error" && !showNewForm) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Collections
        </h1>
        <ErrorState message={errorMessage} onRetry={loadCollections} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-h1 text-black-900">Collections</h1>
        {!showNewForm && (
          <Button variant="primary" onClick={openNewForm}>
            Add Collection
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
            {editingId ? "Edit Collection" : "New Collection"}
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
                placeholder="festive-edit"
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
              {editingId ? "Save Changes" : "Create Collection"}
            </Button>
            <Button variant="ghost" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {viewState === "empty" && !showNewForm ? (
        <EmptyState
          title="No collections yet."
          description="Curate a themed grouping of products to feature across the site."
          actionLabel="Add Collection"
          onAction={openNewForm}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {collections.map((collection) => (
            <div
              key={collection.collectionId}
              className="flex items-center gap-4 rounded-md bg-ivory-50 p-4 shadow-card"
            >
              <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-gray-100">
                <Image
                  src={collection.bannerUrl}
                  alt={collection.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body text-black-900">{collection.name}</p>
                <p className="text-caption text-gray-500">
                  /{collection.slug} · {collection.productCount} products
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-micro ${
                    collection.active
                      ? "bg-success/10 text-success"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {collection.active ? "Active" : "Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleFeatured(collection)}
                  disabled={togglingId === collection.collectionId}
                  className={`text-caption underline decoration-gray-300 underline-offset-2 disabled:opacity-50 ${
                    collection.featured
                      ? "text-gold-600"
                      : "text-gray-700 hover:text-gold-600"
                  }`}
                >
                  {collection.featured ? "Featured" : "Feature"}
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(collection)}
                  className="text-caption text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gold-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(collection)}
                  className="text-caption text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-error"
                >
                  {collection.active ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
