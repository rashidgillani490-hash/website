/**
 * Local (offline-dev) customer accounts. Only used when Supabase is not
 * configured — mirrors what Supabase Auth + `profiles` give you for free:
 * an account keyed by email, a password nobody but this module ever sees in
 * the clear, and lookups by id/email.
 *
 * Storage rides on the same JSON-file store the rest of the local backend
 * uses (`src/lib/admin/local-store.ts`) so it works with zero setup and
 * survives a dev-server restart, exactly like local products/orders do.
 */
import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getTables, persist, randomUUID, now } from "@/lib/admin/local-store";
import type { CustomerRecord } from "@/lib/admin/records";

/** What every caller outside this module gets — never the password hash. */
export interface CustomerAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: string;
}

function toAccount(r: CustomerRecord): CustomerAccount {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    phone: r.phone,
    marketingOptIn: r.marketing_opt_in,
    createdAt: r.created_at,
  };
}

const SCRYPT_KEYLEN = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  // Constant-time compare — never short-circuit on the first differing byte.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

export function findCustomerByEmail(email: string): CustomerRecord | null {
  const e = normalizeEmail(email);
  return getTables().customers.find((c) => c.email === e) ?? null;
}

export function getCustomerRecordById(id: string): CustomerRecord | null {
  return getTables().customers.find((c) => c.id === id) ?? null;
}

export function getCustomerById(id: string): CustomerAccount | null {
  const r = getCustomerRecordById(id);
  return r ? toAccount(r) : null;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  marketingOptIn?: boolean;
}

export type RegisterResult =
  | { ok: true; account: CustomerAccount }
  | { ok: false; error: string };

export function registerCustomer(input: RegisterInput): RegisterResult {
  const email = normalizeEmail(input.email);
  const fullName = String(input.fullName ?? "").trim();
  const password = String(input.password ?? "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (fullName.length < 2) {
    return { ok: false, error: "Enter your full name." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (findCustomerByEmail(email)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const ts = now();
  const record: CustomerRecord = {
    id: randomUUID(),
    email,
    password_hash: hashPassword(password),
    full_name: fullName,
    phone: input.phone?.trim() || null,
    marketing_opt_in: !!input.marketingOptIn,
    created_at: ts,
    updated_at: ts,
  };
  getTables().customers.push(record);
  persist();
  return { ok: true, account: toAccount(record) };
}

export type SignInResult =
  | { ok: true; account: CustomerAccount }
  | { ok: false; error: string };

/**
 * Deliberately returns the same message whether the email is unknown or the
 * password is wrong — never reveal which one it was.
 */
export function verifyCustomerCredentials(email: string, password: string): SignInResult {
  const record = findCustomerByEmail(email);
  if (!record || !verifyPassword(String(password ?? ""), record.password_hash)) {
    return { ok: false, error: "Incorrect email or password." };
  }
  return { ok: true, account: toAccount(record) };
}

export interface ProfilePatch {
  fullName?: string;
  phone?: string | null;
  marketingOptIn?: boolean;
}

export function updateCustomerProfile(id: string, patch: ProfilePatch): CustomerAccount {
  const record = getCustomerRecordById(id);
  if (!record) throw new Error("Account not found.");
  if (patch.fullName !== undefined) {
    const name = patch.fullName.trim();
    if (name.length < 2) throw new Error("Enter your full name.");
    record.full_name = name;
  }
  if (patch.phone !== undefined) record.phone = patch.phone?.trim() || null;
  if (patch.marketingOptIn !== undefined) record.marketing_opt_in = patch.marketingOptIn;
  record.updated_at = now();
  persist();
  return toAccount(record);
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

export function changeCustomerPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): ChangePasswordResult {
  const record = getCustomerRecordById(id);
  if (!record) return { ok: false, error: "Account not found." };
  if (!verifyPassword(currentPassword, record.password_hash)) {
    return { ok: false, error: "Current password is incorrect." };
  }
  if (String(newPassword ?? "").length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  record.password_hash = hashPassword(newPassword);
  record.updated_at = now();
  persist();
  return { ok: true };
}
