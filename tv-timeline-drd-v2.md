# TV Show Lifespan Tracker — Design Requirements Document (DRD)

**Version:** 2.0  
**Date:** 2026-08-27  
**Status:** Current UI/interaction source of truth  
**Audience:** Codex / frontend implementation in VS Code  
**Companion:** `tv-timeline-prd-v2.md`

> This DRD describes the current desktop design and implementation invariants. When older prototype notes conflict with this file, use this file. Figma is the final visual reference for spacing and composition.

---

## 1. Figma references

Figma file:

`https://www.figma.com/design/CCsx5Zpu3XifV6qAAiBAkL/tivie`

Important desktop states in the file:

- **Primary combined state:** node `20:128` — ratings ON + episode count ON.
- **Ratings OFF / episode count ON:** node `40:2`.
- **Ratings ON / episode count OFF:** node `40:144`.
- **Additional updated ratings reference:** node `29:154`.

Codex should use these current screens as the visual target rather than rebuilding from stale prototype measurements alone.

---

## 2. Visual language

### 2.1 Colors

Use these as design tokens:

```css
--bg:          #FAF8F4;
--panel:       #FFFFFF;
--divider:     #E4E0D8;
--border:      #D3CDC0;
--ink:         #1C1B19;
--muted:       #8C8778;
--faint:       #B3AE9E;
--ongoing:     #3B63F5;
--ongoing-dim: #E8ECFE;
--finished:    #A7A296;
--finished-dim:#ECE9E2;
```

Status rule is load-bearing:

- Ongoing = blue.
- Finished = grey.

Do not introduce extra status colors into the timeline.

### 2.2 Typography

Font: **Lexend**.

Use weight/size hierarchy before introducing new colors.

Current marker text treatment:

- Season/part identity = muted/faint.
- Episode count = primary dark/black ink.
- These are separate text nodes/components.

### 2.3 Aesthetic

- Warm off-white canvas.
- White panels/controls.
- Thin dividers.
- Minimal radius except circular/pill controls.
- Restrained shadows only where floating controls need separation.
- No decorative gradients.
- No animation-heavy visualization in MVP.

---

## 3. Desktop shell

The application is a single desktop workspace with fixed outer dimensions equal to the browser viewport.

Conceptual layout:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ page/title area                                                     │
├──────────────┬──────────────────────────────────────────────────────┤
│ TV SHOWS     │ YEAR RULER                              [search]      │
│ sidebar      ├──────────────────────────────────────────────────────┤
│              │ custom horizontal scrollbar                          │
│              ├──────────────────────────────────────────────────────┤
│ show row 1   │ timeline lane 1                                      │
│ show row 2   │ timeline lane 2                                      │
│ show row 3   │ timeline lane 3                                      │
│ ...          │ ...                                                  │
│              │ [rating scale] [display toggles]          [zoom]     │
└──────────────┴──────────────────────────────────────────────────────┘
                                             search drawer overlays →
```

### Layout invariants

- Sidebar width: approximately **260px** in the current desktop system.
- Year ruler height: **64px**.
- Custom horizontal scrollbar strip sits immediately under ruler.
- Sidebar header height must equal ruler + scrollbar header stack.
- Show rows and timeline lanes must share one centralized `LANE_HEIGHT` token.
- The current Figma mockups use larger lanes than the historical 96px prototype; **do not hardcode the old 96px value from the legacy PRD**. Match the current Figma and keep the value centralized.

---

## 4. Sidebar

### 4.1 Header

Contains:

- `TV Shows`.
- Secondary selected-count/empty-state text.
- Circular `+` add button at the right.

The `+` opens the search panel.

### 4.2 Show row anatomy

Order from left to right:

```text
[ − ] [ poster ] [ title / years / status ]
```

The `−` is deliberately **left of the poster**.

Do not put the remove affordance at the far right of the row.

Poster reference size in the current design family: approximately `44 × 64px`.

Metadata hierarchy:

- Title: primary.
- Years: secondary.
- Status dot + status text: tertiary.

### 4.3 Alignment

The sidebar list and timeline list may be separate DOM containers, but row alignment is non-negotiable.

Use the same lane-height token and synchronized `scrollTop`.

Never horizontally translate the sidebar with the timeline.

---

## 5. Timeline header and sticky search

### 5.1 Blue year ruler

- Solid ongoing blue.
- White year labels.
- Year labels/guide boundaries use the same X mapping as the timeline.
- Year content pans horizontally with the timeline.

### 5.2 Search trigger

The search trigger visually appears embedded in the top-right of the blue ruler region:

- White square.
- Approximately `64 × 64px`.
- Magnifying glass icon.
- Thin left/bottom border treatment.

**Important implementation correction:** the trigger is viewport-pinned relative to the timeline area. It must not disappear or drift when the year content pans horizontally.

A good structure is:

```text
timelineViewport
├── horizontallyTranslatedTimelineContent
│   ├── yearRulerContent
│   ├── yearGuides
│   └── lanes
└── fixedOverlayLayer
    └── searchTrigger
