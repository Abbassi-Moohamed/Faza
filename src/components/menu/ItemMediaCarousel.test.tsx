import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/i18n";
import type { MenuItem } from "@/types/menu";

import { ItemMediaCarousel } from "./ItemMediaCarousel";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- lightweight test stand-in for next/image
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const dict = getDictionary();

class MockIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe = (target: Element) => {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  };

  disconnect = () => undefined;
  unobserve = () => undefined;
  takeRecords = () => [];
}

function videoItem(): MenuItem {
  return {
    id: "item-video",
    name: "Latte",
    description: "Espresso and steamed milk",
    price: 3,
    promotion: null,
    isAvailable: true,
    media: [
      {
        url: "https://cdn.example.com/clip.mp4",
        type: "video",
        mimeType: "video/mp4",
        durationMs: 4_000,
      },
    ],
  };
}

function imageItem(): MenuItem {
  return {
    id: "item-images",
    name: "Cappuccino",
    description: "Espresso and foam",
    price: 2.5,
    promotion: null,
    isAvailable: true,
    media: [
      { url: "https://cdn.example.com/one.jpg", type: "image", mimeType: "image/jpeg" },
      { url: "https://cdn.example.com/two.jpg", type: "image", mimeType: "image/jpeg" },
    ],
  };
}

describe("ItemMediaCarousel", () => {
  let container: HTMLDivElement;
  let root: Root;
  let prefersReducedMotion = false;
  let playSpy: ReturnType<typeof vi.fn>;
  let pauseSpy: ReturnType<typeof vi.fn>;

  function render(item: MenuItem) {
    act(() => {
      root.render(<ItemMediaCarousel item={item} />);
    });
  }

  function toggle(): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(".item-media__toggle");
  }

  function activeDot(): HTMLElement | null {
    return container.querySelector<HTMLElement>(".item-media__dot--active");
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    prefersReducedMotion = false;

    playSpy = vi.fn(() => Promise.resolve());
    pauseSpy = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: playSpy });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: pauseSpy });

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        (query: string) =>
          ({
            matches: prefersReducedMotion && query.includes("reduced-motion"),
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("autoplays a single video and exposes a pause control", () => {
    render(videoItem());

    const button = toggle();
    expect(button).not.toBeNull();
    expect(button!.getAttribute("aria-label")).toBe(dict.menuItem.mediaPause);
    expect(button!.getAttribute("aria-pressed")).toBe("false");
    expect(playSpy).toHaveBeenCalled();

    const callsBeforePause = playSpy.mock.calls.length;
    act(() => button!.click());

    expect(toggle()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaPlay);
    expect(toggle()!.getAttribute("aria-pressed")).toBe("true");
    expect(pauseSpy).toHaveBeenCalled();
    expect(playSpy.mock.calls.length).toBe(callsBeforePause);

    act(() => toggle()!.click());
    expect(toggle()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaPause);
    expect(playSpy.mock.calls.length).toBeGreaterThan(callsBeforePause);
  });

  it("starts paused and lets the visitor opt in when reduced motion is requested", () => {
    prefersReducedMotion = true;

    render(videoItem());

    expect(toggle()).not.toBeNull();
    expect(toggle()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaPlay);
    expect(playSpy).not.toHaveBeenCalled();

    act(() => toggle()!.click());

    expect(toggle()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaPause);
    expect(playSpy).toHaveBeenCalled();
  });

  it("pauses the slideshow when the visitor changes the slide", () => {
    vi.useFakeTimers();
    render(imageItem());

    expect(activeDot()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaCount(1, 2));

    const next = container.querySelector<HTMLButtonElement>(".item-media__nav--next");
    expect(next).not.toBeNull();
    act(() => next!.click());

    expect(activeDot()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaCount(2, 2));
    expect(toggle()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaPlay);

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(activeDot()!.getAttribute("aria-label")).toBe(dict.menuItem.mediaCount(2, 2));
  });
});
