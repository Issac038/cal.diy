import { render } from "@testing-library/react";
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

    // Address the affected field via its semantic `name` attribute rather than by
    // position, so the assertion keeps targeting the name input even when the
    // dialog also renders the optional guest email input. Radix portals the dialog
    // to document.body, so query the document rather than the render container.
    const nameInput = document.querySelector('input[name="name"]');

    expect(nameInput).toBeInTheDocument();
    expect(nameInput?.getAttribute("autocomplete")).toBe("given-name");
  });

  it("keeps person-name autocomplete on the name input when the guest email input is also shown", () => {
    render(
      <LogInOverlay
        isOpen
        bookingUid="booking-uid"
        bookingTitle="Quick Meeting"
        hostName="Host Person"
        requireEmailForGuests
        onGuestCredentialsReceived={vi.fn()}
        meetingUrl="https://example.daily.co/room"
      />
    );

    // With requireEmailForGuests the dialog renders two inputs; a positional
    // "first textbox" lookup would now be ambiguous, so the name input must be
    // identified by its semantic name attribute and keep its given-name token.
    expect(document.querySelectorAll("input")).toHaveLength(2);

    const nameInput = document.querySelector('input[name="name"]');
    const emailInput = document.querySelector('input[type="email"]');

    expect(nameInput).toBeInTheDocument();
    expect(nameInput?.getAttribute("autocomplete")).toBe("given-name");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).not.toBe(nameInput);
  });
});
