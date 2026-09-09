"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tag } from "lucide-react";
import {
  createCouponAction,
  deleteCouponAction,
  setCouponActiveAction,
  updateCouponAction,
} from "@/app/admin/actions";
import { Panel } from "./ui";
import {
  AdminButton,
  ConfirmButton,
  ResultNote,
  Spinner,
  useActionRunner,
} from "./controls";
import { Field, Input, Select } from "@/components/ui/form";
import { Price } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { CouponInput, CouponRecord, DiscountTypeValue } from "@/lib/admin/records";

const blank: CouponInput = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  minimum_subtotal_cents: 0,
  max_redemptions: null,
  per_user_limit: 1,
  starts_at: null,
  expires_at: null,
  is_active: true,
};

/** `<input type="date">` (yyyy-mm-dd) ⇄ ISO timestamp, treating the date as local midnight. */
function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}
function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

function couponStatus(c: CouponRecord): { label: string; tone: string } {
  const now = new Date();
  if (!c.is_active) return { label: "Inactive", tone: "border-bone/20 text-bone/40" };
  if (c.starts_at && new Date(c.starts_at) > now) {
    return { label: "Scheduled", tone: "border-blue-500/30 bg-blue-500/10 text-blue-300" };
  }
  if (c.expires_at && new Date(c.expires_at) < now) {
    return { label: "Expired", tone: "border-red-500/30 bg-red-500/10 text-red-300" };
  }
  if (c.max_redemptions !== null && c.redeemed_count >= c.max_redemptions) {
    return { label: "Exhausted", tone: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
  }
  return { label: "Active", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" };
}

function discountLabel(c: Pick<CouponRecord, "discount_type" | "discount_value">): string {
  if (c.discount_type === "percentage") return `${c.discount_value}% off`;
  if (c.discount_type === "fixed_amount") return `Rs ${c.discount_value.toLocaleString("en-PK")} off`;
  return "Free shipping";
}

export function CouponManager({ coupons }: { coupons: CouponRecord[] }) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function persist(id: string | null, input: CouponInput) {
    run(id ? () => updateCouponAction(id, input) : () => createCouponAction(input), (r) => {
      if (r.ok) {
        setEditing(null);
        setCreating(false);
        router.refresh();
      }
    });
  }

  return (
    <Panel
      title={`Coupons · ${coupons.length}`}
      action={
        <div className="flex items-center gap-3">
          {pending ? <Spinner /> : <ResultNote result={result} />}
          <AdminButton onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "New coupon"}
          </AdminButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {creating ? (
          <CouponForm initial={blank} onSave={(input) => persist(null, input)} pending={pending} />
        ) : null}

        {coupons.length === 0 && !creating ? (
          <p className="py-10 text-center text-sm text-bone/40">
            No coupons yet. Create one to offer a discount at checkout.
          </p>
        ) : null}

        <div className="flex flex-col divide-y divide-bone/10">
          {coupons.map((c) =>
            editing === c.id ? (
              <div key={c.id} className="py-4">
                <CouponForm
                  initial={{
                    code: c.code,
                    description: c.description ?? "",
                    discount_type: c.discount_type,
                    discount_value: c.discount_value,
                    minimum_subtotal_cents: c.minimum_subtotal_cents,
                    max_redemptions: c.max_redemptions,
                    per_user_limit: c.per_user_limit,
                    starts_at: c.starts_at,
                    expires_at: c.expires_at,
                    is_active: c.is_active,
                  }}
                  onCancel={() => setEditing(null)}
                  onSave={(input) => persist(c.id, input)}
                  pending={pending}
                />
              </div>
            ) : (
              <div key={c.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <Tag size={16} />
                </div>
                <div className="flex min-w-[10rem] flex-1 flex-col">
                  <span className="flex items-center gap-2 font-mono text-sm tracking-wide text-bone">
                    {c.code}
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-sans font-medium uppercase tracking-wide2",
                        couponStatus(c).tone,
                      )}
                    >
                      {couponStatus(c).label}
                    </span>
                  </span>
                  <span className="text-xs text-bone/40">
                    {c.description || discountLabel(c)}
                  </span>
                </div>
                <div className="flex flex-col text-xs text-bone/50">
                  <span>{discountLabel(c)}</span>
                  {c.minimum_subtotal_cents > 0 ? (
                    <span>
                      Min <Price amount={c.minimum_subtotal_cents} className="inline" />
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col text-xs text-bone/50">
                  <span>
                    Used {c.redeemed_count}
                    {c.max_redemptions !== null ? ` / ${c.max_redemptions}` : ""}
                  </span>
                  <span>{c.per_user_limit}/customer</span>
                </div>
                <div className="flex flex-col text-xs text-bone/40">
                  {c.starts_at ? <span>From {new Date(c.starts_at).toLocaleDateString("en-GB")}</span> : null}
                  {c.expires_at ? <span>Until {new Date(c.expires_at).toLocaleDateString("en-GB")}</span> : null}
                  {!c.starts_at && !c.expires_at ? <span>No expiry</span> : null}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <AdminButton
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      run(() => setCouponActiveAction(c.id, !c.is_active), (r) => r.ok && router.refresh())
                    }
                  >
                    {c.is_active ? "Deactivate" : "Activate"}
                  </AdminButton>
                  <AdminButton variant="outline" size="xs" onClick={() => setEditing(c.id)}>
                    Edit
                  </AdminButton>
                  <ConfirmButton
                    label="Delete"
                    onConfirm={() =>
                      run(() => deleteCouponAction(c.id), (r) => r.ok && router.refresh())
                    }
                  />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </Panel>
  );
}

function CouponForm({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial: CouponInput;
  onSave: (input: CouponInput) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<CouponInput>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<CouponInput>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    setFormError(null);
    const code = form.code.trim();
    if (!code) return setFormError("A coupon code is required.");
    if (form.discount_type === "percentage" && (form.discount_value < 0 || form.discount_value > 100)) {
      return setFormError("A percentage discount must be between 0 and 100.");
    }
    if (form.discount_type !== "percentage" && form.discount_value < 0) {
      return setFormError("Discount value cannot be negative.");
    }
    if (form.starts_at && form.expires_at && form.starts_at > form.expires_at) {
      return setFormError("The start date must be before the expiration date.");
    }
    onSave({ ...form, code });
  }

  return (
    <div className="flex flex-col gap-4 border border-bone/10 bg-bone/[0.02] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Coupon code" htmlFor="cp-code" required hint="Shoppers enter this at checkout — case-insensitive">
          <Input
            id="cp-code"
            value={form.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            className="font-mono uppercase tracking-wide"
          />
        </Field>
        <Field label="Description" htmlFor="cp-desc" hint="Internal note — not shown to customers">
          <Input
            id="cp-desc"
            value={form.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Discount type" htmlFor="cp-type" required>
          <Select
            id="cp-type"
            value={form.discount_type}
            onChange={(e) => set({ discount_type: e.target.value as DiscountTypeValue })}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount (Rs)</option>
            <option value="free_shipping">Free shipping</option>
          </Select>
        </Field>
        <Field
          label={form.discount_type === "percentage" ? "Percent off" : "Amount off (Rs)"}
          htmlFor="cp-value"
        >
          <Input
            id="cp-value"
            type="number"
            min={0}
            max={form.discount_type === "percentage" ? 100 : undefined}
            value={form.discount_value}
            disabled={form.discount_type === "free_shipping"}
            onChange={(e) => set({ discount_value: Number(e.target.value) })}
          />
        </Field>
        <Field label="Minimum order value (Rs)" htmlFor="cp-min">
          <Input
            id="cp-min"
            type="number"
            min={0}
            value={form.minimum_subtotal_cents ?? 0}
            onChange={(e) => set({ minimum_subtotal_cents: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Total usage limit" htmlFor="cp-max" hint="Blank = unlimited">
          <Input
            id="cp-max"
            type="number"
            min={0}
            value={form.max_redemptions ?? ""}
            placeholder="Unlimited"
            onChange={(e) => set({ max_redemptions: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Field>
        <Field label="Uses per customer" htmlFor="cp-peruser">
          <Input
            id="cp-peruser"
            type="number"
            min={1}
            value={form.per_user_limit ?? 1}
            onChange={(e) => set({ per_user_limit: Number(e.target.value) })}
          />
        </Field>
        <Field label="Starts on" htmlFor="cp-start" hint="Blank = starts now">
          <Input
            id="cp-start"
            type="date"
            value={toDateInput(form.starts_at)}
            onChange={(e) => set({ starts_at: fromDateInput(e.target.value) })}
          />
        </Field>
        <Field label="Expires on" htmlFor="cp-end" hint="Blank = never expires">
          <Input
            id="cp-end"
            type="date"
            value={toDateInput(form.expires_at)}
            onChange={(e) => set({ expires_at: fromDateInput(e.target.value) })}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm text-bone/70">
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => set({ is_active: e.target.checked })}
          className="accent-gold"
        />
        Active — usable at checkout immediately (subject to its dates and limits)
      </label>

      {formError ? <p className="text-xs text-red-400">{formError}</p> : null}

      <div className="flex gap-3">
        <AdminButton onClick={submit} disabled={pending}>
          Save coupon
        </AdminButton>
        {onCancel ? (
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
