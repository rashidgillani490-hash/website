"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Loader2,
  Truck,
  ShieldCheck,
  Tag,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  useCart,
  cartSubtotal,
  cartShipping,
  lineUnitPrice,
} from "@/lib/store/cart";
import { useCartSync } from "@/lib/store/useCartSync";
import { useCommerceSettings } from "@/lib/store/commerce-settings";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";
import { Price, EmptyState } from "@/components/ui/misc";
import {
  createOrderAction,
  previewCouponAction,
  type PlaceOrderResult,
} from "@/app/(site)/actions";
import { PROVINCES, citiesForProvince } from "@/lib/pakistan";
import { validateCheckoutCustomer } from "@/lib/checkout/validation";
import type { CheckoutCustomerDetails, CheckoutFieldErrors } from "@/lib/checkout/types";
import {
  getEnabledPaymentMethods,
  getUpcomingPaymentMethods,
  getPaymentMethod,
  DEFAULT_PAYMENT_METHOD,
} from "@/lib/payments/registry";
import { cn } from "@/lib/utils";

const EMPTY: CheckoutCustomerDetails = {
  fullName: "",
  mobile: "",
  email: "",
  province: "",
  city: "",
  area: "",
  address: "",
  postalCode: "",
  notes: "",
};

interface AppliedCoupon {
  code: string;
  discountCents: number;
  freeShipping: boolean;
  label: string;
}

