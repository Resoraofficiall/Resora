/**
 * app/checkout/page.tsx
 * RSR-APP-015
 *
 * 4-step checkout (Blueprint §8.1): Shipping → Review → Payment →
 * Confirmation. Payment confirmation and order creation are
 * security-critical and NEVER happen client-side (Global Rule 4) — this
 * page only collects input and calls orderService/initiatePayment; the
 * actual order record is created server-side by the Razorpay webhook
 * Cloud Function (firebase/functions/paymentWebhook.ts, RSR-FBS-006)
 * after payment is verified, not by this component on form submit.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import { getCart, type CartItem } from "@/services/cartService";
import { initiateCheckoutPayment } from "@/services/orderService";
import { useAuth } from "@/hooks/useAuth";

type Step = "shipping" | "review" | "payment";

interface ShippingAddress {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
}

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = React.useState<Step>("shipping");
  const [address, setAddress] = React.useState<ShippingAddress>(EMPTY_ADDRESS);
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = React.useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getCart()
      .then(setItems)
      .catch(() => setError("We couldn't load your cart."))
      .finally(() => setIsLoadingCart(false));
  }, []);

  const subtotalInPaise = items.reduce((sum, item) => sum + item.priceInPaise * item.quantity, 0);

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setStep("review");
  };

  const handleStartPayment = React.useCallback(async () => {
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }
    setError(null);
    setIsProcessingPayment(true);
    try {
      // Server (Cloud Function) creates the payment intent and, on webhook
      // verification, the order itself — this call never creates the
      // order directly from the client.
      const { checkoutUrl } = await initiateCheckoutPayment({
        uid: user.uid,
        shippingAddress: address,
      });
      window.location.href = checkoutUrl;
    } catch {
      setError("We couldn't start your payment. Please try again.");
      setIsProcessingPayment(false);
    }
  }, [user, address, router]);

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-xl">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)] text-center">
            Checkout
          </h1>

          <div className="mt-[var(--space-4)] flex items-center justify-center gap-[var(--space-2)]">
            {(["shipping", "review", "payment"] as Step[]).map((s, index) => (
              <React.Fragment key={s}>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    step === s ? "bg-[var(--color-gold-500)]" : "bg-[var(--color-gray-500)]",
                  ].join(" ")}
                />
                {index < 2 && <span className="h-px w-8 bg-[var(--color-gray-500)]" />}
              </React.Fragment>
            ))}
          </div>

          <Card className="mt-[var(--space-6)]" padding="lg">
            {error && <ErrorState message={error} onRetry={() => setError(null)} className="mb-[var(--space-4)]" />}

            {step === "shipping" && (
              <form onSubmit={handleAddressSubmit} className="flex flex-col gap-[var(--space-3)]">
                <h2 className="text-[var(--text-h3)] text-[var(--color-black-900)]">Shipping Address</h2>
                {(
                  [
                    ["fullName", "Full Name"],
                    ["line1", "Address Line 1"],
                    ["line2", "Address Line 2 (optional)"],
                    ["city", "City"],
                    ["state", "State"],
                    ["postalCode", "Postal Code"],
                    ["phone", "Phone"],
                  ] as [keyof ShippingAddress, string][]
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-[var(--space-1)]">
                    <span className="text-[var(--text-caption)] text-[var(--color-gray-700)]">{label}</span>
                    <input
                      required={field !== "line2"}
                      value={address[field]}
                      onChange={(e) => setAddress((prev) => ({ ...prev, [field]: e.target.value }))}
                      className="h-11 rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-[var(--space-3)] text-[var(--text-body)]"
                    />
                  </label>
                ))}
                <Button type="submit" variant="primary" size="lg" fullWidth className="mt-[var(--space-2)]">
                  Continue to Review
                </Button>
              </form>
            )}

            {step === "review" && (
              <div className="flex flex-col gap-[var(--space-3)]">
                <h2 className="text-[var(--text-h3)] text-[var(--color-black-900)]">Review Order</h2>
                {isLoadingCart ? (
                  <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">Loading cart…</p>
                ) : (
                  <>
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-[var(--text-body)] text-[var(--color-black-900)]">
                        <span>
                          {item.title} × {item.quantity}
                        </span>
                        <span>{formatCurrency(item.priceInPaise * item.quantity, item.currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-[var(--color-gray-300)] pt-[var(--space-2)] font-medium text-[var(--color-black-900)]">
                      <span>Total</span>
                      <span>{formatCurrency(subtotalInPaise, items[0]?.currency ?? "INR")}</span>
                    </div>
                  </>
                )}
                <div className="flex gap-[var(--space-2)] mt-[var(--space-2)]">
                  <Button variant="outline" onClick={() => setStep("shipping")}>
                    Back
                  </Button>
                  <Button variant="primary" fullWidth onClick={() => setStep("payment")}>
                    Continue to Payment
                  </Button>
                </div>
              </div>
            )}

            {step === "payment" && (
              <div className="flex flex-col gap-[var(--space-3)] items-center text-center">
                <h2 className="text-[var(--text-h3)] text-[var(--color-black-900)]">Payment</h2>
                <p className="text-[var(--text-body)] text-[var(--color-gray-700)]">
                  You'll be redirected to our secure payment gateway to complete this order.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isProcessingPayment}
                  onClick={handleStartPayment}
                >
                  Pay {formatCurrency(subtotalInPaise, items[0]?.currency ?? "INR")}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
