import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BorderRadiusTable } from "./BorderRadiusTable";

// Reproduces https://github.com/calcom/cal.diy/issues/24482
// The token cards copy their Tailwind class on mouse click, but have no
// keyboard support: they cannot be reached with Tab and Enter/Space do
// nothing, so keyboard users cannot copy at all.

const clipboardWrite = vi.fn().mockResolvedValue(undefined);

const getCard = (tokenName: string): HTMLElement => {
  const label = screen.getByText(tokenName);
  const card = label.closest(".cursor-pointer");
  if (!card) {
    throw new Error(`Token card not found for "${tokenName}"`);
  }
  return card as HTMLElement;
};

describe("BorderRadiusTable keyboard accessibility (issue #24482)", () => {
  beforeEach(() => {
    clipboardWrite.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWrite },
    });
  });

  it("exposes each token card as a focusable button", () => {
    render(<BorderRadiusTable />);

    const card = getCard("None");

    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("tabindex")).toBe("0");
  });

  it("copies the Tailwind class when Enter is pressed on a card", () => {
    render(<BorderRadiusTable />);

    fireEvent.keyDown(getCard("Small"), { key: "Enter" });

    expect(clipboardWrite).toHaveBeenCalledWith("rounded-sm");
  });

  it("copies the Tailwind class when Space is pressed on a card", () => {
    render(<BorderRadiusTable />);

    fireEvent.keyDown(getCard("Large"), { key: " " });

    expect(clipboardWrite).toHaveBeenCalledWith("rounded-lg");
  });

  it("keeps the existing mouse-click copy behavior intact", () => {
    render(<BorderRadiusTable />);

    fireEvent.click(getCard("Default"));

    expect(clipboardWrite).toHaveBeenCalledWith("rounded");
  });
});