export function CheckoutFlow() {
  const { items, hydrated, clear } = useCart();
  const { issues, blocked, refresh } = useCartSync();
  const [form, setForm] = useState<CheckoutCustomerDetails>(EMPTY);
  /** True when the shopper picked "Other" and types the city by hand. */
  const [cityIsCustom, setCityIsCustom] = useState(false);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [payment, setPayment] = useState(DEFAULT_PAYMENT_METHOD);
  const [ack, setAck] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [done, setDone] = useState<PlaceOrderResult["confirmation"] | null>(null);

  const set = (patch: Partial<CheckoutCustomerDetails>) =>
    setForm((f) => ({ ...f, ...patch }));

  const subtotal = cartSubtotal(items);
  const baseShipping = cartShipping(subtotal);
  const shipping = coupon?.freeShipping ? 0 : baseShipping;
  const discount = coupon ? Math.min(coupon.discountCents, subtotal) : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const cityOptions = useMemo(() => citiesForProvince(form.province), [form.province]);
  const codEnabled = useCommerceSettings((s) => s.codEnabled);
  const codMethod = getPaymentMethod("cod")!; // definition for label/instructions — availability is separate
  const enabledMethods = getEnabledPaymentMethods({ codEnabled });
  const upcoming = getUpcomingPaymentMethods({ codEnabled });
  const noPaymentMethods = enabledMethods.length === 0;

  // If the selected method stops being available (an admin just disabled
  // COD, say), fall back to whatever else is offered rather than silently
  // submitting a method that's no longer selectable.
  useEffect(() => {
    if (enabledMethods.some((m) => m.id === payment)) return;
    if (enabledMethods[0]) setPayment(enabledMethods[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codEnabled]);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponMsg(null);
    const res = await previewCouponAction(code, subtotal, form.email);
    setCouponBusy(false);
    if (res.ok) {
      setCoupon({
        code: res.code!,
        discountCents: res.discountCents ?? 0,
        freeShipping: !!res.freeShipping,
        label: res.label ?? code,
      });
      setCouponMsg(null);
    } else {
      setCoupon(null);
      setCouponMsg(res.message ?? "That code isn't valid.");
    }
  }

  async function placeOrder() {
    setTopError(null);
    const check = validateCheckoutCustomer(form);
    if (!check.ok) {
      setErrors(check.errors);
      setTopError("Please correct the highlighted fields.");
      document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (payment === "cod" && !ack) {
      setTopError("Please confirm you'll pay cash on delivery.");
      return;
    }
    if (noPaymentMethods) {
      setTopError("No payment method is currently available. Please check back shortly.");
      return;
    }
    if (blocked) {
      setTopError("Some items in your bag are unavailable. Please review your bag.");
      return;
    }
    setErrors({});
    setPlacing(true);
    const res = await createOrderAction({
      customer: form,
      paymentMethod: payment,
      couponCode: coupon?.code ?? null,
      lines: items.map((i) => ({
        productId: i.productId,
        variantSku: i.sku,
        quantity: i.quantity,
        customization: i.customization?.selection ?? null,
      })),
    });
    setPlacing(false);
    if (res.ok && res.confirmation) {
      setDone(res.confirmation);
      clear();
    } else {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setTopError(res.message ?? "We couldn't place your order.");
      // A rejection is usually stock moving under us — re-read the catalogue so
      // the summary shows what actually happened.
      refresh();
    }
  }

  if (!hydrated) return <div className="h-96 animate-pulse rounded bg-bone/5" />;

  if (done) return <Confirmation confirmation={done} />;

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your bag is empty"
        description="Add a fragrance before checking out."
        action={
          <Button href="/fragrances" size="md">
            Explore fragrances
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_420px] lg:gap-20">
      {/* ---------------------------------------------------- form */}
      <form
        id="checkout-form"
        className="flex flex-col gap-10"
        onSubmit={(e) => {
          e.preventDefault();
          placeOrder();
        }}
      >
        <section className="flex flex-col gap-6">
          <h2 className="font-serif text-2xl">Delivery details</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Full name" htmlFor="c-name" required error={errors.fullName}>
              <Input
                id="c-name"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
              />
            </Field>
            <Field label="Mobile number" htmlFor="c-mobile" required error={errors.mobile} hint="e.g. 0301 2345678">
              <Input
                id="c-mobile"
                inputMode="tel"
                autoComplete="tel"
                placeholder="03XX XXXXXXX"
                value={form.mobile}
                onChange={(e) => set({ mobile: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Email" htmlFor="c-email" required error={errors.email}>
            <Input
              id="c-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Province" htmlFor="c-prov" required error={errors.province}>
              <Select
                id="c-prov"
                value={form.province}
                onChange={(e) => {
                  setCityIsCustom(false);
                  set({ province: e.target.value, city: "" });
                }}
              >
                <option value="">Select province…</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="City" htmlFor="c-city" required error={errors.city}>
              {cityOptions.length > 0 && !cityIsCustom ? (
                <Select
                  id="c-city"
                  value={cityOptions.includes(form.city) ? form.city : ""}
                  onChange={(e) => {
                    if (e.target.value === "__other") {
                      setCityIsCustom(true);
                      set({ city: "" });
                    } else {
                      set({ city: e.target.value });
                    }
                  }}
                >
                  <option value="">Select city…</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__other">Other (type below)</option>
                </Select>
              ) : (
                <Input
                  id="c-city"
                  value={form.city}
                  onChange={(e) => set({ city: e.target.value })}
                  placeholder="City"
                />
              )}
            </Field>
          </div>

          {cityIsCustom && cityOptions.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setCityIsCustom(false);
                set({ city: "" });
              }}
              className="self-start text-[11px] uppercase tracking-wide2 text-bone/40 hover:text-bone/70"
            >
              ← Pick from the city list instead
            </button>
          ) : null}

          <Field label="Area / locality" htmlFor="c-area" required error={errors.area} hint="e.g. DHA Phase 5, Gulberg III, Bahria Town">
            <Input id="c-area" value={form.area} onChange={(e) => set({ area: e.target.value })} />
          </Field>

          <Field label="Complete address" htmlFor="c-addr" required error={errors.address} hint="House / flat no., street, nearest landmark">
            <Textarea
              id="c-addr"
              rows={3}
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Postal code" htmlFor="c-zip" required error={errors.postalCode} hint="5 digits">
              <Input
                id="c-zip"
                inputMode="numeric"
                maxLength={5}
                value={form.postalCode}
                onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
              />
            </Field>
          </div>

          <Field label="Order notes (optional)" htmlFor="c-notes" error={errors.notes}>
            <Textarea
              id="c-notes"
              rows={2}
              placeholder="Delivery instructions, preferred time, etc."
              value={form.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>
        </section>

        {/* ------------------------------------------------ payment */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl">Payment method</h2>
          {enabledMethods.map((m) => (
            <label
              key={m.id}
              className={cn(
                "flex cursor-pointer flex-col gap-1 border px-5 py-4 transition-colors",
                payment === m.id ? "border-gold bg-gold/5" : "border-bone/15 hover:border-bone/40",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === m.id}
                  onChange={() => setPayment(m.id)}
                  className="accent-gold"
                />
                <span className="text-sm font-medium text-bone">{m.label}</span>
              </span>
              <span className="pl-6 text-xs text-bone/50">{m.description}</span>
            </label>
          ))}

          {payment === "cod" ? (
            <label className="flex items-start gap-3 pl-1 text-xs text-bone/60">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 accent-gold"
              />
              I confirm I will pay the full amount in cash to the courier on delivery.
            </label>
          ) : null}

          {upcoming.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {upcoming.map((m) => (
                <span
                  key={m.id}
                  className="rounded-full border border-bone/10 px-3 py-1 text-[10px] uppercase tracking-wide2 text-bone/30"
                >
                  {m.label} — soon
                </span>
              ))}
            </div>
          ) : null}

          {noPaymentMethods ? (
            <p className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Checkout is temporarily unavailable — no payment method is currently
              enabled. Please check back shortly.
            </p>
          ) : null}
        </section>

        {issues.length > 0 ? (
          <div className="flex gap-3 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <ul className="flex flex-col gap-1">
                {issues.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <Link href="/cart" className="link-underline self-start text-amber-100/80">
                Review your bag
              </Link>
            </div>
          </div>
        ) : null}

        {topError ? (
          <p className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {topError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          variant="gold"
          disabled={placing || blocked || noPaymentMethods}
          className="w-full"
        >
          {placing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Placing your order…
            </>
          ) : (
            `Place Order — ${enabledMethods.find((m) => m.id === payment)?.label ?? codMethod.label}`
          )}
        </Button>
      </form>

      {/* ---------------------------------------------------- summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-5 border border-bone/10 bg-bone/[0.02] p-6">
          <h2 className="font-serif text-xl">Order summary</h2>

          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.lineId} className="flex gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-ink-soft">
                  <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bone px-1 text-[10px] font-semibold text-ink">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex flex-1 flex-col text-xs">
                  <span className="font-serif text-sm text-bone">{item.name}</span>
                  <span className="text-bone/40">
                    {item.ml}ml · Qty {item.quantity}
                  </span>
                  {item.customization ? (
                    <span className="mt-0.5 text-[10px] text-gold/80">
                      {item.customization.summary}
                    </span>
                  ) : null}
                </div>
                <Price amount={lineUnitPrice(item) * item.quantity} className="text-xs" />
              </li>
            ))}
          </ul>

          {/* coupon */}
          <div className="flex flex-col gap-2 border-t border-bone/10 pt-4">
            {coupon ? (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gold">
                  <Tag size={12} /> {coupon.label}
                </span>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponInput("");
                  }}
                  className="text-bone/40 hover:text-bone"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Discount code"
                  className="h-9 flex-1 border border-bone/20 bg-transparent px-3 text-xs uppercase tracking-wide2 text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponBusy || !couponInput.trim()}
                  className="h-9 border border-bone/25 px-4 text-[10px] font-medium uppercase tracking-wide2 text-bone/70 hover:border-bone/50 disabled:opacity-40"
                >
                  {couponBusy ? "…" : "Apply"}
                </button>
              </div>
            )}
            {couponMsg ? <p className="text-[11px] text-red-400">{couponMsg}</p> : null}
          </div>

          {/* totals */}
          <dl className="flex flex-col gap-2 border-t border-bone/10 pt-4 text-sm text-bone/55">
            <Row label="Subtotal">
              <Price amount={subtotal} />
            </Row>
            <Row label="Shipping fee">
              {shipping === 0 ? "Free" : <Price amount={shipping} />}
            </Row>
            {discount > 0 ? (
              <Row label="Discount">
                <span className="text-emerald-400">
                  − <Price amount={discount} />
                </span>
              </Row>
            ) : null}
          </dl>
          <div className="flex items-center justify-between border-t border-bone/10 pt-4">
            <span className="text-sm uppercase tracking-wide2 text-bone/60">Total</span>
            <Price amount={total} className="text-xl" />
          </div>

          <ul className="mt-1 flex flex-col gap-1.5 text-[11px] text-bone/40">
            <li className="flex items-center gap-2">
              <Truck size={12} /> Nationwide courier · 2–5 working days
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={12} /> Prices confirmed on our server at checkout
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------- confirmation */

function Confirmation({
  confirmation: c,
}: {
  confirmation: NonNullable<PlaceOrderResult["confirmation"]>;
}) {
  const method = getPaymentMethod(c.paymentMethod);
  const addr = c.customer;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Check size={26} />
        </span>
        <h1 className="text-3xl">Order placed</h1>
        <p className="text-sm text-bone/60">
          Thank you, {addr.fullName.split(" ")[0]}. A confirmation has been sent to{" "}
          {addr.email}.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-medium tracking-wide2 text-gold">
            {c.orderNumber}
          </span>
          <span className="rounded-full border border-bone/20 px-3 py-1 uppercase tracking-wide2 text-bone/60">
            Status: {c.status}
          </span>
          <span className="rounded-full border border-bone/20 px-3 py-1 uppercase tracking-wide2 text-bone/60">
            {method?.label ?? c.paymentMethod}
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3 border border-bone/10 p-5">
          <h2 className="text-[11px] uppercase tracking-luxe text-bone/40">Delivery address</h2>
          <address className="not-italic text-sm leading-relaxed text-bone/75">
            <span className="block text-bone">{addr.fullName}</span>
            <span className="block">{addr.mobile}</span>
            <span className="block">{addr.address}</span>
            <span className="block">
              {addr.area}, {addr.city}
            </span>
            <span className="block">
              {addr.province} {addr.postalCode}
            </span>
            <span className="block">Pakistan</span>
          </address>
          {addr.notes ? (
            <p className="border-t border-bone/10 pt-2 text-xs text-bone/45">
              Note: {addr.notes}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border border-bone/10 p-5">
          <h2 className="text-[11px] uppercase tracking-luxe text-bone/40">Payment</h2>
          <p className="text-sm text-bone">{method?.label ?? "Cash on Delivery"}</p>
          <p className="text-xs leading-relaxed text-bone/50">{method?.instructions}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border border-bone/10 p-5">
        <h2 className="text-[11px] uppercase tracking-luxe text-bone/40">Your order</h2>
        <ul className="flex flex-col divide-y divide-bone/10">
          {c.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div className="flex flex-col">
                <span className="font-serif text-bone">{it.name}</span>
                <span className="text-xs text-bone/40">
                  {it.variantLabel} · Qty {it.quantity}
                </span>
                {it.customization ? (
                  <span className="mt-0.5 text-[11px] text-gold/80">
                    {it.customization.summary}
                    {it.customization.deltaCents > 0 ? (
                      <>
                        {" "}
                        (+ <Price amount={it.customization.deltaCents} />)
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <Price amount={it.lineTotalCents} />
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 border-t border-bone/10 pt-3 text-sm text-bone/55">
          <Row label="Subtotal">
            <Price amount={c.subtotalCents} />
          </Row>
          <Row label="Shipping">
            {c.shippingCents === 0 ? "Free" : <Price amount={c.shippingCents} />}
          </Row>
          {c.discountCents > 0 ? (
            <Row label={`Discount${c.discountCode ? ` (${c.discountCode})` : ""}`}>
              <span className="text-emerald-400">
                − <Price amount={c.discountCents} />
              </span>
            </Row>
          ) : null}
          <div className="mt-1 flex items-center justify-between border-t border-bone/10 pt-3 text-bone">
            <dt className="uppercase tracking-wide2 text-bone/60">Total</dt>
            <dd className="font-serif text-lg">
              <Price amount={c.totalCents} />
            </dd>
          </div>
        </dl>
        <p className="text-[10px] text-bone/30">
          Every amount was recalculated on our server from the live catalogue —
          nothing was taken from your browser.
        </p>
      </div>

      <div className="flex justify-center">
        <Button href="/fragrances" variant="primary" size="md">
          Continue shopping
        </Button>
      </div>
      <p className="text-center text-[11px] text-bone/30">
        Questions about your order?{" "}
        <Link href="/contact" className="link-underline text-bone/50">
          Contact the maison
        </Link>
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="text-bone/80">{children}</dd>
    </div>
  );
}