```

Do not place the search trigger inside the element receiving the horizontal `translateX()`.

### 5.3 Search drawer

- Anchored to the right edge of the viewport/app.
- White surface.
- Approximately 420px wide in the established design language.
- Full-height overlay/panel.
- Slides in/out horizontally.
- Own vertical scroll for results.
- Remains stationary while timeline/date content pans.

Adding a show closes the drawer.

The drawer's fixed positioning is an implementation requirement, not merely a visual suggestion.

---

## 6. Horizontal coordinate system

Use one source of truth for X position.

Example abstraction:

```ts
function yearToX(year: number): number
```

or, if exact dates are used internally:

```ts
function dateToX(date: Date): number
```

Every horizontal artifact must derive from the same mapping:

- Year labels.
- Vertical year guides.
- Release markers.
- Rating/flat connecting paths.
- Same-year offsets.

Changing zoom must not cause these layers to drift relative to each other.

### 6.1 Dynamic domain

Do not retain the old hardcoded `1994–2029` prototype domain.

Compute domain from selected-show data.

### 6.2 Same-year micro-offset

Group release units by year.

If a year contains one release:

- Place it on the normal year anchor.

If a year contains multiple releases:

- Sort by `airDate` if available.
- Apply a small symmetrical or within-bucket X offset.
- Keep the cluster clearly associated with the parent year guide.
- Preserve chronological left-to-right order.
- Keep all positions inside a reasonable fraction of one year width.

Do not solve collisions by moving a marker into the next calendar year.

Arcane is the required stress case.

---

## 7. Timeline lane anatomy

Paint order, back to front:

1. Row background.
2. Vertical year grid lines.
3. Rating guide/reference layer when ratings are ON.
4. Connecting show path.
5. Release markers.
6. Release label groups.

### 7.1 Connecting path

- Straight line segments between chronological markers.
- Ongoing show stroke = blue.
- Finished show stroke = grey.
- Approximate stroke weight: 2px.
- Rounded line joins/caps are acceptable.

Do not resurrect the old ECG/heartbeat waveform.

### 7.2 Marker shape

- Standard release: small filled circle.
- Final release of a finished show: filled rounded square.
- Marker fill matches status color.

No animated live pulse is required in current MVP.

---

## 8. Ratings ON state

This is one of the most important implementation sections.

### 8.1 Scale semantics

Each lane contains a shared semantic scale:

```text
10 = top
0  = bottom
```

The scale is absolute across every show. Never calculate min/max from each show's own ratings.

### 8.2 Padding-aware Y formula

Centralize these values:

```ts
const RATING_MIN = 0;
const RATING_MAX = 10;
const LANE_TOP_PAD = ...;
const LANE_BOTTOM_PAD = ...;
```

Then:

```ts
function ratingToY(rating: number, laneHeight: number) {
  const clamped = Math.max(0, Math.min(10, rating));
  const usable = laneHeight - LANE_TOP_PAD - LANE_BOTTOM_PAD;
  return LANE_TOP_PAD + ((10 - clamped) / 10) * usable;
}
```

This means:

- 10.0 always maps to the top usable boundary.
- 5.0 always maps to the exact midpoint of the usable 0–10 scale.
- 0.0 always maps to the bottom usable boundary.

### 8.3 Rating tick/guide marks

When ratings are ON, show the small rating-guide/tick system at the left side of each row as seen in Figma.

The guides are functional. Marker Y positions must mathematically agree with them.

Do not manually eyeball marker Y coordinates independently of the scale.

### 8.4 Rating 5 reference

A dotted blue horizontal line spans the lane at the Y position corresponding to rating 5.

- Blue accent.
- Reduced opacity.
- Sits behind show path/markers.

### 8.5 Rating caption

The bottom-left rating-scale caption is shown while rating mode is active, e.g.:

`Height = IMDb rating · 0–10`

Treat it as an informational scale legend in the current MVP.

The older 5.0–9.5 compressed scale is not required unless explicitly reintroduced.

---

## 9. Ratings OFF state

When the ratings switch is OFF:

- Hide row rating tick/guide marks.
- Hide rating-5 dotted reference line.
- Hide rating-specific scale legend.
- Place all markers on one baseline per row.
- Connecting path becomes a flat line through those marker centers.
- Maintain all X positions and same-year micro-offsets.

The transition in implementation should be state-driven; do not maintain separate duplicated datasets for the two modes.

---

## 10. Release labels and episode counts

### 10.1 Separate elements

This is a coding requirement.

Correct:

```jsx
<div className="releaseLabelGroup">
  <span className="seasonLabel">S1</span>
  <span className="episodeCount">27 eps</span>
