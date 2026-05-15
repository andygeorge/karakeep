# AI Summary Display Toggle — Design Spec

**Date:** 2026-05-15
**Status:** Approved (design phase)
**Scope:** Web app only (`apps/web`)

## Problem

The AI summary is only visible in the bookmark preview side panel (`BookmarkPreview.tsx:211`). Users browsing the dashboard grid/masonry views cannot see the AI summary or its controls without opening each bookmark. Big preview images dominate card real estate, even when the summary would be more useful at-a-glance.

## Solution

Add a new user-level display toggle that swaps the big preview image for the AI summary (and its controls) in `grid` and `masonry` layouts.

## Non-Goals

- No DB schema changes
- No new tRPC procedures (reuse existing summarize/update mutations)
- No mobile app changes
- No changes to non-LINK bookmark types (only LINK bookmarks support summarization today)

## UX Behavior

### Toggle placement
A new `Switch` row in `ViewOptions.tsx` labeled **"Show AI summary"**, alongside existing `showNotes`/`showTags`/`showTitle`/`imageFit` toggles. The toggle applies to all four layouts; behavior differs per layout (below).

### Per-layout rendering rules

| Layout | When toggle is ON for LINK bookmark |
|---|---|
| `grid`, `masonry` | Big image slot (`h-56`) is **replaced** by `AiSummarySlot` (full summary + controls inline) |
| `list` | `AiSummaryInline` is **added** inside the content area; image stays. Truncated by default, click-to-expand grows the card |
| `compact` | `AiSummaryInline` is **added** as a second row below the existing single-line row. Truncated by default, click-to-expand grows the card |

For non-LINK bookmarks or when toggle is off: no change to any layout.

### `AiSummarySlot` states (grid + masonry)
The slot has fixed dimensions matching the current image slot (`h-56 w-full`). It does not change card height.

| Bookmark state | Slot content |
|---|---|
| No summary + inference configured | Centered "Summarize with AI" button (sparkles icon, identical to `SummarizeBookmarkArea`) |
| No summary + inference NOT configured | Fall back to image (clean UX vs. dead space) |
| `summarizationStatus === "pending"` | Spinner + "Summarizing…" label |
| `summarizationStatus === "success"` (summary text present) | Truncated summary text (line-clamp ~7) + small icon-only controls in top-right corner (regenerate, delete) |
| `summarizationStatus === "failure"` | Error glyph + retry button (re-trigger summarize mutation) |

**Edge cases:**
- If `summarizationStatus === "success"` but `summary` is null/empty: treat as "no summary" state.
- If user is not the owner (`readOnly`): hide all controls (regenerate, delete, generate button). Only show the summary text or fall back to image.
- During regenerate mutation: show "Resummarizing…" overlay (mirror existing `SummarizeBookmarkArea` behavior).
- During delete mutation: show "Updating…" overlay.

Summary text overflow: clipped with line-clamp. No internal scroll (keeps card visually stable).

### `AiSummaryInline` (list + compact)
A compact, click-to-expand summary readout. Renders only when toggle is on, bookmark is LINK, and `bookmark.summary` exists. Other states (pending/failure/generate button) are NOT shown in list/compact — those flows live in grid/masonry slot and the preview side panel.

States:
- **Collapsed (default):** small Sparkles icon + line-clamped summary text (1 line in compact, 2 lines in list). Cursor pointer. Renders as a `<button>` for a11y.
- **Expanded (after click):** full markdown summary rendered in a panel below; small "collapse" affordance. Card's `max-h-96` is removed so the card grows to fit.

Click handling: button has `data-no-card-click` and stops propagation; toggling expanded state is local to the row (no persistence). Each card's expand state is independent. Controls (regenerate/delete) are NOT shown — users can access controls via the preview side panel.

## Settings Storage

Extend `UserLocalSettings` in `apps/web/lib/userLocalSettings/types.ts`:

```ts
bookmarkShowAiSummary: z.boolean().default(false);
```

Cookie storage uses the existing `hoarder-user-local-settings` mechanism. No new cookie.

### New server action
`updateShowAiSummary(value: boolean)` in `apps/web/lib/userLocalSettings/userLocalSettings.ts`, identical in shape to `updateShowNotes`.

### New hook
`useShowAiSummary()` in `apps/web/lib/userLocalSettings/bookmarksLayout.tsx`, returning the current value. Context provider already plumbs the full settings object — minimal additions needed.

## Component Architecture

### New file: `AiSummarySlot.tsx`
Path: `apps/web/components/dashboard/bookmarks/AiSummarySlot.tsx`

Responsibility: render a card-sized version of the AI summary UI. Reuses business logic from `SummarizeBookmarkArea.tsx` (mutations, status handling) but with compact styling appropriate for the card image slot.

Props:
- `bookmark: ZBookmark` — to access `summary`, `summarizationStatus`, ownership, etc.
- `fallbackImage: ReactNode` — rendered when inference is not configured or bookmark type doesn't support summary

Returns: `ReactNode` sized `h-56 w-full`, styled to match card aesthetic.

### Modified: `BookmarkLayoutAdaptingCard.tsx`

**`GridView`** — image-replacement (existing change preserved). Swap image for `AiSummarySlot` when toggle is on + bookmark is LINK.

**`ListView`** — render `AiSummaryInline` inside the right-hand content area (between content and tags). Lifts `expanded` state into `ListView`; removes `max-h-96` from the outer card div when expanded.

**`CompactView`** — restructure outer layout so the existing row is one of two rows in a column. Add a second row containing `AiSummaryInline` when summary is present + toggle on. Lifts `expanded` state into `CompactView`; removes `max-h-96` when expanded.

### Modified: `ViewOptions.tsx`
Add new toggle row. Always enabled (applies to all four layouts).

### Modified: `types.ts`, `userLocalSettings.ts`, `bookmarksLayout.tsx`
Add field, action, and hook per "Settings Storage" above.

## File Manifest

**New:**
- `apps/web/components/dashboard/bookmarks/AiSummarySlot.tsx`
- `apps/web/components/dashboard/bookmarks/AiSummaryInline.tsx`

**Modified:**
- `apps/web/lib/userLocalSettings/types.ts`
- `apps/web/lib/userLocalSettings/userLocalSettings.ts`
- `apps/web/lib/userLocalSettings/bookmarksLayout.tsx`
- `apps/web/components/dashboard/ViewOptions.tsx`
- `apps/web/components/dashboard/bookmarks/BookmarkLayoutAdaptingCard.tsx`

## Testing

- **Manual:** Toggle on in grid layout, verify image replaced by summary on LINK bookmarks with summaries; verify "Summarize with AI" button appears for LINKs without summaries when inference is configured; verify text/asset bookmarks unchanged; verify list/compact layouts unchanged; verify toggle disabled state in `ViewOptions` when layout is list/compact.
- **No new unit tests required** — logic is configuration plumbing + visual composition; existing summarize mutation tests cover the underlying behavior.

## Open Questions

None — design decided.

## Migration / Rollout

- Default value: `false` (preserves current UX for existing users).
- No data migration. New cookie field is additive; existing cookies without the field default to `false` via Zod.
