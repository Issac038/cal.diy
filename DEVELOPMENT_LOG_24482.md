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

### Commit 2

**Commit message:**
`test(web): add keyboard-testing fixtures for BorderRadiusTable`

**Purpose:**
Build the test scaffolding needed to accurately simulate keyboard interaction in jsdom, and add a test that reproduces the "Tab skips the cards" behavior itself (not just its consequences).

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.test.tsx` (helpers + new focus test)
- `DEVELOPMENT_LOG_24482.md`

**Why the change was necessary:**
The first draft had the clipboard fixture and card lookup inlined and could only infer the focus problem from missing attributes. Dedicated helpers make the keyboard simulation faithful and the assertions reusable across commits 3-7.

**Technical reasoning:**
- `setupClipboardMock()` — jsdom ships no `navigator.clipboard`; a fresh `vi.fn()` per test prevents cross-test leakage.
- `getCard()` uses `.closest(".cursor-pointer")` because the pre-fix card has no ARIA role; the helper therefore works before *and* after the fix (no test rewrite needed when roles appear).
- `focusCard()` relies on jsdom's real focusability rules: `div.focus()` without `tabindex` is a no-op, so the new test is a direct reproduction of "Tab cannot reach the cards".
- `pressKey()` dispatches a **cancelable, bubbling** `KeyboardEvent` and returns it, so later commits can assert `defaultPrevented` (Space must not scroll).
- `renderTable()` keeps renders uniform.

**Challenges encountered:**
jsdom has no keyboard synthesis and no Tab traversal (and `@testing-library/user-event` is not a dependency of this repo), so focus + key semantics must be emulated with native `focus()`/`KeyboardEvent` — which is exactly why the helpers were built around those primitives rather than higher-level APIs that are unavailable here.

**How the challenge was solved:**
Chose native DOM primitives with documented semantics (above) and kept every helper dependency-free, matching the repo's existing fireEvent-based test style.

**Tests performed:**
`TZ=UTC node node_modules/vitest/vitest.mjs run apps/web/components/ui/BorderRadiusTable.test.tsx`

**Result:**
**Still RED, deeper coverage** — `Tests 4 failed | 1 passed (5)`, exit 1:
- ✗ role/tabindex, ✗ Enter copy, ✗ Space copy
- ✗ **new**: `lets keyboard focus land on a card` (activeElement stays `<body>` — the Tab-skip reproduced directly)
- ✓ mouse-click preservation guard

---

### Commit 3

**Commit message:**
`fix(web): make BorderRadiusTable cards keyboard accessible`

**Purpose:**
The core #24482 fix — give each token card WAI-ARIA button semantics and Enter/Space activation.

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.tsx`
- `DEVELOPMENT_LOG_24482.md`

**What changed / Why:**
On the card div: `role="button"` (announces the interactive role), `tabIndex={0}` (joins the natural tab order so Tab reaches it), and an `onKeyDown` that copies the card's class on `Enter` or `Space` and calls `preventDefault()` (Space would otherwise scroll the page). The mouse `onClick` is untouched, preserving pointer behavior byte-for-byte.

