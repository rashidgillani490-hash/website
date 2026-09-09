import type { PaymentMethodDef, PaymentMethodId } from "./types";

/** Cash on Delivery — the launch method. */
const cod: PaymentMethodDef = {
  id: "cod",
  label: "Cash on Delivery",
  description: "Pay in cash to the courier when your order arrives.",
  instructions:
    "Please keep the exact amount ready. Our courier will collect payment on delivery. You'll get an SMS and email once the order ships.",
  enabled: true,
  settlesOnline: false,
  initialOrderStatus: "pending",
  initialPaymentStatus: "unpaid",
  validatePayload() {
    // COD needs no payment data. (The checkout requires an acknowledgement
    // checkbox; that's a UX gate, not order data.)
    return { ok: true };
  },
};

/* ---------------------------------------------------------------------------
 * Not yet enabled — kept here so the checkout, order pipeline and confirmation
 * screen never need to change to add them. Flip `enabled` and implement
 * `validatePayload` (and, if the method captures online, a begin/confirm step
 * in the order action) when integrating.
 * ------------------------------------------------------------------------- */

const jazzcash: PaymentMethodDef = {
  id: "jazzcash",
  label: "JazzCash",
  description: "Pay from your JazzCash mobile wallet.",
  instructions: "You'll be redirected to JazzCash to authorise the payment.",
  enabled: false,
  settlesOnline: true,
  initialOrderStatus: "pending",
  initialPaymentStatus: "pending",
  validatePayload(p) {
    return p?.jazzcashMobile ? { ok: true } : { ok: false, error: "JazzCash mobile number required." };
  },
};

const easypaisa: PaymentMethodDef = {
  id: "easypaisa",
  label: "Easypaisa",
  description: "Pay from your Easypaisa mobile account.",
  instructions: "You'll be redirected to Easypaisa to authorise the payment.",
  enabled: false,
  settlesOnline: true,
  initialOrderStatus: "pending",
  initialPaymentStatus: "pending",
  validatePayload(p) {
    return p?.easypaisaMobile ? { ok: true } : { ok: false, error: "Easypaisa mobile number required." };
  },
};

const bankTransfer: PaymentMethodDef = {
  id: "bank_transfer",
  label: "Bank Transfer",
  description: "Transfer to our account and upload the receipt.",
  instructions:
    "Transfer the total to the account shown after checkout and upload your deposit slip. We verify within 24 hours.",
  enabled: false,
  settlesOnline: false,
  initialOrderStatus: "pending",
  initialPaymentStatus: "pending",
  validatePayload() {
    return { ok: true };
  },
};

const card: PaymentMethodDef = {
  id: "card",
  label: "Debit / Credit Card",
  description: "Visa, Mastercard — secured by our payment partner.",
  instructions: "Card payments are processed securely by our payment partner.",
  enabled: false,
  settlesOnline: true,
  initialOrderStatus: "pending",
  initialPaymentStatus: "pending",
  validatePayload(p) {
    return p?.token ? { ok: true } : { ok: false, error: "Card authorisation missing." };
  },
};

export const PAYMENT_METHODS: Record<PaymentMethodId, PaymentMethodDef> = {
  cod,
  jazzcash,
  easypaisa,
  bank_transfer: bankTransfer,
  card,
};

/**
 * Whether COD is currently offered is an admin setting
 * (`CommerceSettings.codEnabled`, Admin → Settings), on top of the structural
 * `enabled` flag above (which says whether a method is *implemented* at all —
 * JazzCash/Easypaisa/etc. stay structurally disabled until they're built).
 * Every other method today has no runtime toggle, so it defaults to "on".
 */
export function isPaymentMethodRuntimeEnabled(
  method: PaymentMethodDef,
  settings: { codEnabled: boolean },
): boolean {
  if (!method.enabled) return false;
  if (method.id === "cod") return settings.codEnabled;
  return true;
}

export function getPaymentMethod(
  id: string,
  settings?: { codEnabled: boolean },
): PaymentMethodDef | null {
  const method = (PAYMENT_METHODS as Record<string, PaymentMethodDef>)[id] ?? null;
  if (!method) return null;
  if (settings && !isPaymentMethodRuntimeEnabled(method, settings)) return null;
  return method;
}

export function getEnabledPaymentMethods(settings: { codEnabled: boolean }): PaymentMethodDef[] {
  return Object.values(PAYMENT_METHODS).filter((m) => isPaymentMethodRuntimeEnabled(m, settings));
}

export function getUpcomingPaymentMethods(settings: { codEnabled: boolean }): PaymentMethodDef[] {
  return Object.values(PAYMENT_METHODS).filter((m) => !isPaymentMethodRuntimeEnabled(m, settings));
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethodId = "cod";
