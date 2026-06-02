"use client";

import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

// The $12 embedded checkout, mounted from the clientSecret the publish route returns.
// Stripe owns the whole payment surface (currency/tax/coupon). Key-gated on the public key.
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

export function PublishCheckout({ clientSecret, onClose }: { clientSecret: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, maxWidth: 540, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 8 }}
      >
        {stripePromise ? (
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        ) : (
          <div style={{ padding: 24, color: "#333", fontFamily: "system-ui" }}>
            Stripe’s publishable key isn’t configured in this environment, so the embedded checkout can’t mount here.
            It works on deploy.
          </div>
        )}
      </div>
    </div>
  );
}
