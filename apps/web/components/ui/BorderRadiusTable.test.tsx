import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BorderRadiusTable } from "./BorderRadiusTable";

// Reproduces https://github.com/calcom/cal.diy/issues/24482
// The token cards copy their Tailwind class on mouse click, but have no
// keyboard support: they cannot be reached with Tab and Enter/Space do
// nothing, so keyboard users cannot copy at all.

const clipboardWrite = vi.fn().mockResolvedValue(undefined);

/** jsdom has no navigator.clipboard, so install a fresh spy before each test. */
const setupClipboardMock = (): void => {
  clipboardWrite.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: clipboardWrite },
  });
};

/**
 * Cards are plain divs before the fix (no role yet), so they are addressed via
 * their cursor-pointer wrapper class instead of an ARIA query that would only
 * work after the fix. This keeps the helper valid across the red -> green runs.
 */
const getCard = (tokenName: string): HTMLElement => {
  const label = screen.getByText(tokenName);
  const card = label.closest(".cursor-pointer");
  if (!card) {
    throw new Error(`Token card not found for "${tokenName}"`);
  }
  return card as HTMLElement;
};

/**
 * Moves focus onto the card the way Tab would. jsdom only focuses truly
 * focusable elements, so this is a no-op while the card lacks tabindex -
 * exactly the reported "Tab skips the cards" behavior.
 */
const focusCard = (tokenName: string): HTMLElement => {
  const card = getCard(tokenName);
  card.focus();
  return card;
};

/**
 * Dispatches a cancelable, bubbling keydown like a real keyboard would.
 * The returned event lets tests assert defaultPrevented (Space must not
 * scroll the page while copying).
 */
const pressKey = (element: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  fireEvent(element, event);
  return event;
};

const renderTable = (): ReturnType<typeof render> => render(<BorderRadiusTable />);

describe("BorderRadiusTable keyboard accessibility (issue #24482)", () => {
  beforeEach(() => {
    setupClipboardMock();
  });

  it("exposes each token card as a focusable button", () => {
    renderTable();

    const card = getCard("None");

    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("tabindex")).toBe("0");
  });

  it("lets keyboard focus land on a card", () => {
    renderTable();

    const card = focusCard("None");

    expect(document.activeElement).toBe(card);
  });

  it("copies the Tailwind class when Enter is pressed on a card", () => {
    renderTable();

    pressKey(focusCard("Small"), "Enter");

    expect(clipboardWrite).toHaveBeenCalledWith("rounded-sm");
  });

  it("copies the Tailwind class when Space is pressed on a card", () => {
    renderTable();

    pressKey(focusCard("Large"), " ");

    expect(clipboardWrite).toHaveBeenCalledWith("rounded-lg");
  });

  it("keeps the existing mouse-click copy behavior intact", () => {
    renderTable();

    fireEvent.click(getCard("Default"));

    expect(clipboardWrite).toHaveBeenCalledWith("rounded");
  });

  it("copies each activated card's own class, not another card's", () => {
    renderTable();

    fireEvent.click(getCard("None"));
    pressKey(focusCard("Full"), "Enter");
    pressKey(focusCard("Medium"), " ");

    expect(clipboardWrite).toHaveBeenCalledTimes(3);
    expect(clipboardWrite).toHaveBeenNthCalledWith(1, "rounded-none");
    expect(clipboardWrite).toHaveBeenNthCalledWith(2, "rounded-full");
    expect(clipboardWrite).toHaveBeenNthCalledWith(3, "rounded-md");
  });

  it("prevents Space from scrolling the page while copying", () => {
    renderTable();

    const spaceEvent = pressKey(focusCard("XLarge"), " ");

    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(clipboardWrite).toHaveBeenCalledWith("rounded-xl");
  });

  it("does not copy on keys other than Enter and Space", () => {
    renderTable();

    pressKey(focusCard("Small"), "a");

    expect(clipboardWrite).not.toHaveBeenCalled();
  });
});
