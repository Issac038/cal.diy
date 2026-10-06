# Development Log — Issue #24482: Keyboard accessibility missing for BorderRadiusTable component

- **Repository:** `Issac038/cal.diy` (fork of `calcom/cal.diy`)
- **Issue:** https://github.com/calcom/cal.diy/issues/24482
- **Branch:** `fix/24482-border-radius-keyboard` (fully independent of `fix/18786-name-autocomplete`)
- **Constraint:** exactly 8 meaningful commits, no push until reviewed.

## Issue summary

The `BorderRadiusTable` component lets users copy Tailwind border-radius class names by clicking cards with a mouse. The cards are not keyboard reachable (no Tab focus) and Enter/Space do nothing, so keyboard-only users cannot copy at all. Expected: cards focusable with `tabIndex=0`, Enter/Space copies the class, mouse behavior unchanged.

## Investigation

1. **Locating the component**: `BorderRadiusTable` does **not exist on the current branch or on `main`**. Full-text search, glob, and `git log -S` history search were used.
2. It lived at `apps/ui-playground/components/ui/BorderRadiusTable.tsx` (65 lines) and was **deleted on Nov 19, 2025** in commit `a7352cf587` — *"chore: remove ui-playground app (#25266)"* — together with the whole playground (MDX docs, Shadow/Spacing/Type tables). `git merge-base --is-ancestor a7352cf587 main` confirmed the removal is on `main`.
3. **Timeline**: the issue was filed **Oct 15, 2025**, i.e. ~2 months *before* the component was removed, which is why the report is accurate but the target has since disappeared.
4. The historical source was recovered with `git show a7352cf587^:apps/ui-playground/components/ui/BorderRadiusTable.tsx` (and its `border-radius.mdx` page).
5. **Reviewer decision**: restore the component into a live location and fix it (option "Restore & fix"), documented transparently, rather than closing the issue as obsolete.

## Root cause

The card element is a plain `<div onClick={...}>`:

- no `tabIndex` → not reachable via Tab (not focusable);
- no `role` → not announced as interactive;
- no `onKeyDown` → Enter/Space do nothing.

Mouse input works because `onClick` alone handles pointer events. This is the classic "clickable non-interactive element" accessibility anti-pattern (WAI-ARIA: an element with `role="button"` must be focusable and activate on Enter/Space).

## Existing behavior

- Mouse click on a card copies its Tailwind class (`navigator.clipboard.writeText`) and shows a success toast. Works.
- Keyboard: cards are skipped by Tab; Enter/Space on any focus produces nothing. Broken.

## Expected behavior

- Cards are reachable with Tab and expose `role="button"` + `tabindex="0"`.
- Enter and Space on a focused card copy that card's Tailwind class (Space must also not scroll the page).
- Mouse click behavior remains identical.
- A visible focus indicator and a sensible accessible name are present.

## Adaptation discovered during restoration

The historical component imported `Toaster` from `react-hot-toast`. That package has been **fully removed from the repository** (the toast system migrated to `sonner`; `showToast(message, variant)` from `@calcom/ui/components/toast` kept the same signature). The restoration therefore drops the stale `react-hot-toast` import/`<Toaster />`; `showToast` calls are unchanged. The component is re-homed to `apps/web/components/ui/BorderRadiusTable.tsx` with a public static page at `/design/border-radius`, following the existing `apps/web/app/icons` design-utility-page precedent (issue repro step 1: "Navigate to the BorderRadiusTable component in the app").

## Plan (8 commits)

1. Restore component + **red** keyboard regression test + this log.
2. Improve test fixtures/helpers for accurate keyboard testing.
3. Core keyboard fix (role/tabIndex/onKeyDown) → green.
4. Strengthen interaction coverage (per-card correctness, mouse preservation, Space default-prevention).
5. Focus/ARIA/semantic details (focus ring, accessible name).
6. Lint/format/type checks and fixes.
7. Final targeted regression verification.
8. Finalize this log.

## Commit history

### Commit 1

**Commit message:**
`feat(web): restore BorderRadiusTable from ui-playground for #24482`

**Purpose:**
Precondition for the whole issue: bring the removed component back (adapted only for the sonner toast migration), expose it at a navigable route, and pin the reported keyboard failure with a red regression test before touching behavior.

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.tsx` (restored from `a7352cf587^`, pre-fix state)
- `apps/web/app/design/border-radius/page.tsx` (new public static route)
- `apps/web/components/ui/BorderRadiusTable.test.tsx` (red regression test)
- `DEVELOPMENT_LOG_24482.md` (this file)

**Why the change was necessary:**
Without the component in the tree there is nothing to fix or test; the issue's reproduction steps require it to be navigable in the app.

**Technical reasoning:**
- Test placement `apps/web/components/ui/` is covered by both the root vitest config and the workspace's `@calcom/web/components` project.
- Tests address cards via `screen.getByText(name).closest(".cursor-pointer")` — valid for the pre-fix markup (no role yet), so the same helper survives the fix.
- `navigator.clipboard` is undefined in jsdom, so the fixture defines it with a `vi.fn()`.
- A mouse-click test is included from the start as a *preservation guard* (expected green even before the fix).

**Challenges encountered:**
1. The component did not exist anywhere on the branch — required history archaeology (`git log -S`) to find its deletion commit and recover the source.
2. The recovered source imports `react-hot-toast`, which no longer exists in the dependency tree.

**How the challenges were solved:**
1. Located removal commit `a7352cf587`, verified it is on `main`, recovered the file with `git show a7352cf587^:<path>`, and got reviewer approval for the restore-and-fix approach.
2. Dropped the stale `Toaster` (sonner's `Toaster` is mounted by the app; `showToast` API unchanged), documented above.

**Tests performed:**
`TZ=UTC node node_modules/vitest/vitest.mjs run apps/web/components/ui/BorderRadiusTable.test.tsx`

**Result:**
**RED as intended** — `Test Files 1 failed (1)`, `Tests 3 failed | 1 passed (4)`, exit code 1 (captured via `PIPESTATUS[0]`):
- ✗ `exposes each token card as a focusable button` — role/tabindex are `null`
- ✗ `copies the Tailwind class when Enter is pressed on a card`
- ✗ `copies the Tailwind class when Space is pressed on a card`
- ✓ `keeps the existing mouse-click copy behavior intact` (preservation guard, green from the start)

This exactly reproduces issue #24482: keyboard interaction absent, mouse interaction working.

---
