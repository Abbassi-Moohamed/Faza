import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "@/lib/api";
import { listSessionOrders } from "@/lib/orders";

const okResponse = (body: unknown) =>
  ({
    ok: true,
    json: async () => body,
  }) as Response;

const errorResponse = (status: number, body: unknown) =>
  ({
    ok: false,
    status,
    json: async () => body,
  }) as Response;

describe("session orders API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scopes the request to the session token", async () => {
    const fetchMock = vi.fn(async () => okResponse({ success: true, data: { orders: [], total: 0, session: {} } }));
    vi.stubGlobal("fetch", fetchMock);

    await listSessionOrders("token-123");

    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/orders?sessionToken=token-123");
    expect(url).not.toContain("limit=");
  });

  it("passes the limit when asked", async () => {
    const fetchMock = vi.fn(async () => okResponse({ success: true, data: { orders: [], total: 0, session: {} } }));
    vi.stubGlobal("fetch", fetchMock);

    await listSessionOrders("token-123", 10);

    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("sessionToken=token-123");
    expect(url).toContain("limit=10");
  });

  it("unwraps the envelope", async () => {
    const session = { tableNumber: 7, status: "ACTIVE", orderCount: 1, openedAt: "", closedAt: null };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okResponse({ success: true, data: { orders: [{ id: "a" }], total: 1, session } })),
    );

    const response = await listSessionOrders("token-123");

    expect(response.total).toBe(1);
    expect(response.session.tableNumber).toBe(7);
  });

  it("raises a typed error when the token is refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(401, { success: false, message: "Invalid session token." })),
    );

    await expect(listSessionOrders("bad-token")).rejects.toBeInstanceOf(ApiClientError);
  });
});
