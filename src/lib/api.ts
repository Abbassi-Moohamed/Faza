import { apiConfig } from "@/config/api";
import type {
  AdminAuthDto,
  AdminCategoryDto,
  AdminCoffeeDto,
  AdminItemDto,
  AdminImageDto,
  AdminOfferDto,
  AdminTableCloseDto,
  AdminTableListDto,
  AnalyticsDto,
  AnalyticsQuery,
  ApiEnvelope,
  CoffeeDto,
  CategoryBody,
  CreateCoffeeBody,
  CreateOfferBody,
  CreateItemBody,
  FeaturedOfferDto,
  ItemDto,
  ServiceShiftDto,
  ServiceShiftListDto,
  TableSessionDto,
  TableSessionListDto,
  UpdateCoffeeBody,
  UpdateMyCoffeeBody,
  UpdateItemBody,
  UpdateOfferBody,
} from "@/types/backend";

/** Operational error carrying the HTTP status of a failed backend response. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

const API_VERSION_PREFIX = "/api/v1";

/**
 * Core request helper shared by the public API and the admin API. Backend
 * responses always use the `{ success, data | message }` envelope.
 */
export async function requestWithToken<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const isMultipartBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isMultipartBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiConfig.baseUrl}${API_VERSION_PREFIX}${path}`, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Request failed";
    let details: unknown;
    try {
      const body = (await response.json()) as Partial<{ message: string; details: unknown }>;
      if (typeof body.message === "string" && body.message.length > 0) {
        message = body.message;
      }
      details = body.details;
    } catch {
      // Non-JSON payload — keep the generic message.
    }
    throw new ApiClientError(response.status, message, details);
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  if (body.success !== true) {
    throw new ApiClientError(response.status, body.message, body.details);
  }
  return body.data;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestWithToken<T>(path, init);
}

/* ------------------------------------------------------------------------ */
/* Public menu API                                                           */
/* ------------------------------------------------------------------------ */

/** Resolve a coffee (with its own categories) by public slug. */
export function getCoffeeBySlug(slug: string): Promise<CoffeeDto> {
  return request<CoffeeDto>(`/coffees/${encodeURIComponent(slug)}`);
}

/** Fetch the items that belong to a specific ItemCategory. */
export function getItemsByCategoryId(categoryId: string): Promise<ItemDto[]> {
  return request<ItemDto[]>(`/categories/${encodeURIComponent(categoryId)}/items`);
}

/** Today's purchasable offers of a coffee. */
export function getCoffeeOffers(coffeeSlug: string): Promise<FeaturedOfferDto[]> {
  return request<FeaturedOfferDto[]>(`/coffees/${encodeURIComponent(coffeeSlug)}/offers`);
}

/* ------------------------------------------------------------------------ */
/* Backoffice API (every call carries the admin bearer token explicitly).    */
/* ------------------------------------------------------------------------ */

function authHeader(token: string): Record<string, string> {
  return { Authorization: "Bearer " + token };
}

function analyticsQuery(query: AnalyticsQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.serviceShiftId) params.set("serviceShiftId", query.serviceShiftId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function jsonBody(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}

/** POST /api/v1/admin/images — the browser sends files only to Faza. */
export async function uploadImage(token: string, file: File): Promise<AdminImageDto> {
  const form = new FormData();
  form.append("file", file);
  return request<AdminImageDto>("/admin/images", {
    method: "POST",
    headers: authHeader(token),
    body: form,
  });
}

/** POST /api/v1/admin/auth/app */
export function loginAppAdmin(pin: string): Promise<AdminAuthDto> {
  return request<AdminAuthDto>("/admin/auth/app", {
    method: "POST",
    ...jsonBody({ pin }),
  });
}

/** POST /api/v1/admin/auth/coffee/:coffeeSlug */
export function loginCoffeeAdmin(coffeeSlug: string, pin: string): Promise<AdminAuthDto> {
  return request<AdminAuthDto>(`/admin/auth/coffee/${encodeURIComponent(coffeeSlug)}`, {
    method: "POST",
    ...jsonBody({ pin }),
  });
}

/* ---- Application admin: coffee CRUD -------------------------------------- */

/** GET /api/v1/admin/coffees */
export function listCoffees(token: string): Promise<AdminCoffeeDto[]> {
  return request<AdminCoffeeDto[]>("/admin/coffees", { headers: authHeader(token) });
}

/** GET /api/v1/admin/analytics */
export function getAppAnalytics(token: string, query: AnalyticsQuery = {}): Promise<AnalyticsDto> {
  return request<AnalyticsDto>(`/admin/insights${analyticsQuery(query)}`, { headers: authHeader(token) });
}

/** POST /api/v1/admin/coffees */
export function createCoffee(token: string, body: CreateCoffeeBody): Promise<AdminCoffeeDto> {
  return request<AdminCoffeeDto>("/admin/coffees", {
    method: "POST",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** PATCH /api/v1/admin/coffees/:coffeeId */
export function updateCoffee(token: string, coffeeId: string, body: UpdateCoffeeBody): Promise<AdminCoffeeDto> {
  return request<AdminCoffeeDto>(`/admin/coffees/${encodeURIComponent(coffeeId)}`, {
    method: "PATCH",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** DELETE /api/v1/admin/coffees/:coffeeId (cascades categories → items). */
export function deleteCoffee(token: string, coffeeId: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/admin/coffees/${encodeURIComponent(coffeeId)}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

/** PATCH /api/v1/admin/coffees/:coffeeId/pin — reset a coffee PIN to 0000. */
export function resetCoffeePin(token: string, coffeeId: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/admin/coffees/${encodeURIComponent(coffeeId)}/pin`, {
    method: "PATCH",
    headers: authHeader(token),
  });
}

