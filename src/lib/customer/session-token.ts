/**
 * Signed, stateless session tokens for local-mode customer accounts (used only
 * when Supabase is not configured — Supabase mode uses real Supabase Auth
 * cookies instead, via `getSupabaseServerClient()`).
 *
 * Kept deliberately free of `next/headers` / `next/navigation` so it can be
 * exercised directly in tests: signing, verification, tampering and expiry
 * are pure functions of a string in, a value out.
 */
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { CUSTOMER_SESSION_MAX_AGE_SECONDS } from "./constants";

export { CUSTOMER_SESSION_COOKIE } from "./constants";

const TOKEN_TTL_MS = CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000;

function secret(): string {
  const fromEnv = process.env.LOCAL_AUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "LOCAL_AUTH_SECRET must be set to run customer accounts in production without Supabase.",
    );
  }
  // Stable per-process dev fallback — fine for local/offline development,
  // never reachable in production (see the throw above).
  return "maison-lumiere-dev-only-secret-do-not-use-in-production";
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", secret()).update(payload).digest());
}

export interface CustomerSessionPayload {
  sub: string; // customer id
  iat: number; // issued-at, ms epoch
  exp: number; // expiry, ms epoch
}

/** Mint a signed token for `customerId`. Opaque — store it in a cookie. */
export function createCustomerSessionToken(customerId: string): string {
  const now = Date.now();
  const payload: CustomerSessionPayload = { sub: customerId, iat: now, exp: now + TOKEN_TTL_MS };
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body)}`;
}

/**
 * Verify a token's signature and expiry. Returns the customer id, or `null`
 * for anything malformed, tampered with, or expired — every failure mode
 * collapses to the same "not signed in" outcome for the caller.
 */
export function verifyCustomerSessionToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: CustomerSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
  if (Date.now() >= payload.exp) return null;
  return payload.sub;
}

export { CUSTOMER_SESSION_MAX_AGE_SECONDS };

/**
 * Test-only: mint a token with an explicit expiry so expiry handling is
 * verifiable without waiting 30 days or mocking `Date.now`. Never used by
 * the app itself — only by `scripts/account-test.ts`.
 */
export function __createTokenWithExpiryForTests(customerId: string, expMs: number): string {
  const payload: CustomerSessionPayload = { sub: customerId, iat: Date.now(), exp: expMs };
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body)}`;
}
