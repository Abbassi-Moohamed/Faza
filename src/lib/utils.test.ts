import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "./utils";

describe("slugify", () => {
  it("normalizes accents, case, whitespace, and punctuation", () => {
    expect(slugify("  Café El Manzah!  ")).toBe("cafe-el-manzah");
  });
});

describe("uniqueSlug", () => {
  it("derives the default slug from the coffee name", () => {
    expect(uniqueSlug("Café El Manzah")).toBe("cafe-el-manzah");
  });

  it("appends the first available numeric suffix when the name is taken", () => {
    expect(uniqueSlug("Café El Manzah", ["cafe-el-manzah"])).toBe("cafe-el-manzah-2");
    expect(uniqueSlug("Café El Manzah", ["cafe-el-manzah", "CAFE-EL-MANZAH-2"])).toBe("cafe-el-manzah-3");
  });

  it("falls back to a valid slug for names without latin characters", () => {
    expect(uniqueSlug("مقهى", ["coffee"])).toBe("coffee-2");
  });

  it("keeps the generated slug within the backend's 80 character limit", () => {
    const slug = uniqueSlug("a".repeat(120), ["a".repeat(80)]);
    expect(slug).toHaveLength(80);
    expect(slug.endsWith("-2")).toBe(true);
  });
});
