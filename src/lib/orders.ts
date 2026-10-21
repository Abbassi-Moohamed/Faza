import type {
  CreateOrderBody,
  OrderDto,
  OrderStatus,
  PaginatedOrdersDto,
  PaymentStatus,
  SessionOrdersDto,
} from "@/types/backend";
import { requestWithToken } from "@/lib/api";

export function createOrder(body: CreateOrderBody) {
  return requestWithToken<OrderDto>("/orders", { method: "POST", body: JSON.stringify(body) });
}

export function getOrder(orderId: string) {
  return requestWithToken<OrderDto>(`/orders/${encodeURIComponent(orderId)}`);
}

/**
 * Every order of the table session the token belongs to (newest first). The
 * token is the only credential: it scopes the list to one party even when
 * several sessions share a table.
 */
export function listSessionOrders(sessionToken: string, limit?: number) {
  const params = new URLSearchParams({ sessionToken });
  if (limit) params.set("limit", String(limit));
  return requestWithToken<SessionOrdersDto>(`/orders?${params.toString()}`);
}

export function listOrders(token: string, status?: OrderStatus, paymentStatus?: PaymentStatus, limit?: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (paymentStatus) params.set("paymentStatus", paymentStatus);
  if (limit) params.set("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return requestWithToken<PaginatedOrdersDto>(`/admin/my-coffee/orders${query}`, {}, token);
}

export function markOrderPaid(token: string, orderId: string) {
  return requestWithToken<OrderDto>(
    `/admin/my-coffee/orders/${encodeURIComponent(orderId)}/payment`,
    { method: "PATCH" },
    token,
  );
}

export function updateOrderStatus(token: string, orderId: string, status: OrderStatus) {
  return requestWithToken<OrderDto>(
    `/admin/my-coffee/orders/${encodeURIComponent(orderId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    token,
  );
}
