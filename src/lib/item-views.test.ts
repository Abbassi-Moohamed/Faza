import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordMenuItemView } from "@/lib/api";

import { recordMenuItemViewOnce } from "./item-views";

vi.mock("@/lib/api", () => ({
  recordMenuItemView: vi.fn(),
}));

describe("recordMenuItemViewOnce", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(recordMenuItemView).mockResolvedValue({ recorded: true });
  });

  it("records an item once per browser tab, including while a request is pending", async () => {
    const pending = recordMenuItemViewOnce("cafe", "item");
    const duplicate = await recordMenuItemViewOnce("cafe", "item");

    expect(duplicate).toBe(false);
    expect(recordMenuItemView).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBe(true);
    await expect(recordMenuItemViewOnce("cafe", "item")).resolves.toBe(false);
    expect(recordMenuItemView).toHaveBeenCalledTimes(1);
  });

  it("allows retry after the request fails", async () => {
    vi.mocked(recordMenuItemView).mockRejectedValueOnce(new Error("network"));

    await expect(recordMenuItemViewOnce("cafe-retry", "item")).rejects.toThrow("network");
    await expect(recordMenuItemViewOnce("cafe-retry", "item")).resolves.toBe(true);
    expect(recordMenuItemView).toHaveBeenCalledTimes(2);
  });
});
