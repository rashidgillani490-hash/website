"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { updateOrderTrackingAction } from "@/app/admin/actions";
import { AdminButton, ResultNote, Spinner, useActionRunner } from "./controls";

export function OrderTrackingForm({
  orderId,
  trackingNumber,
  trackingCarrier,
}: {
  orderId: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
}) {
  const router = useRouter();
  const { pending, result, run } = useActionRunner();
  const [number, setNumber] = useState(trackingNumber ?? "");
  const [carrier, setCarrier] = useState(trackingCarrier ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => updateOrderTrackingAction(orderId, number, carrier || null),
          (r) => r.ok && router.refresh(),
        );
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-bone/40">
        <Truck size={13} /> Tracking
      </div>
      <input
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        placeholder="Carrier (TCS, Leopards, M&P…)"
        className="h-9 border border-bone/15 bg-transparent px-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
      />
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Tracking number"
        className="h-9 border border-bone/15 bg-transparent px-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <AdminButton type="submit" variant="outline" disabled={pending || !number.trim()}>
          {pending ? <Spinner /> : trackingNumber ? "Update tracking" : "Add tracking"}
        </AdminButton>
        <ResultNote result={result} />
      </div>
    </form>
  );
}