</div>
```

Incorrect:

```jsx
<span>S1 27 eps</span>
```

Even if Figma visually groups them, they are separate semantic/display elements.

### 10.2 Color treatment

```text
S1       -> muted/faint
27 eps   -> black / primary ink
```

For Arcane:

```text
S1 P1    -> muted/faint
3 eps    -> black / primary ink
```

### 10.3 Episode toggle

Episode-count OFF must hide only the episode-count element.

Avoid rebuilding the entire marker label string when toggling.

### 10.4 Label placement

Labels sit close to their markers and follow the marker's X/Y movement in rating mode.

When labels would overlap or clip:

- Prefer small local offsets.
- Alternate above/below where needed for dense same-year clusters.
- Do not break chronological association.

The Arcane cluster is the visual stress test.

---

## 11. Display controls

A floating control group near the bottom of the timeline contains two independent switches:

- `IMDb ratings`
- `Episode count`

Switch states must be independent booleans:

```ts
interface DisplaySettings {
  showRatings: boolean;
  showEpisodeCounts: boolean;
}
```

Do not model this as one enum with three screenshots. The screenshots are examples of combinations, not the state architecture.

Expected switch visuals:

- ON = blue track, knob on right.
- OFF = neutral track, knob on left.

---

## 12. Zoom control

Bottom-right floating control.

- Minus.
- Current scale label (`Years` in current mock).
- Plus.

Zoom controls **horizontal time density only**.

Do not change:

- Lane height.
- Rating 0–10 vertical range.
- Sidebar width.
- Search panel position.

Keep `pxPerYear` or equivalent in one centralized timeline state model.

---

## 13. Scrolling architecture

Recommended DOM responsibility split:

```text
app
├── sidebar
│   ├── sidebarHeader
│   └── sidebarList            // vertical scroll
└── timelineViewport
    ├── timelineHeader
    │   ├── horizontalContent  // years transform/pan
    │   └── searchOverlay      // fixed, NOT transformed
    ├── horizontalScrollbar
    ├── timelineScroll         // vertical scroll
    │   └── horizontalContent  // grid + lanes transform/pan
    └── fixedBottomControls
```

### 13.1 Vertical sync

If sidebar and timeline use separate vertical scroll containers:

- Mirror `scrollTop` in both directions.
- Use a reentrancy guard to avoid feedback loops.
- Never mirror horizontal position.

### 13.2 Horizontal pan

The timeline should support:

- Custom scrollbar thumb drag.
- Track click/jump.
- Click-and-drag canvas panning.
- Horizontal trackpad/wheel panning.

Avoid browser-native horizontal page navigation gestures stealing the interaction.

### 13.3 Fixed UI exclusions

The following do **not** participate in horizontal timeline translation:

- Sidebar.
- Sidebar `+` button.
- Timeline search trigger.
- Search drawer.
- Bottom display controls.
- Bottom zoom control.
- Rating legend/control.

Only time-based content pans.

---

## 14. Search panel UI

MVP search body should remain lightweight.

Recommended result anatomy:

```text
[poster?]  Show name
           2015–2023                    [ + ]
```

Requirements:

- Search input remains at top of drawer.
- Live/autocomplete filtering.
- Loading state.
- Empty/no-results state.
- Already-added shows are disabled or omitted.
- `+` adds show.
- Panel slides out after successful add.
- `Esc` and explicit close control should close panel.

Genre/recommendation carousels from earlier prototypes are not required for current MVP.

---

## 15. Responsive scope

Current design target is desktop.

Do not spend initial implementation time inventing a mobile layout.

The desktop app should still tolerate ordinary laptop/desktop widths without breaking core alignment.

---

## 16. Accessibility requirements

- All switches must be keyboard-operable and have accessible names.
- Search open/close controls require accessible labels.
- `+`/`−` controls require accessible names containing the relevant show where appropriate.
- Status is communicated by text/shape as well as color.
- Final finished marker square supplies a non-color shape cue.
- Focus states must be visible.
- Do not rely on animation for meaning.
- If tooltips expose rating details, they must not be the only accessible source of that information.

---

## 17. Data-to-view boundary

Keep data normalization out of the rendering components.

Recommended layers:

```text
TMDB/API response
      ↓
