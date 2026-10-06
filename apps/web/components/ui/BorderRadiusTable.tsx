"use client";

import { showToast } from "@calcom/ui/components/toast";
import type React from "react";

interface BorderRadiusToken {
  name: string;
  value: string;
  className: string;
}

interface BorderRadiusTableProps {
  /** Override the rendered radius tokens; defaults to the Cal.diy radius scale. */
  tokens?: BorderRadiusToken[];
}

const defaultTokens: BorderRadiusToken[] = [
  { name: "None", value: "0px", className: "rounded-none" },
  { name: "Small", value: "0.125rem", className: "rounded-sm" },
  { name: "Default", value: "0.25rem", className: "rounded" },
  { name: "Medium", value: "0.375rem", className: "rounded-md" },
  { name: "Large", value: "0.5rem", className: "rounded-lg" },
  { name: "XLarge", value: "0.75rem", className: "rounded-xl" },
  { name: "2XLarge", value: "1rem", className: "rounded-2xl" },
  { name: "3XLarge", value: "1.5rem", className: "rounded-3xl" },
  { name: "Full", value: "9999px", className: "rounded-full" },
];

export const BorderRadiusTable: React.FC<BorderRadiusTableProps> = ({ tokens = defaultTokens }) => {
  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Copied ${value}`, "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      showToast("Failed to copy", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <div
          key={token.name}
          onClick={() => handleCopy(token.className)}
          // WAI-ARIA button semantics so the card is reachable with Tab and
          // activates with Enter/Space, matching the existing mouse behavior
          // (issue #24482). preventDefault stops Space from scrolling the page.
          role="button"
          tabIndex={0}
          // Announce the action to assistive tech and show a clear keyboard
          // focus indicator (jsdom cannot compute Tailwind styles, so tests
          // lock these via the aria-label and focus-visible classes).
          aria-label={`Copy ${token.className}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleCopy(token.className);
            }
          }}
          className="border-subtle bg-default hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emphasis focus-visible:ring-offset-2 group relative cursor-pointer overflow-hidden rounded-lg border p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emphasis text-sm font-medium">{token.name}</p>
                <p className="text-subtle mt-1 text-xs">{token.className}</p>
              </div>
              <p className="text-subtle text-sm">{token.value}</p>
            </div>
            <div className={`bg-emphasis h-16 w-full ${token.className}`} />
          </div>
        </div>
      ))}
    </div>
  );
};
