/**
 * Pluggable payment methods.
 *
 * Checkout renders whatever `getEnabledPaymentMethods()` returns and, on submit,
 * hands the chosen method's id + an optional payload to the order pipeline.
 * Adding a new Pakistani method later (JazzCash, Easypaisa, bank transfer,
 * card) means adding one entry to the registry — the checkout UI, the order
 * pipeline and the confirmation screen are already method-agnostic.
 */

export type PaymentMethodId =
  | "cod"
  | "jazzcash"
  | "easypaisa"
  | "bank_transfer"
  | "card";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
/**
 * The customer-facing order lifecycle. Deliberately independent of
 * `PaymentStatus` — a COD order is "confirmed" long before it is "paid", and
 * "cancelled" here says nothing about whether money changed hands.
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface PaymentMethodDef {
  id: PaymentMethodId;
  label: string;
  /** Short line shown under the radio option. */
  description: string;
  /** Longer copy shown on the confirmation screen. */
  instructions: string;
  enabled: boolean;
  /** COD is settled offline; online methods would capture before/after placing. */
  settlesOnline: boolean;
  /** Order + payment status the moment the order is created with this method. */
  initialOrderStatus: OrderStatus;
  initialPaymentStatus: PaymentStatus;
  /**
   * Validate any method-specific fields the customer submitted. COD only needs
   * an acknowledgement; online methods would validate a token / phone / slip.
   */
  validatePayload(payload: Record<string, unknown> | null | undefined): {
    ok: boolean;
    error?: string;
  };
}
