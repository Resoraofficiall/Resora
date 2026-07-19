"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { customerService } from "@/services/customerService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface Address {
  addressId: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const addressSchema = z.object({
  label: z.string().min(1, "Give this address a label, e.g. Home."),
  fullName: z.string().min(2, "Enter the recipient's full name."),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  line1: z.string().min(3, "Enter the address."),
  line2: z.string().optional(),
  city: z.string().min(2, "Enter a city."),
  state: z.string().min(2, "Enter a state."),
  pincode: z.regex
    ? z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code.")
    : z.string().min(6).max(6),
  isDefault: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

type ViewState = "loading" | "ready" | "empty" | "error";

export default function AddressesPage() {
  useRouteGuard({ requiredRole: "customer" });
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { isDefault: false },
  });

  const loadAddresses = useCallback(async () => {
    if (!user?.uid) return;
    setViewState("loading");
    try {
      const data = await customerService.getAddresses(user.uid);
      setAddresses(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load your addresses."
      );
      setViewState("error");
    }
  }, [user?.uid]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openNewForm = () => {
    setEditingId(null);
    reset({
      label: "",
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: addresses.length === 0,
    });
    setShowForm(true);
  };

  const openEditForm = (address: Address) => {
    setEditingId(address.addressId);
    reset({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
    setShowForm(true);
  };

  const onSubmit = async (values: AddressFormValues) => {
    if (!user?.uid) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      if (editingId) {
        await customerService.updateAddress(user.uid, editingId, values);
      } else {
        await customerService.addAddress(user.uid, values);
      }
      setShowForm(false);
      setEditingId(null);
      await loadAddresses();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save this address."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!user?.uid) return;
    setDeletingId(addressId);
    try {
      await customerService.deleteAddress(user.uid, addressId);
      await loadAddresses();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not delete this address."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.uid) return;
    const previous = addresses;
    setAddresses((current) =>
      current.map((a) => ({ ...a, isDefault: a.addressId === addressId }))
    );
    try {
      await customerService.setDefaultAddress(user.uid, addressId);
    } catch (err) {
      setAddresses(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update default address."
      );
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Saved Addresses
        </h1>
        <LoadingSkeleton variant="list" count={3} />
      </div>
    );
  }

  if (viewState === "error" && !showForm) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Saved Addresses
        </h1>
        <ErrorState message={errorMessage} onRetry={loadAddresses} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-h1 text-black-900">
          Saved Addresses
        </h1>
        {!showForm && (
          <Button variant="primary" onClick={openNewForm}>
            Add Address
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-10 rounded-md bg-ivory-50 p-6 shadow-card"
        >
          <h2 className="font-display text-h3 text-black-900 mb-6">
            {editingId ? "Edit Address" : "New Address"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-caption text-gray-700">
                Label
              </label>
              <input
                {...register("label")}
                placeholder="Home, Office, etc."
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.label && (
                <p className="mt-1 text-micro text-error">
                  {errors.label.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-caption text-gray-700">
                Full Name
              </label>
              <input
                {...register("fullName")}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.fullName && (
                <p className="mt-1 text-micro text-error">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-caption text-gray-700">
                Phone
              </label>
              <input
                {...register("phone")}
                placeholder="9876543210"
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.phone && (
                <p className="mt-1 text-micro text-error">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-caption text-gray-700">
                Address Line 1
              </label>
              <input
                {...register("line1")}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.line1 && (
                <p className="mt-1 text-micro text-error">
                  {errors.line1.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-caption text-gray-700">
                Address Line 2 (optional)
              </label>
              <input
                {...register("line2")}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-caption text-gray-700">
                City
              </label>
              <input
                {...register("city")}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.city && (
                <p className="mt-1 text-micro text-error">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-caption text-gray-700">
                State
              </label>
              <input
                {...register("state")}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.state && (
                <p className="mt-1 text-micro text-error">
                  {errors.state.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-caption text-gray-700">
                PIN Code
              </label>
              <input
                {...register("pincode")}
                placeholder="560001"
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
              {errors.pincode && (
                <p className="mt-1 text-micro text-error">
                  {errors.pincode.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="isDefault"
                type="checkbox"
                {...register("isDefault")}
                className="h-4 w-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500"
              />
              <label htmlFor="isDefault" className="text-caption text-gray-700">
                Set as default address
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" variant="primary" loading={submitting}>
              {editingId ? "Save Changes" : "Save Address"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {viewState === "empty" && !showForm && (
        <EmptyState
          title="No addresses saved yet."
          description="Add an address to make checkout faster next time."
          actionLabel="Add Address"
          onAction={openNewForm}
        />
      )}

      {addresses.length > 0 && (
        <div className="flex flex-col gap-4">
          {addresses.map((address) => (
            <div
              key={address.addressId}
              className="rounded-md bg-ivory-50 p-5 shadow-card"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-body font-medium text-black-900">
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-micro text-gold-600">
                    Default
                  </span>
                )}
              </div>
              <p className="text-body text-gray-700">{address.fullName}</p>
              <p className="text-caption text-gray-500">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                {address.state} - {address.pincode}
              </p>
              <p className="text-caption text-gray-500">{address.phone}</p>

              <div className="mt-4 flex flex-wrap gap-4 text-caption">
                <button
                  type="button"
                  onClick={() => openEditForm(address)}
                  className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gold-600"
                >
                  Edit
                </button>
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(address.addressId)}
                    className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gold-600"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(address.addressId)}
                  disabled={deletingId === address.addressId}
                  className="text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-error disabled:opacity-50"
                >
                  {deletingId === address.addressId ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
