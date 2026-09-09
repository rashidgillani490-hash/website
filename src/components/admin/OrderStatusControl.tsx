"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatusAction, cancelOrderAction } from "@/app/admin/actions";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/admin/records";
import type { OrderStatusValue } from "@/lib/admin/records";
import { ConfirmButton, ResultNote, Spinner, useActionRunner } from "./controls";
import { cn } from "@/lib/utils";

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatusValue;
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [note, setNote] = useState("");

  const cancelled = status === "cancelled";
  const delivered = status === "delivered";
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        {ORDER_STATUS_FLOW.map((s, i) => {
          // Once cancelled, the forward flow is moot — only the cancelled tag
          // itself lights up. Otherwise disallow jumping backwards.
          const disabled = cancelled || (i < currentIndex && s !== status);
          return (
            <button
              key={s}
              disabled={disabled}
              onClick={() =>
                run(
                  () => setOrderStatusAction(orderId, s, note.trim() || null),
                  (r) => {
                    if (r.ok) {
                      setNote("");
                      router.refresh();
                    }
                  },
                )
              }
              className={cn(
                "h-8 px-3 text-[10px] font-medium uppercase tracking-wide2 border transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                !cancelled && status === s
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-bone/15 text-bone/50 hover:border-bone/40 hover:enabled:text-bone",
              )}
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          );
        })}
        <span
          className={cn(
            "h-8 px-3 inline-flex items-center text-[10px] font-medium uppercase tracking-wide2 border",
            cancelled
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-bone/10 text-bone/25",
          )}
        >
          Cancelled
        </span>
      </div>

      {!cancelled ? (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for this change…"
          className="h-8 w-64 border border-bone/15 bg-transparent px-2 text-right text-[11px] text-bone/70 placeholder:text-bone/25 focus:border-gold focus:outline-none"
        />
      ) : null}

      <div className="flex h-4 items-center gap-2">
        {pending ? <Spinner /> : <ResultNote result={result} />}
      </div>

      {!cancelled && !delivered ? (
        <ConfirmButton
          label="Cancel order"
          confirmLabel="Confirm cancellation"
          message="Stock will be restored to every line."
          onConfirm={() =>
            run(
              () => cancelOrderAction(orderId, note.trim() || null),
              (r) => r.ok && router.refresh(),
            )
          }
        />
      ) : null}
    </div>
  );
}