/* ---- Coffee admin: own coffee, categories, items (token-scoped) ----------- */

/** GET /api/v1/admin/my-coffee */
export function getMyCoffee(token: string): Promise<AdminCoffeeDto> {
  return request<AdminCoffeeDto>("/admin/my-coffee", { headers: authHeader(token) });
}

/** GET /api/v1/admin/my-coffee/analytics */
export function getCoffeeAnalytics(token: string, query: AnalyticsQuery = {}): Promise<AnalyticsDto> {
  return request<AnalyticsDto>(`/admin/my-coffee/insights${analyticsQuery(query)}`, { headers: authHeader(token) });
}

/** PATCH /api/v1/admin/my-coffee */
export function updateMyCoffee(token: string, body: UpdateMyCoffeeBody): Promise<AdminCoffeeDto> {
  return request<AdminCoffeeDto>("/admin/my-coffee", {
    method: "PATCH",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** PATCH /api/v1/admin/my-coffee/pin */
export function changeMyPin(token: string, currentPin: string, newPin: string): Promise<{ id: string }> {
  return request<{ id: string }>("/admin/my-coffee/pin", {
    method: "PATCH",
    headers: authHeader(token),
    ...jsonBody({ currentPin, newPin }),
  });
}

/** GET /api/v1/admin/my-coffee/categories */
export function listMyCategories(token: string): Promise<AdminCategoryDto[]> {
  return request<AdminCategoryDto[]>("/admin/my-coffee/categories", {
    headers: authHeader(token),
  });
}

/** POST /api/v1/admin/my-coffee/categories */
export function createMyCategory(token: string, body: CategoryBody): Promise<AdminCategoryDto> {
  return request<AdminCategoryDto>("/admin/my-coffee/categories", {
    method: "POST",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** PATCH /api/v1/admin/my-coffee/categories/:categoryId */
export function updateMyCategory(token: string, categoryId: string, body: CategoryBody): Promise<AdminCategoryDto> {
  return request<AdminCategoryDto>(`/admin/my-coffee/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** DELETE /api/v1/admin/my-coffee/categories/:categoryId (cascades items). */
export function deleteMyCategory(token: string, categoryId: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/admin/my-coffee/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

/** GET /api/v1/admin/my-coffee/categories/:categoryId/items */
export function listMyCategoryItems(token: string, categoryId: string): Promise<AdminItemDto[]> {
  return request<AdminItemDto[]>(`/admin/my-coffee/categories/${encodeURIComponent(categoryId)}/items`, {
    headers: authHeader(token),
  });
}

/** POST /api/v1/admin/my-coffee/categories/:categoryId/items */
export function createMyItem(token: string, categoryId: string, body: CreateItemBody): Promise<AdminItemDto> {
  return request<AdminItemDto>(`/admin/my-coffee/categories/${encodeURIComponent(categoryId)}/items`, {
    method: "POST",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** PATCH /api/v1/admin/my-coffee/items/:itemId */
export function updateMyItem(token: string, itemId: string, body: UpdateItemBody): Promise<AdminItemDto> {
  return request<AdminItemDto>(`/admin/my-coffee/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** DELETE /api/v1/admin/my-coffee/items/:itemId */
export function deleteMyItem(token: string, itemId: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/admin/my-coffee/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

/** GET /api/v1/admin/my-coffee/offers */
export function listMyOffers(token: string): Promise<AdminOfferDto[]> {
  return request<AdminOfferDto[]>("/admin/my-coffee/offers", { headers: authHeader(token) });
}

/** POST /api/v1/admin/my-coffee/offers */
export function createMyOffer(token: string, body: CreateOfferBody): Promise<AdminOfferDto> {
  return request<AdminOfferDto>("/admin/my-coffee/offers", {
    method: "POST",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** PATCH /api/v1/admin/my-coffee/offers/:offerId */
export function updateMyOffer(token: string, offerId: string, body: UpdateOfferBody): Promise<AdminOfferDto> {
  return request<AdminOfferDto>(`/admin/my-coffee/offers/${encodeURIComponent(offerId)}`, {
    method: "PATCH",
    headers: authHeader(token),
    ...jsonBody(body),
  });
}

/** DELETE /api/v1/admin/my-coffee/offers/:offerId (archives it). */
export function deleteMyOffer(token: string, offerId: string): Promise<AdminOfferDto> {
  return request<AdminOfferDto>(`/admin/my-coffee/offers/${encodeURIComponent(offerId)}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

/** GET /api/v1/admin/my-coffee/service-shifts/current */
export function getCurrentServiceShift(token: string): Promise<ServiceShiftDto | null> {
  return request<ServiceShiftDto | null>("/admin/my-coffee/service-shifts/current", {
    headers: authHeader(token),
  });
}

/** POST /api/v1/admin/my-coffee/service-shifts/open */
export function openServiceShift(
  token: string,
  input: { name?: string; type?: "MORNING" | "AFTERNOON" | "CUSTOM"; label?: string; notes?: string },
): Promise<ServiceShiftDto> {
  return request<ServiceShiftDto>("/admin/my-coffee/service-shifts/open", {
    method: "POST",
    headers: authHeader(token),
    ...jsonBody(input),
  });
}

/** POST /api/v1/admin/my-coffee/service-shifts/close */
export function closeCurrentServiceShift(token: string): Promise<ServiceShiftDto> {
  return request<ServiceShiftDto>("/admin/my-coffee/service-shifts/close", {
    method: "POST",
    headers: authHeader(token),
  });
}

/** GET /api/v1/admin/my-coffee/service-shifts */
export function listServiceShifts(
  token: string,
  status?: "OPEN" | "CLOSED",
  page = 1,
  limit = 50,
): Promise<ServiceShiftListDto> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return request<ServiceShiftListDto>(`/admin/my-coffee/service-shifts?${params.toString()}`, {
    headers: authHeader(token),
  });
}

/** GET /api/v1/admin/my-coffee/table-sessions */
export function listTableSessions(
  token: string,
  options: { serviceShiftId?: string; status?: "ACTIVE" | "CLOSED"; page?: number; limit?: number } = {},
): Promise<TableSessionListDto> {
  const params = new URLSearchParams();
  if (options.serviceShiftId) params.set("serviceShiftId", options.serviceShiftId);
  if (options.status) params.set("status", options.status);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  return request<TableSessionListDto>(
    `/admin/my-coffee/table-sessions${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: authHeader(token),
    },
  );
}

/** GET /api/v1/admin/my-coffee/table-sessions/:sessionId */
export function getTableSession(token: string, sessionId: string): Promise<TableSessionDto> {
  return request<TableSessionDto>(`/admin/my-coffee/table-sessions/${encodeURIComponent(sessionId)}`, {
    headers: authHeader(token),
  });
}

/** PATCH /api/v1/admin/my-coffee/table-sessions/:sessionId/close */
export function closeTableSession(token: string, sessionId: string): Promise<TableSessionDto> {
  return request<TableSessionDto>(`/admin/my-coffee/table-sessions/${encodeURIComponent(sessionId)}/close`, {
    method: "PATCH",
    headers: authHeader(token),
  });
}

/** GET /api/v1/admin/my-coffee/tables */
export function listCoffeeTables(token: string): Promise<AdminTableListDto> {
  return request<AdminTableListDto>("/admin/my-coffee/tables", {
    headers: authHeader(token),
  });
}

/** POST /api/v1/admin/my-coffee/tables/:tableNumber/close */
export function closeCoffeeTable(token: string, tableNumber: number): Promise<AdminTableCloseDto> {
  return request<AdminTableCloseDto>(`/admin/my-coffee/tables/${encodeURIComponent(String(tableNumber))}/close`, {
    method: "POST",
    headers: authHeader(token),
  });
}