**Technical reasoning:**
- A `<div>` wrapper containing block children cannot be replaced by a native `<button>` (button's content model is phrasing content; divs inside buttons are invalid), so `div + role=button + tabIndex + keydown` is the correct WAI-ARIA pattern - and it is the pattern the issue itself suggests.
- `preventDefault()` on both keys prevents any default scroll/follow behavior during activation.
- The handler reads `token.className` from the map closure, so each card copies exactly its own class (covered further in Commit 4).

**Challenges encountered:**
None significant — the fixtures from Commit 2 were designed for this change; no test edits were needed for the suite to turn green.

**Tests performed:**
`TZ=UTC node node_modules/vitest/vitest.mjs run apps/web/components/ui/BorderRadiusTable.test.tsx`

**Result:**
**GREEN** — `Test Files 1 passed (1)`, `Tests 5 passed (5)`, exit 0. All four previously red assertions (role/tabIndex, focus landing, Enter copy, Space copy) now pass; the mouse guard still passes.

---

### Commit 4

**Commit message:**
`test(web): cover per-card copies, Space scroll, and non-activation keys`

**Purpose:**
Strengthen keyboard interaction coverage across the grid's states/controls so the fix cannot silently regress into wrong-card copies, page scrolling, or over-broad key handling.

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.test.tsx` (3 new tests)
- `DEVELOPMENT_LOG_24482.md`

**Why the change was necessary:**
The core tests proved *that* copying works, not *which* class gets copied or what happens around it. A handler that always copied `tokens[0]` would have passed the original suite.

**What the new tests cover:**
1. **Per-card correctness** — click "None", Enter on "Full", Space on "Medium" in one render; asserts the three calls are `rounded-none`, `rounded-full`, `rounded-md` in order (`toHaveBeenNthCalledWith`).
2. **Space must not scroll** — asserts the dispatched keydown event is `defaultPrevented` while still copying `rounded-xl`.
3. **Only Enter/Space activate** — pressing "a" copies nothing (guards against an over-broad handler).

**Challenges encountered:**
None significant.

**Tests performed:**
Targeted vitest run of the test file.

**Result:**
**GREEN** — `Tests 8 passed (8)`, exit 0.

---

### Commit 5

**Commit message:**
`fix(web): add focus indicator and accessible name to radius cards`

**Purpose:**
Complete the accessibility semantics required by the keyboard fix: a visible keyboard-focus indicator and an explicit accessible name announcing the copy action.

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.tsx` (`aria-label` + `focus-visible:*` classes)
- `apps/web/components/ui/BorderRadiusTable.test.tsx` (2 new tests)
- `DEVELOPMENT_LOG_24482.md`

**Why the change was necessary:**
`tabIndex` alone made cards focusable but with only the browser's default outline; `role="button"` alone would announce the concatenated card text as its name. The repo's established pattern (Switch, Checkbox, dialog inputs) is `focus-visible:outline-none focus-visible:ring-2 ...` with the `ring-emphasis` color, and an explicit `aria-label` gives assistive tech a short, action-oriented name ("Copy rounded-md").

**Technical reasoning:**
- `focus-visible:` variants render only for keyboard focus, so mouse users see no visual change (pointer behavior preserved).
- jsdom does not compute Tailwind styles, so the focus-ring test locks the classes that produce the ring; the aria-label is asserted exactly.

**Challenges encountered:**
Minor: an initial draft of the class-level assertion contained a nonsense negative check; replaced it with positive assertions of all four classes composing the focus ring before committing.

**Tests performed:**
Targeted vitest run of the test file.

**Result:**
**GREEN** — `Tests 10 passed (10)`, exit 0.

---

### Commit 6

**Commit message:**
`chore(web): apply biome formatting to BorderRadiusTable changes`

**Purpose:**
Run the repository's lint/format tooling over every file changed for #24482 and record the results.

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.tsx`, `BorderRadiusTable.test.tsx`, `apps/web/app/design/border-radius/page.tsx` (biome safe fixes)
- `DEVELOPMENT_LOG_24482.md`

**What changed / Why:**
`biome check --write` applied import organization and made the React import type-only (`import type React from "react"` — React is referenced only as `React.FC`). Biome exited 0. Remaining diagnostics are **warnings/infos only** (9 warnings, 5 infos): class-ordering suggestions on the restored preview markup and repo-wide style notices — no errors, so nothing fails CI; they were left untouched to avoid churn beyond the issue's scope (the broken pre-commit hook means these checks are run manually, as established for this environment).

**Challenges encountered:**
None new. The environment limitation from previous work persists: the `.husky/pre-commit` hook cannot run here (yarn unavailable; force-stages unrelated generated files), so `--no-verify` is used after running its equivalents manually.

**Tests performed:**
1. `biome check --write` on the 3 changed code files — exit 0; then `biome check` re-run — **exit 0**.
2. Targeted vitest re-run after the biome fixes (files changed, so a re-run was required) — **`Tests 10 passed (10)`, exit 0**.
3. `tsc --noEmit -p apps/web/tsconfig.json` — launched as a background process (exceeds the synchronous command limit on this monorepo); outcome recorded in Commit 7.

**Result:**
Lint/format green; tests still green after formatting; type-check pending in background.

---

### Commit 7

**Commit message:**
`fix(web): make BorderRadiusTable tokens prop optional for type safety`

**Purpose:**
Final behavioral/regression verification surfaced two real type errors caused by this change; fix the cause and re-verify everything.

**Files changed:**
- `apps/web/components/ui/BorderRadiusTable.tsx` (optional `tokens` prop honored with a default)
- `DEVELOPMENT_LOG_24482.md`

**What the final verification found:**
1. Targeted vitest — **10/10 passed, exit 0**; biome — **exit 0**; source check confirms `role="button"`, `tabIndex={0}`, `aria-label`, `onKeyDown` present; git clean, stash intact, `main...HEAD` = exactly 4 files.
2. Background `tsc --noEmit -p apps/web/tsconfig.json` finished: **599 errors total — but 2 were MINE**: `TS2741: Property 'tokens' is missing in type '{}' but required in type 'BorderRadiusTableProps'` in `page.tsx` and the test file. The historical component declared a *required* `tokens` prop while ignoring it (the old MDX usage was never type-checked). The other **597 errors are pre-existing** — the exact same count measured on an unrelated branch in this environment (missing generated `@calcom/trpc/types/server/*` modules and tRPC router collisions), i.e. environment/dependency issues unrelated to #24482.

**Why the fix is correct:**
Rather than suppressing the error, the declared API is made real: `tokens?: BorderRadiusToken[]` (optional) with `tokens = defaultTokens` in the destructure — callers can now override the token list, and `<BorderRadiusTable />` type-checks.

**Challenges encountered:**
A restored component carried a latent type defect invisible in its original home (MDX was outside strict checking); only a full-project tsc caught it.

**How it was solved:**
Kept the background-tsc habit from earlier work: run the full project check asynchronously, then `grep` the log for this branch's files to separate my errors from the pre-existing 597. Fixed the cause; a verification tsc re-run was launched before committing (result recorded in Commit 8).

**Tests performed (after the fix):**
Targeted vitest — **10/10, exit 0**; biome on the changed file — **exit 0**.

**Result:**
All runnable checks green; type-error cause fixed; tsc re-run pending in background.

---

### Commit 8

**Commit message:**
`docs: finalize development log for #24482`

**Purpose:**
Final branch review and complete documentation for submission.

**Files changed:**
- `DEVELOPMENT_LOG_24482.md` (final sections below + tsc verification result)

**Review performed:** `git diff main...HEAD`, `git log --oneline --reverse main..HEAD`, `git status` — exactly 8 commits, exactly 4 issue-related files, clean tree, stash untouched, nothing pushed.

---

## Final Solution

Issue #24482 is fixed by giving every `BorderRadiusTable` token card full keyboard accessibility while preserving mouse behavior:

```tsx
// apps/web/components/ui/BorderRadiusTable.tsx — on each card
<div
  key={token.name}
  onClick={() => handleCopy(token.className)}   // unchanged mouse behavior
  role="button"                                 // announced as a button
  tabIndex={0}                                   // reachable with Tab
  aria-label={`Copy ${token.className}`}         // explicit accessible name
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();                    // Space must not scroll
      handleCopy(token.className);
    }
  }}
  className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emphasis focus-visible:ring-offset-2 ..."
/>
```

Because the component no longer existed on `main` (deleted with the ui-playground app in #25266, *after* the issue was filed), the contribution first **restores it from git history** (`a7352cf587^`), adapts it to the current toast system (react-hot-toast -> sonner), exposes it at `/design/border-radius` (mirroring the `/icons` design-utility page), and only then applies the accessibility fix. The component also gained a *usable* `tokens` prop (optional, defaults to the radius scale) to fix a latent type defect the restoration surfaced.

## Challenges Faced

1. **The target component was missing entirely** — the issue pointed at code deleted by an unrelated later PR.
2. **Stale dependency in recovered source** — `react-hot-toast` no longer exists in the repo.
3. **jsdom keyboard simulation limits** — no Tab traversal, no `navigator.clipboard`, and `@testing-library/user-event` is not a dependency.
4. **Pre-commit hook unusable in this environment** — `yarn` not on PATH; hook also force-stages unrelated generated files (known from the #18786 work).
5. **Monorepo type-check duration** — full `tsc` exceeds the synchronous command limit.
6. **Latent type defect in the restored component** — required-but-unused `tokens` prop caused 2 real TS2741 errors.

## How Challenges Were Solved

1. History archaeology (`git log -S "BorderRadiusTable"`), verified the removal commit is on `main`, recovered the exact source with `git show a7352cf587^:<path>`, and got an explicit reviewer decision ("Restore & fix") before writing code; all documented above.
2. Dropped the stale `Toaster`; kept the unchanged `showToast(message, variant)` API.
3. Built dependency-free fixtures around native DOM primitives: `setupClipboardMock()` (defines `navigator.clipboard`), `focusCard()` (jsdom only focuses truly focusable elements — a faithful Tab-skip reproduction pre-fix), `pressKey()` (cancelable bubbling `KeyboardEvent`, returns the event so `defaultPrevented` is assertable), and an ARIA-agnostic `getCard()` that works pre- and post-fix.
4. Used `git commit --no-verify` **only after** manually running the hook's equivalents (biome + targeted vitest) every time; disclosed in every commit message and here.
5. Ran `tsc` as a background process and grepped its log for this branch's files.
6. Fixed the cause (optional prop + default honoring the declared interface) instead of suppressing the error; re-ran tests/biome and a verification tsc.

## Testing

| Stage | Check | Result |
|---|---|---|
| Commit 1 | targeted vitest (pre-fix) | **3 failed \| 1 passed, exit 1** — reproduced #24482 |
| Commit 2 | + focus test, fixtures | **4 failed \| 1 passed, exit 1** — Tab-skip reproduced directly |
| Commit 3 | after core fix | **5 passed, exit 0** — green |
| Commit 4 | + interaction coverage | **8 passed, exit 0** |
| Commit 5 | + focus/ARIA tests | **10 passed, exit 0** |
| Commit 6 | biome on 3 changed files | **exit 0** (9 warnings / 5 infos remain: class-ordering + repo-wide style notices, no errors); tests re-run after formatting: **10/10, exit 0** |
| Commit 7 | full `tsc --noEmit -p apps/web` (background) | 599 errors: **2 in changed files (TS2741) — fixed**; **597 pre-existing** (identical to an unrelated branch: missing generated `@calcom/trpc/types/server/*`, tRPC router collisions) |
| Commit 8 | verification tsc re-run (background) | **TSC_EXIT=2, 597 errors — all pre-existing, `MY_FILE_ERRORS=0`**; the 2 TS2741 errors from Commit 7 are gone |
| Final | targeted vitest / biome / git review | see below |

**Final verification (at Commit 8):**
- Targeted vitest: **10/10 passed, exit 0** (last run immediately after the Commit 7 type fix; only this log file changed afterwards).
- `biome check` on all 3 changed code files: **exit 0**.
- `git status`: clean (no modifications, no untracked files to stage); `stash@{0}` untouched; `.freebuff/` never staged.
- `git diff main...HEAD --stat`: exactly 4 files; `git rev-list --count main..HEAD`: **8**.

All exit codes were captured with `PIPESTATUS[0]` through output filters so filters could not mask failures.

**Known limitation (honest statement):** real browser/assistive-tech behavior (actual Tab traversal in Chrome, VoiceOver/NVDA announcements, rendered focus ring) is not automated here — jsdom has no Tab order and cannot compute Tailwind styles. What is verified: focusability semantics (`tabIndex`), role/ARIA attributes, key-activation behavior with cancelable events, class-level focus-ring presence, and clipboard calls. A manual screen-reader/keyboard pass in a browser is recommended before merging.

## Key Findings / Learnings

- **Issue lifetime vs. code lifetime**: a bug report can be accurate when filed and still target code deleted later; always verify the component exists before planning a fix (`git log -S` is the fast way to find removed code).
- **WAI-ARIA button pattern**: clickable non-`<button>` elements need `role="button"`, `tabIndex={0}`, and Enter/Space activation with `preventDefault` for Space; native `<button>` is preferred when the content model allows it (it does not here — block children inside a button are invalid HTML).
- **`focus-visible:` variants** give keyboard-only focus indicators without changing mouse UX.
- **aria-label vs. visible text**: an explicit action-oriented label ("Copy rounded-md") beats concatenated card text as an accessible name.
- **Testing keyboard behavior in jsdom**: native `focus()` respects real focusability rules; cancelable `KeyboardEvent`s expose `defaultPrevented`; clipboard must be installed manually.
- **Restoration work needs dependency re-verification**: recovered code can reference libraries the repo has since removed.
- **Type-checking can be scoped with grep**: run the big check in the background, then separate "my errors" from the pre-existing baseline instead of skipping the check.

## Reflection

- The most valuable part of this contribution was the investigation: the "obvious" plan (patch the component) was impossible, and the discovery that #25266 had deleted the target changed the whole approach — with an explicit reviewer decision documented rather than a silent guess.
- Evidence discipline held throughout: red before green (never weakened), re-runs after every file-changing step, exit codes captured through pipes, pre-existing tsc errors measured and separated instead of hidden — no suppressions were added.
- Scope stayed tight: 4 files, one component, one route, one test file, one log; no unrelated refactors; the mouse path was guarded by tests from the first commit so "preserve existing behavior" was proven, not assumed.
- With more time: an axe-core/Playwright check in real Chromium and a screen-reader pass would close the automation gap described above.
