// The payment adapter: the $12 publish via a Stripe Checkout Session (embedded). Stripe owns
// every country/currency/tax/coupon — adaptive_pricing + automatic_tax + tax_id_collection +
// billing_address_collection + allow_promotion_codes — so there is no custom currency/tax
// layer. Server-only, key-gated. Params mirror the proven feat-stripe-embedded-checkout route.

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

export function paymentConfigured(): boolean {
  return stripeClient() !== null && Boolean(process.env.STRIPE_PRICE_ID);
}

export async function createPublishCheckout(args: {
  peekId: string;
  curatorId: string;
  appUrl: string;
}): Promise<{ clientSecret: string } | { error: string }> {
  const s = stripeClient();
  const price = process.env.STRIPE_PRICE_ID;
  if (!s || !price) return { error: "payments not configured" };

  const params = {
    ui_mode: "embedded",
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    return_url: `${args.appUrl}/studio?published={CHECKOUT_SESSION_ID}`,
    metadata: { peek_id: args.peekId, curator_id: args.curatorId },
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "auto",
    customer_creation: "always",
    adaptive_pricing: { enabled: true },
    allow_promotion_codes: true,
  } as unknown as Stripe.Checkout.SessionCreateParams;

  const session = await s.checkout.sessions.create(params);
  return session.client_secret ? { clientSecret: session.client_secret } : { error: "no client_secret returned" };
}
