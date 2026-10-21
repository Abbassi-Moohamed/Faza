import type { CreateOrderBody, OrderDto, OrderStatus, PaginatedOrdersDto, PaymentStatus } from "@/types/backend";
import { requestWithToken } from "@/lib/api";

export function createOrder(body: CreateOrderBody) {
  return requestWithToken<OrderDto>("/orders", { method: "POST", body: JSON.stringify(body) });
}

export function getOrder(orderId: string) {
  return requestWithToken<OrderDto>(`/orders/${encodeURIComponent(orderId)}`);
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