normalization / enrichment
      ↓
TimelineShow + ReleaseUnit model
      ↓
coordinate calculation
      ↓
presentational timeline components
```

The renderer should not contain Arcane-specific branches such as:

```ts
if (show.title === 'Arcane') { ... }
```

Instead, Arcane should arrive as six normalized release units.

---

## 18. Recommended implementation baseline for a new repo

This section is an implementation recommendation, not a historical product decision.

If the repository is still empty, a good baseline for the VS Code/Codex build is:

- Next.js.
- TypeScript.
- React components.
- CSS Modules or a small global CSS/token layer.
- Vercel deployment.
- Server-side/API route or another safe mechanism for calls that require secrets.

If the repo has already been initialized in a different reasonable stack, do not rewrite it only to match this recommendation.

### Suggested component boundaries

```text
src/
├── app/
├── components/
│   ├── TimelineAppShell
│   ├── ShowsSidebar
│   ├── ShowSidebarRow
│   ├── TimelineViewport
│   ├── YearRuler
│   ├── HorizontalScrollbar
│   ├── TimelineLane
│   ├── ReleaseMarker
│   ├── ReleaseLabelGroup
│   ├── DisplayControls
│   ├── ZoomControls
│   └── SearchDrawer
├── lib/
│   ├── tmdb
│   ├── timelineCoordinates
│   ├── normalizeShow
│   └── rating
├── types/
│   └── timeline.ts
└── styles/
```

Do not create one giant component or a single-file prototype for the production build.

---

## 19. Secrets and API hygiene

- Never hardcode an API secret/token into committed source.
- Use environment variables.
- Include `.env.local` in `.gitignore`.
- Provide `.env.example` with variable names only.
- Do not log secret values.
- Prefer a server/proxy boundary when an API credential should not be exposed in browser code.

---

## 20. Current-state checklist for visual QA

### Combined ON state

- [ ] IMDb switch ON.
- [ ] Episode count switch ON.
- [ ] Rating ticks visible.
- [ ] Rating-5 dotted line visible.
- [ ] Markers vertically staggered by ratings.
- [ ] Season/part labels muted.
- [ ] Episode counts black and separate.
- [ ] `−` is left of every poster.

### Ratings OFF state

- [ ] IMDb switch OFF.
- [ ] Episode count remains ON.
- [ ] Rating guides disappear.
- [ ] Flat per-row line.
- [ ] Episode counts remain visible.

### Episode OFF state

- [ ] IMDb switch ON.
- [ ] Episode switch OFF.
- [ ] Rating graph remains.
- [ ] Season/part labels remain.
- [ ] Episode-count elements disappear.

### Arcane

- [ ] Three release parts can coexist in the same year.
- [ ] Chronology is readable.
- [ ] Labels do not display release dates.
- [ ] Episode count is separate from part label.
- [ ] Finished final release uses the finished-end marker shape.

### Sticky search

- [ ] Pan timeline left/right.
- [ ] Year/date content moves.
- [ ] Search trigger stays pinned.
- [ ] Open search drawer.
- [ ] Continue panning timeline if allowed by interaction layer.
- [ ] Drawer remains fixed in place.

---

## 21. Explicit legacy behavior to avoid

Do not accidentally reintroduce these from older prototype docs:

- One-file vanilla HTML prototype architecture.
- Hardcoded 1994–2029 timeline domain.
- 96px row-height assumption.
- ECG/heartbeat waveform.
- Ongoing animated pulse as a required status indicator.
- Release-date text under Arcane markers.
- Combined `"S1 27 eps"` text node/string.
- Remove button on the right side of a show row.
- Search UI that translates horizontally with the timeline.
- Per-show normalized rating axes.
- Silent substitution of TMDB rating for IMDb rating.

---

## 22. Definition of done for the first coded visual milestone

The first meaningful frontend milestone is complete when Codex can run the app locally and demonstrate:

1. Three fixture shows, including Arcane.
2. Sidebar rows aligned with three timeline lanes.
3. Add/remove shell behavior.
4. Dynamic year ruler and vertical year guides.
5. Horizontal pan + custom scrollbar + zoom.
6. Sticky search trigger/drawer architecture.
7. Independent ratings and episode-count switches.
8. Accurate 0–10 rating-to-Y mapping.
9. Ratings-off flat state.
10. Episode-count-off state.
11. Separate season/part and episode-count elements.
12. Same-year release-part offsets.

API integration can then replace fixture data behind the same normalized model without redesigning the timeline components.
