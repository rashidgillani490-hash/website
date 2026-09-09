/**
 * A signed-in shopper's own orders — never the admin repo. Two independent
 * layers of ownership enforcement:
 *
 *   • Supabase mode queries through the shopper's OWN request-scoped client
 *     (`getSupabaseServerClient()`, cookie-bound), never the service-role
 *     client — RLS (`orders_select_own`) restricts the rows regardless of
 *     what this module does, so a bug here still can't leak another
 *     customer's order.
 *   • Local mode has no RLS, so ownership is enforced here: every read
 *     filters by `order.user_id === userId` before anything is returned.
 *
 * `userId` must come from a verified session (`getCustomerSession()`) — this
 * module trusts whatever id it's given, exactly like the admin repo trusts
 * `requireStaff()` having already run.
 */
import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTables } from "@/lib/admin/local-store";
import { buildOrderDetail, buildOrderListItem, resolveOrderCustomerInfo } from "@/lib/admin/order-view";
import type {
  OrderCustomizationRecord,
  OrderDetail,
  OrderItemRecord,
  OrderListItem,
  OrderRecord,
  OrderStatusHistoryRecord,
} from "@/lib/admin/records";

export async function getMyOrders(userId: string): Promise<OrderListItem[]> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return [];

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id,order_number,user_id,email,status,payment_method,payment_status,tracking_number,total_cents,placed_at")
      .eq("user_id", userId) // RLS enforces this too — belt and suspenders
      .order("placed_at", { ascending: false });
    if (error || !orders?.length) return [];

    const ids = orders.map((o) => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("id,order_id,quantity")
      .in("order_id", ids);
    const itemIds = (items ?? []).map((i) => i.id);
    const { data: custs } = itemIds.length
      ? await supabase.from("customizations").select("order_item_id").in("order_item_id", itemIds)
      : { data: [] as { order_item_id: string }[] };
    const personalisedIds = new Set((custs ?? []).map((c) => c.order_item_id));

    const itemsByOrder = new Map<string, { id: string; order_id: string; quantity: number }[]>();
    for (const i of items ?? []) {
      const arr = itemsByOrder.get(i.order_id) ?? [];
      arr.push(i);
      itemsByOrder.set(i.order_id, arr);
    }

    return orders.map((o) =>
      buildOrderListItem(
        o as unknown as OrderRecord,
        (itemsByOrder.get(o.id) ?? []) as unknown as OrderItemRecord[],
        personalisedIds,
        "", // the shopper is looking at their own orders — no name column needed
      ),
    );
  }

  const t = getTables();
  const mine = t.orders.filter((o) => o.user_id === userId);
  const personalisedItemIds = new Set(t.order_customizations.map((c) => c.order_item_id));
  return [...mine]
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at))
    .map((o) =>
      buildOrderListItem(
        o,
        t.order_items.filter((i) => i.order_id === o.id),
        personalisedItemIds,
        "",
      ),
    );
}

/** Returns `null` both when the order doesn't exist AND when it isn't the caller's. */
export async function getMyOrder(userId: string, orderId: string): Promise<OrderDetail | null> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return null;

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId) // never trust RLS alone to shape the query — assert it too
      .maybeSingle();
    if (!order) return null;

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at");
    const ids = (items ?? []).map((i) => i.id);
    const { data: custs } = ids.length
      ? await supabase.from("customizations").select("*").in("order_item_id", ids)
      : { data: [] as OrderCustomizationRecord[] };
    const { data: history } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    const customer = resolveOrderCustomerInfo(order as unknown as OrderRecord, null);
    return buildOrderDetail(
      order as unknown as OrderRecord,
      (items ?? []) as unknown as OrderItemRecord[],
      (custs ?? []) as unknown as OrderCustomizationRecord[],
      (history ?? []) as unknown as OrderStatusHistoryRecord[],
      customer,
    );
  }

  const t = getTables();
  const order = t.orders.find((o) => o.id === orderId);
  if (!order || order.user_id !== userId) return null; // exists but isn't theirs — same result as not found

  const items = t.order_items.filter((i) => i.order_id === orderId);
  const history = t.order_status_history.filter((h) => h.order_id === orderId);
  const account = t.customers.find((c) => c.id === userId) ?? null;
  const customer = resolveOrderCustomerInfo(
    order,
    account ? { full_name: account.full_name, email: account.email, phone: account.phone } : null,
  );
  return buildOrderDetail(order, items, t.order_customizations, history, customer);
}
