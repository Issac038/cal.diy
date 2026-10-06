import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogInOverlay } from "../views/videos-single-view";

// The view module imports daily-js at top level; LogInOverlay itself never uses it.
// Loading the real bundle in jsdom spams canvas "not implemented" errors for no benefit.
vi.mock("@daily-co/daily-js", () => ({
  default: {
    createFrame: vi.fn(),
    getCallFrameConfig: vi.fn(),
  },
}));

// Reproduces https://github.com/calcom/cal.diy/issues/18786
// A logged-out guest joining a video sees the "Enter your name to join the call"
// dialog. Without an explicit person-name `autocomplete` token, Chrome (macOS/iOS)
// falls back to field heuristics and can suggest the user's name from Google Pay
// payment cards instead of their contact identity.
describe("LogInOverlay guest name input (issue #18786)", () => {
  it("renders the guest name input with person-name autocomplete semantics", () => {
    render(
      <LogInOverlay
        isOpen
        bookingUid="booking-uid"
        bookingTitle="Quick Meeting"
        hostName="Host Person"
        onGuestCredentialsReceived={vi.fn()}
        meetingUrl="https://example.daily.co/room"
      />
    );

    // requireEmailForGuests defaults to false, so the dialog exposes exactly one textbox: the name input
    const nameInput = screen.getByRole("textbox");

    expect(nameInput).toBeInTheDocument();
    expect(nameInput.getAttribute("autocomplete")).toBe("given-name");
  });
});
