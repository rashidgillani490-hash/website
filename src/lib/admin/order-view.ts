/**
 * Pure order-shaping helpers shared by every reader of order data: the admin
 * repositories (staff, unrestricted), and `src/lib/customer/orders.ts`
 * (a signed-in shopper's own orders only). Keeping the assembly logic in one
 * place means "what a customer sees" and "what staff sees" never drift apart
 * by accident — only the query in front of it differs.
 */
import type {
  OrderCustomerInfo,
  OrderCustomizationRecord,
  OrderDetail,
  OrderItemRecord,
  OrderListItem,
  OrderRecord,
  OrderStatusHistoryRecord,
} from "./records";

export function buildOrderListItem(
  order: OrderRecord,
  items: OrderItemRecord[],
  personalisedItemIds: ReadonlySet<string>,
  customerName: string,
): OrderListItem {
  return {
    id: order.id,
    order_number: order.order_number,
    user_id: order.user_id,
    email: order.email,
    customer_name: customerName,
    status: order.status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    tracking_number: order.tracking_number,
    total_cents: order.total_cents,
    item_count: items.reduce((n, i) => n + i.quantity, 0),
    personalised_count: items.filter((i) => personalisedItemIds.has(i.id)).length,
    placed_at: order.placed_at,
  };
}

export function buildOrderDetail(
  order: OrderRecord,
  items: OrderItemRecord[],
  customizations: OrderCustomizationRecord[],
  statusHistory: OrderStatusHistoryRecord[],
  customer: OrderCustomerInfo,
): OrderDetail {
  return {
    order,
    items: items.map((i) => ({
      ...i,
      customization: customizations.find((c) => c.order_item_id === i.id) ?? null,
    })),
    statusHistory: [...statusHistory].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    customer,
  };
}

/**
 * Resolve the "view customer" panel: a registered account's own name/email/
 * phone when the order belongs to one, otherwise the contact details the
 * guest typed in at checkout (never invented, never someone else's).
 */
export function resolveOrderCustomerInfo(
  order: OrderRecord,
  account: { full_name: string; email: string; phone: string | null } | null,
): OrderCustomerInfo {
  const addr = order.shipping_address as Record<string, unknown>;
  const addrName = typeof addr.fullName === "string" ? addr.fullName : "";
  const addrMobile = typeof addr.mobile === "string" ? addr.mobile : "";

  if (account) {
    return {
      userId: order.user_id,
      fullName: account.full_name || addrName,
      email: account.email || order.email,
      mobile: account.phone || addrMobile,
      isRegistered: true,
    };
  }
  return {
    userId: null,
    fullName: addrName,
    email: order.email,
    mobile: addrMobile,
    isRegistered: false,
  };
}
