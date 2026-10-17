import Stripe from 'stripe';

/** Injection token for the Stripe client; `null` when STRIPE_SECRETKEY is not set (card payments off) */
export const STRIPE = Symbol('STRIPE');

/** Pinned API version (the one stripe@23 is typed for); change both together */
export const STRIPE_API_VERSION = '2026-09-30.endive';

/** Amounts are major units in the shop (e.g. 19.90) and minor units at Stripe (1990) */
export const toMinor = (amount: number) => Math.round(amount * 100);
export const fromMinor = (amount: number) => Math.round(amount) / 100;

/**
 * Creates the client from the environment. `STRIPE_API_BASE` (tests and the e2e server only)
 * points the SDK at a local stub instead of api.stripe.com.
 */
export function createStripe(env: NodeJS.ProcessEnv = process.env): Stripe | null {
  const key = env.STRIPE_SECRETKEY;
  if (!key) return null;
  const base = env.STRIPE_API_BASE ? new URL(env.STRIPE_API_BASE) : null;
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'eshop_mean' },
    ...(base ? { host: base.hostname, port: Number(base.port), protocol: base.protocol === 'http:' ? 'http' : 'https' } : {}),
  });
}
