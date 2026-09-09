/**
 * Checkout customer/delivery validation. Pure — the client uses it for inline
 * errors and the `createOrderAction` server action runs it again before it
 * trusts anything. The server result is authoritative.
 */

import { isProvince, isValidMobile, isValidPostalCode, normalizeMobile } from "@/lib/pakistan";
import type { CheckoutCustomerDetails, CheckoutFieldErrors } from "./types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ValidatedCustomer {
  ok: boolean;
  errors: CheckoutFieldErrors;
  /** Present only when `ok` — trimmed & normalised, safe to persist. */
  value?: CheckoutCustomerDetails;
}

export function validateCheckoutCustomer(
  input: Partial<CheckoutCustomerDetails> | null | undefined,
): ValidatedCustomer {
  const i = input ?? {};
  const errors: CheckoutFieldErrors = {};

  const fullName = String(i.fullName ?? "").replace(/\s+/g, " ").trim();
  if (fullName.length < 3) errors.fullName = "Please enter your full name.";
  else if (fullName.length > 80) errors.fullName = "That name is too long.";

  const mobileRaw = String(i.mobile ?? "").trim();
  if (!isValidMobile(mobileRaw)) {
    errors.mobile = "Enter a valid Pakistani mobile number (e.g. 0301 2345678).";
  }

  const email = String(i.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const province = String(i.province ?? "").trim();
  if (!isProvince(province)) errors.province = "Select your province.";

  const city = String(i.city ?? "").replace(/\s+/g, " ").trim();
  if (city.length < 2) errors.city = "Enter your city.";
  else if (city.length > 60) errors.city = "That city name is too long.";

  const area = String(i.area ?? "").replace(/\s+/g, " ").trim();
  if (area.length < 2) errors.area = "Enter your area / locality.";
  else if (area.length > 80) errors.area = "That area name is too long.";

  const address = String(i.address ?? "").replace(/\s+/g, " ").trim();
  if (address.length < 10) errors.address = "Enter your complete street address.";
  else if (address.length > 250) errors.address = "That address is too long.";

  const postalCode = String(i.postalCode ?? "").trim();
  if (!isValidPostalCode(postalCode)) errors.postalCode = "Postal code must be 5 digits.";

  const notes = String(i.notes ?? "").trim();
  if (notes.length > 500) errors.notes = "Order notes are limited to 500 characters.";

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok
      ? {
          fullName,
          mobile: normalizeMobile(mobileRaw),
          email,
          province,
          city,
          area,
          address,
          postalCode,
          notes: notes || undefined,
        }
      : undefined,
  };
}
