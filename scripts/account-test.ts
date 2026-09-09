/**
 * Phase 7 — customer accounts & order management.
 *
 *   npm run account:test
 *
 * Covers, all against the LocalAdminRepo / local customer store (the same
 * shape the Supabase backend has — see `npm run db:validate` for the
 * equivalent checks run against real Postgres RLS):
 *
 *   local account registration & sign-in · session tokens (sign / verify /
 *   tamper / expire) · profile & password updates · order ↔ account linking ·
 *   "customers only see their own orders" ownership scoping · the admin order
 *   pipeline (search/filter, status history, tracking, cancel-with-restock) ·
 *   the staff auth gate (`requireStaff`) refusing an unauthenticated caller.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { LocalAdminRepo } from "../src/lib/admin/local-repo.ts";
import { resetLocalStore } from "../src/lib/admin/local-store.ts";
import {
  registerCustomer,
  verifyCustomerCredentials,
  updateCustomerProfile,
  changeCustomerPassword,
  getCustomerById,
} from "../src/lib/customer/local-accounts.ts";
import {
  createCustomerSessionToken,
  verifyCustomerSessionToken,
  __createTokenWithExpiryForTests,
} from "../src/lib/customer/session-token.ts";
import { getMyOrders, getMyOrder } from "../src/lib/customer/orders.ts";
import { getAdminSession, requireStaff } from "../src/lib/auth.ts";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "../src/lib/admin/records.ts";
import type { CheckoutCustomerDetails } from "../src/lib/checkout/types.ts";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const rec = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};
async function expectThrow(fn: () => Promise<unknown>, label: string, match?: RegExp) {
  try {
    await fn();
    rec(label, false, "expected an error");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    rec(label, match ? match.test(msg) : true, match && !match.test(msg) ? msg : undefined);
  }
}
function expectRedirectTo(err: unknown, path: string): boolean {
  const digest = (err as { digest?: string })?.digest ?? "";
  return digest.startsWith("NEXT_REDIRECT") && digest.includes(path);
}
const section = (title: string) => console.log(`\n${title}\n${"-".repeat(title.length)}`);

const ADDRESS: CheckoutCustomerDetails = {
  fullName: "Zara Malik",
  mobile: "0301 2345678",
  email: "zara@example.com",
  province: "Sindh",
  city: "Karachi",
  area: "Clifton Block 5",
  address: "House 8, Lane 3, near Do Talwar",
  postalCode: "75600",
};

async function main() {
  resetLocalStore();
  const repo = new LocalAdminRepo();

  /* ============================================== 1 · account registration */
  section("Local account registration");
  const reg = registerCustomer({
    email: "Zara@Example.com",
    password: "correct-horse-battery",
    fullName: "Zara Malik",
    phone: "03012345678",
    marketingOptIn: true,
  });
  rec("registration succeeds with valid input", reg.ok);
  const zaraId = reg.ok ? reg.account.id : "";
  rec("email is stored lower-cased", reg.ok && reg.account.email === "zara@example.com");

  const dupe = registerCustomer({
    email: "zara@example.com",
    password: "another-password",
    fullName: "Zara Duplicate",
  });
  rec("duplicate email is rejected", !dupe.ok);

  rec(
    "weak password is rejected",
    !registerCustomer({ email: "weak@example.com", password: "short", fullName: "Weak" }).ok,
  );
  rec(
    "invalid email is rejected",
    !registerCustomer({ email: "not-an-email", password: "longenoughpw", fullName: "Nobody" }).ok,
  );

  /* ===================================================== 2 · sign-in */
  section("Sign-in");
  const goodLogin = verifyCustomerCredentials("ZARA@EXAMPLE.COM", "correct-horse-battery");
  rec("sign-in succeeds with the right password (case-insensitive email)", goodLogin.ok);

  const wrongPw = verifyCustomerCredentials("zara@example.com", "wrong-password");
  const unknownEmail = verifyCustomerCredentials("nobody@example.com", "whatever12345");
  rec("wrong password is rejected", !wrongPw.ok);
  rec("unknown email is rejected", !unknownEmail.ok);
  rec(
    "wrong-password and unknown-email fail identically (no user enumeration)",
    !wrongPw.ok && !unknownEmail.ok && wrongPw.error === unknownEmail.error,
  );

  /* ============================================== 3 · profile & password */
  section("Profile & password management");
  const updated = updateCustomerProfile(zaraId, { fullName: "Zara A. Malik", phone: "03009998888" });
  rec("profile update applies", updated.fullName === "Zara A. Malik" && updated.phone === "03009998888");
  rec("profile update persists", getCustomerById(zaraId)?.fullName === "Zara A. Malik");

  const badCurrent = changeCustomerPassword(zaraId, "not-the-password", "new-password-123");
  rec("password change rejects a wrong current password", !badCurrent.ok);
  const tooShort = changeCustomerPassword(zaraId, "correct-horse-battery", "short");
  rec("password change rejects a too-short new password", !tooShort.ok);
  const changed = changeCustomerPassword(zaraId, "correct-horse-battery", "new-password-123");
  rec("password change succeeds with the right current password", changed.ok);
  rec(
    "old password no longer works after a change",
    !verifyCustomerCredentials("zara@example.com", "correct-horse-battery").ok,
  );
  rec(
    "new password works after a change",
    verifyCustomerCredentials("zara@example.com", "new-password-123").ok,
  );

  /* =============================================== 4 · session tokens */
  section("Session tokens");
  const token = createCustomerSessionToken(zaraId);
  rec("a fresh token verifies back to the same customer id", verifyCustomerSessionToken(token) === zaraId);
  rec("an empty/undefined token is rejected", verifyCustomerSessionToken(undefined) === null);
  rec("garbage input is rejected", verifyCustomerSessionToken("not-a-token") === null);

  const [body, sig] = token.split(".");
  rec("a tampered signature is rejected", verifyCustomerSessionToken(`${body}.${sig.slice(0, -2)}XX`) === null);
  const forgedBody = Buffer.from(JSON.stringify({ sub: "someone-else", iat: Date.now(), exp: Date.now() + 999999 })).toString("base64url");
  rec("a forged body with the old signature is rejected", verifyCustomerSessionToken(`${forgedBody}.${sig}`) === null);

  const expired = __createTokenWithExpiryForTests(zaraId, Date.now() - 1000);
  rec("an expired token is rejected", verifyCustomerSessionToken(expired) === null);
  const notYetExpired = __createTokenWithExpiryForTests(zaraId, Date.now() + 60_000);
  rec("a not-yet-expired token still verifies", verifyCustomerSessionToken(notYetExpired) === zaraId);

  /* ======================================= 5 · order status vocabulary */
  section("Order status vocabulary");
  rec(
    "the flow matches the spec exactly (Pending → … → Delivered, plus Cancelled)",
    ORDER_STATUS_FLOW.join(",") === "pending,confirmed,processing,shipped,out_for_delivery,delivered",
  );
  rec(
    "every status has a human label",
    [...ORDER_STATUS_FLOW, "cancelled" as const].every((s) => !!ORDER_STATUS_LABELS[s]),
  );
  rec("out_for_delivery reads as 'Out for delivery'", ORDER_STATUS_LABELS.out_for_delivery === "Out for delivery");

  /* ========================================= 6 · orders ↔ account linking */
  section("Placing orders as a signed-in customer");
  const list = await repo.listProducts({ pageSize: 5 });
  const productA = list.items[0];
  const productB = list.items[1];
  const detailA = (await repo.getProduct(productA.id))!;
  const detailB = (await repo.getProduct(productB.id))!;
  const skuA = detailA.variants[0].sku;
  const skuB = detailB.variants[0].sku;

  const reg2 = registerCustomer({ email: "hassan@example.com", password: "another-long-pw", fullName: "Hassan Raza" });
  const hassanId = reg2.ok ? reg2.account.id : "";

  const zaraOrder = await repo.createOrder({
    customer: ADDRESS,
    paymentMethod: "cod",
    customerId: zaraId,
    lines: [{ productId: productA.id, variantSku: skuA, quantity: 1 }],
  });
  const hassanOrder = await repo.createOrder({
    customer: { ...ADDRESS, fullName: "Hassan Raza", email: "hassan@example.com" },
    paymentMethod: "cod",
    customerId: hassanId,
    lines: [{ productId: productB.id, variantSku: skuB, quantity: 1 }],
  });
  const guestOrder = await repo.createOrder({
    customer: ADDRESS,
    paymentMethod: "cod",
    lines: [{ productId: productA.id, variantSku: skuA, quantity: 1 }],
  });

  /* =========================================== 7 · ownership enforcement */
  section("Authorization — customers only see their own orders");
  const zaraOrders = await getMyOrders(zaraId);
  rec("a customer's order list contains only their own order", zaraOrders.length === 1 && zaraOrders[0].id === zaraOrder.orderId);

  const hassanOrders = await getMyOrders(hassanId);
  rec("a different customer's order list is disjoint from the first's", !hassanOrders.some((o) => o.id === zaraOrder.orderId));

  rec("a customer can open their own order", (await getMyOrder(zaraId, zaraOrder.orderId)) !== null);
  rec(
    "a customer opening another customer's order gets null — not the order",
    (await getMyOrder(zaraId, hassanOrder.orderId)) === null,
  );
  rec(
    "the reverse holds too",
    (await getMyOrder(hassanId, zaraOrder.orderId)) === null,
  );
  rec(
    "a guest order (no account) is invisible to any account",
    (await getMyOrder(zaraId, guestOrder.orderId)) === null &&
      (await getMyOrder(hassanId, guestOrder.orderId)) === null,
  );
  rec(
    "an unregistered id sees nothing, not an error",
    (await getMyOrders("not-a-real-customer-id")).length === 0,
  );

  const zaraDetail = await getMyOrder(zaraId, zaraOrder.orderId);
  rec("a customer's own order detail resolves their account as the customer panel", zaraDetail?.customer.isRegistered === true && zaraDetail?.customer.fullName === "Zara A. Malik");
  const guestDetail = await repo.getOrder(guestOrder.orderId);
  rec("a guest order's customer panel reflects the checkout contact, not an account", guestDetail?.customer.isRegistered === false);

  /* ================================================ 8 · admin order pipeline */
  section("Admin — search, filter, status history, tracking, cancellation");

  const bySearch = await repo.listOrders({ search: zaraOrder.orderNumber });
  rec("admin search matches by order number", bySearch.items.length === 1 && bySearch.items[0].id === zaraOrder.orderId);
  const byEmailSearch = await repo.listOrders({ search: "hassan@example.com" });
  rec("admin search matches by email", byEmailSearch.items.some((o) => o.id === hassanOrder.orderId));
  const byStatus = await repo.listOrders({ status: "pending" });
  rec("admin status filter narrows the list", byStatus.items.every((o) => o.status === "pending") && byStatus.items.length >= 3);
  const byMethod = await repo.listOrders({ paymentMethod: "cod" });
  rec("admin payment-method filter matches", byMethod.items.length === byMethod.total);
  const byNoMatch = await repo.listOrders({ search: "no-such-order-anywhere" });
  rec("admin search with no matches returns an empty page, not an error", byNoMatch.items.length === 0 && byNoMatch.total === 0);

  await repo.setOrderStatus(zaraOrder.orderId, "confirmed", "Payment verified over the phone.");
  const afterConfirm = await repo.getOrder(zaraOrder.orderId);
  rec("status change is reflected on the order", afterConfirm?.order.status === "confirmed");
  rec(
    "status change is appended to history with its note",
    !!afterConfirm?.statusHistory.some((h) => h.status === "confirmed" && h.note === "Payment verified over the phone."),
  );
  const historyLenAfterConfirm = afterConfirm!.statusHistory.length;
  await repo.setOrderStatus(zaraOrder.orderId, "confirmed");
  const afterNoOp = await repo.getOrder(zaraOrder.orderId);
  rec("setting the same status again is a no-op — no duplicate history row", afterNoOp!.statusHistory.length === historyLenAfterConfirm);

  await repo.updateOrderTracking(zaraOrder.orderId, { trackingNumber: "TCS123456789PK", trackingCarrier: "TCS" });
  const afterTracking = await repo.getOrder(zaraOrder.orderId);
  rec("tracking number/carrier are saved", afterTracking?.order.tracking_number === "TCS123456789PK" && afterTracking?.order.tracking_carrier === "TCS");
  rec(
    "adding tracking logs a history entry without changing status",
    afterTracking?.order.status === "confirmed" &&
      !!afterTracking?.statusHistory.some((h) => h.note?.includes("TCS123456789PK")),
  );
  rec("the order also surfaces its tracking number in the admin list", (await repo.listOrders({ search: "TCS123456789PK" })).items.length === 1);

  const beforeCancelStock = (await repo.getProduct(productA.id))!.variants.find((v) => v.sku === skuA)!.stock_quantity;
  await repo.cancelOrder(zaraOrder.orderId, "Customer requested cancellation.");
  const afterCancel = await repo.getOrder(zaraOrder.orderId);
  rec("cancelling sets status to cancelled", afterCancel?.order.status === "cancelled");
  const restoredStock = (await repo.getProduct(productA.id))!.variants.find((v) => v.sku === skuA)!.stock_quantity;
  rec("cancelling restores the reserved stock", restoredStock === beforeCancelStock + 1);

  await repo.cancelOrder(zaraOrder.orderId, "Cancelling again should be a no-op.");
  const restoredStockAgain = (await repo.getProduct(productA.id))!.variants.find((v) => v.sku === skuA)!.stock_quantity;
  rec("cancelling an already-cancelled order does not restore stock twice", restoredStockAgain === restoredStock);

  await repo.setOrderStatus(hassanOrder.orderId, "confirmed");
  await repo.setOrderStatus(hassanOrder.orderId, "processing");
  await repo.setOrderStatus(hassanOrder.orderId, "shipped");
  await repo.setOrderStatus(hassanOrder.orderId, "out_for_delivery");
  await repo.setOrderStatus(hassanOrder.orderId, "delivered");
  await expectThrow(
    () => repo.cancelOrder(hassanOrder.orderId),
    "a delivered order cannot be cancelled",
    /delivered/i,
  );

  const zaraOrdersAfter = await getMyOrders(zaraId);
  rec("a cancelled order still shows in the customer's own history", zaraOrdersAfter.some((o) => o.id === zaraOrder.orderId && o.status === "cancelled"));

  /* ==================================================== 9 · staff auth gate */
  section("Staff authorization gate (requireStaff)");
  const prevBypass = process.env.ADMIN_DEV_BYPASS;

  process.env.ADMIN_DEV_BYPASS = "false";
  rec("no session ⇒ getAdminSession() is null", (await getAdminSession()) === null);
  try {
    await requireStaff();
    rec("an unauthenticated caller is refused by requireStaff()", false, "did not throw/redirect");
  } catch (err) {
    rec("an unauthenticated caller is refused by requireStaff()", expectRedirectTo(err, "/admin/login"));
  }

  process.env.ADMIN_DEV_BYPASS = "true";
  const bypassSession = await getAdminSession();
  rec("the dev bypass grants an admin session when explicitly enabled", bypassSession?.role === "admin");
  let staffGateOk = true;
  try {
    await requireStaff();
  } catch {
    staffGateOk = false;
  }
  rec("requireStaff() passes through for that session", staffGateOk);

  process.env.ADMIN_DEV_BYPASS = prevBypass;

  resetLocalStore();

  /* ------------------------------------------------------------ summary */
  const failed = checks.filter((c) => !c.ok);
  console.log("\n=======================================");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("Customer accounts & order management verified.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
