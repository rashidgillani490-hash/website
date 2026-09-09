/**
 * Pure constants shared between the (Node-only) session-token module and
 * `src/middleware.ts`, which runs on the Edge runtime and cannot import
 * `node:crypto` — so this file must never import anything Node-specific.
 */
export const CUSTOMER_SESSION_COOKIE = "ml_customer_session";
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
