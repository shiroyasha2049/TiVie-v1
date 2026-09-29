# TV Show Lifespan Tracker — Product Requirements Document (PRD)

**Version:** 2.0  
**Date:** 2026-08-27  
**Status:** Current coding source of truth  
**Audience:** Codex / implementation work in VS Code  
**Product:** Desktop-first TV show lifespan + season rating comparison timeline

> This document supersedes the older `tv-timeline-ui-prd.md` and the prototype-era decisions in `tv-timeline-changelog.md` whenever they conflict with the requirements below. The old documents remain useful for history, but Codex should implement this PRD + the companion DRD first.

---

## 1. Product summary

The product is an interactive web app for comparing the lifespan of multiple TV shows on one shared horizontal timeline.

A user searches for TV shows, adds them to a comparison stack, and sees each show's release history plotted against calendar years. Each show's row can optionally become a season-rating graph: when IMDb ratings are enabled, each release marker moves vertically according to its IMDb rating on a shared 0–10 scale.

The timeline is the product. Search, posters, metadata, and controls exist to support the comparison view rather than to turn the product into a general TV database browser.

---

## 2. Core product goals

1. Let a user quickly compare **how long multiple shows ran**.
2. Show **when seasons or release parts occurred** along a shared calendar timeline.
3. Optionally show **how ratings changed over time** without changing the horizontal time meaning.
4. Let users independently control visual density by toggling:
   - IMDb rating positioning on/off.
   - Episode counts on/off.
5. Handle awkward real-world release patterns cleanly, especially multiple seasons or release parts landing in the same calendar year.
6. Keep navigation predictable: horizontal timeline movement must never move the fixed search UI or the left show list.

---

## 3. Primary user flow

### 3.1 Empty state

1. User opens the app.
2. The timeline shell is visible even with no selected shows.
3. User opens search from the `+` control in the TV Shows sidebar header or the search control at the top-right of the timeline header.

### 3.2 Search and add

1. User types a TV show name.
2. Autocomplete/search results update from TMDB.
3. Each result should expose enough information to disambiguate a show:
   - Show title.
   - Run years, e.g. `2015–2023` or `2020–`.
   - Add `+` action.
   - Poster may be shown when available, but text clarity is more important than card-heavy presentation.
4. User clicks `+`.
5. The show is added to the comparison stack.
6. The search panel slides closed after the add action.
7. The timeline domain recalculates if the new show begins earlier or ends later than the existing selection.
8. Duplicate additions are not allowed.

### 3.3 Compare

For every selected show, the app renders:

- Sidebar metadata row.
- Timeline lane aligned to that sidebar row.
- One plotted release marker per season or release part.
- A line connecting chronological release markers.
- Season/part label.
- Optional episode count.
- Optional IMDb rating positioning.

### 3.4 Remove

Each selected show has a `−` control **to the left of its poster**. Clicking it removes the show and its matching timeline lane. The timeline domain recalculates from the remaining shows.

---

## 4. Timeline model

### 4.1 Horizontal axis = calendar time

The horizontal axis always represents calendar years.

The visible year domain is generated from the currently selected shows rather than being permanently hardcoded.

Minimum expected behavior:

- Start at the earliest selected show's first plotted release year.
- End at the latest relevant plotted release year; for ongoing shows, include the current/known upcoming year when data supports it.
- Adding an older show extends the timeline left.
- Adding a later-running show extends it right.
- Removing a show can contract the domain.

Example:

- The Boys alone might produce approximately `2019–2026`.
- Adding Supernatural would extend the comparison back to approximately `2005` while preserving the later end of the domain.

All year labels, year guide lines, release markers, and connecting paths must derive from the same horizontal coordinate system.

### 4.2 Year guide lines

Vertical year guide lines descend from the year ruler through the show lanes.

They are not decoration: they are the alignment reference that lets a viewer read a marker's year immediately.

### 4.3 Releases in the same year

Multiple plotted releases may occupy the same calendar year. This includes:

- Two seasons starting in the same year.
- A season released in several parts/acts within the same year, e.g. Arcane.

Do **not** stack those markers directly on top of each other.

Current chosen behavior:

- Keep all of them associated with the same year bucket.
- Preserve chronological order using actual release dates when available.
- Apply a small horizontal micro-offset within/around that year so markers and labels remain distinguishable.
- Do not invent an extra year or change the global year scale just to solve overlap.

Arcane is the required reference edge case. The UI should be able to display labels such as:

- `S1 P1`
- `S1 P2`
- `S1 P3`
- `S2 P1`
- `S2 P2`
- `S2 P3`

Release dates are useful in the underlying data model and for ordering, but **they are not displayed as marker label text in the current UI**.

---

## 5. IMDb rating mode

### 5.1 Independent display toggle

IMDb ratings have their own on/off switch and are independent from the episode-count switch.

The app must therefore support at least these combinations:

| IMDb ratings | Episode count | Expected state |
|---|---|---|
| ON | ON | Rating graph + season/part label + episode count |
| OFF | ON | Flat timeline + season/part label + episode count |
| ON | OFF | Rating graph + season/part label only |
| OFF | OFF | Flat timeline + season/part label only |

The current Figma mockups explicitly cover the first three states; the fourth follows naturally from the independent-toggle requirement.

### 5.2 Ratings ON

When IMDb ratings are enabled:

- Every row uses the **same 0–10 rating scale**.
- **10 is the top of the row.**
- **0 is the bottom of the row.**
- A season/release marker's Y-position is computed from its rating value.
- Ratings are **not normalized per show**. An 8.0 must sit at the same vertical level in every row.
- Small per-row rating guide/tick marks appear at the left edge of each timeline lane.
- A blue dotted reference line at rating **5** spans each row.
- The connecting line follows the rating-positioned markers.

Conceptual mapping:

```text
10.0  ─ top
 9.0
 8.0
 7.0
 6.0
 5.0  ─ dotted blue reference
 4.0
 3.0
 2.0
 1.0
 0.0  ─ bottom
```

Implementation formula, ignoring row padding:

```text
yNormalized = (10 - clamp(rating, 0, 10)) / 10
```

The DRD defines the rendering formula more precisely.

### 5.3 Ratings OFF

When IMDb ratings are disabled:

- Rating guide/tick marks disappear.
- The dotted rating-5 reference line disappears.
- Any rating-scale caption/control that is only relevant to rating mode is hidden.
- All release markers for a show return to a single shared horizontal baseline inside that row.
- Same-year horizontal micro-offset behavior still applies.
- Episode count visibility remains controlled independently.

### 5.4 Rating data integrity

Do not label a non-IMDb value as IMDb.

The implementation must treat rating data as optional until the IMDb-derived source is finalized. TMDB vote averages are not an acceptable silent substitute for a field labeled `IMDb`.

For prototype fixtures, clearly mark mocked or reconstructed values in code/data rather than presenting them as verified production data.

The exact production source and missing-rating rendering behavior remain an implementation/data decision to resolve before launch.

---

## 6. Episode count mode

Episode count has its own independent on/off switch.

### 6.1 ON

The label reads visually like:

```text
S1   27 eps
```

or, for split releases:

```text
S1 P1   3 eps
```

But these must be **two separate UI/text elements**, not one combined string.

Required semantic grouping:

```text
release-label-group
├── season/part label   -> "S1" or "S1 P1"
└── episode count       -> "27 eps" or "3 eps"
```

Current visual treatment:

- Season/part label: muted/faint text.
- Episode count: dark/black primary ink.
- They sit side by side with a small gap.

### 6.2 OFF

Hide only the episode-count element.

Do not remove, rewrite, or reposition the season/part identity more than necessary.

---

## 7. Show status and marker semantics

Two status colors only:

- **Blue** = ongoing/still airing.
- **Grey** = finished.

Timeline line and marker color follow status.

Marker shapes:

- Normal plotted release = circle.
- Final plotted release of a finished show = square/rounded square.

This gives finished status a shape cue in addition to color.

No ongoing pulse animation is required for the current MVP.

---

## 8. Sidebar requirements

The left sidebar is the persistent show list.

### Header

- Title: `TV Shows`.
- Secondary copy indicates selected-show count or empty-state guidance.
- `+` button opens search.

### Show row

Each row contains:

1. `−` remove control **to the left of the poster**.
2. Poster/fallback poster.
3. Show title.
4. Run years.
5. Status indicator/text.

Sidebar row N must remain vertically aligned with timeline lane N.

The sidebar does not move horizontally when the timeline pans.

---

## 9. Search panel requirements

The search UI is intentionally sticky/fixed.

### Critical behavior

**Horizontal timeline/date scrolling must not move the search panel.**

The search panel is anchored to the right side of the viewport/app shell. It is outside the horizontally translated timeline content.

The timeline can pan left/right underneath or beside this fixed UI.

### Search trigger

The timeline search trigger is visually embedded in the top-right of the blue ruler area, but implementation-wise it must be pinned to the timeline viewport rather than translated with the years.

### Panel behavior

- Opens from the right.
- Fixed relative to the app viewport.
- Search input at top.
- Search results scroll vertically inside the panel.
- Adding a result closes/slides the panel back out.
- Closing the panel does not alter timeline pan position.

---

## 10. Scrolling and zoom behavior

### Vertical

- Sidebar show list scrolls vertically.
- Timeline lanes scroll vertically.
- Their vertical positions are synchronized so rows never drift apart.

### Horizontal

- Timeline/date content pans left/right.
- Sidebar does not move horizontally.
- Search trigger/panel do not move horizontally.
- Custom horizontal scrollbar sits directly under the year ruler.
- Canvas drag/pan should be supported.
- Horizontal trackpad gestures should not accidentally trigger browser back/forward navigation.

### Zoom

- Zoom changes horizontal year spacing only.
- Zoom does not change row height or IMDb scale semantics.
- The same coordinate function must drive year labels, year guides, markers, and lines after every zoom change.

---

## 11. Data requirements

### 11.1 TMDB-backed data

TMDB is the intended source for search/autocomplete and general TV metadata.

Expected fields include, where available:

- TMDB show ID.
- Title/name.
- Poster path.
- First air date.
- Last air date.
- Status.
- Genres.
- Season list.
- Season air dates.
- Episode counts.

Do not scrape TMDB when its API provides the required data.

### 11.2 Release-unit model

The rendered unit must support both a normal season and a release part/act.

Conceptual shape:

```ts
interface ReleaseUnit {
  id: string;
  seasonNumber: number;
  partNumber?: number;
  label: string;          // "S1" or "S1 P1"
  airDate?: string;       // ISO date when known
  year: number;
  episodeCount?: number;
  imdbRating?: number;
}
```

A show can therefore plot:

```ts
interface TimelineShow {
  id: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  status: 'ongoing' | 'finished';
  firstYear: number;
  lastYear?: number;
  releases: ReleaseUnit[];
}
```

Do not force release-part data into a model that only understands whole seasons.

### 11.3 Arcane / split-release data

TMDB season metadata alone may not represent every release part/act in the exact way the visualization needs. The product data layer must allow a small normalization/enrichment step for split-release shows rather than hardcoding special cases into the rendering component.

The timeline renderer should consume normalized `ReleaseUnit[]` and should not care whether the source was a standard TMDB season or an enriched part record.

---

## 12. Product states and acceptance criteria

### A. Add/remove

- [ ] Search returns disambiguated TV show results.
- [ ] Add action creates one sidebar row and one matching timeline lane.
- [ ] A show cannot be added twice.
- [ ] `−` is left of the poster.
- [ ] Removing a show removes both row and lane.
- [ ] Timeline year range recalculates after add/remove.

### B. Ratings toggle

- [ ] Ratings ON shows 0–10 row guide semantics.
- [ ] 10 maps to top and 0 maps to bottom.
- [ ] Rating 5 dotted blue line is in the correct Y position.
- [ ] Markers use absolute shared rating values, not per-show normalization.
- [ ] Ratings OFF removes rating guides/reference and flattens each row.

### C. Episode toggle

- [ ] Episode count is a separate DOM/component element from season/part label.
- [ ] Episode count uses dark/black text.
- [ ] Season/part label remains muted.
- [ ] Episode OFF hides count only.

### D. Same-year releases

- [ ] Multiple releases in one year do not overlap completely.
- [ ] Chronological order is preserved.
- [ ] All releases remain visually associated with the correct year.
- [ ] Arcane can render three parts in a season/year cleanly.

### E. Sticky search

- [ ] Search panel does not move while timeline pans horizontally.
- [ ] Search trigger remains pinned at the top-right viewport edge of the ruler region.
- [ ] Adding a show closes the panel.

### F. Alignment

- [ ] Sidebar row N aligns with timeline lane N at all vertical scroll positions.
- [ ] Horizontal pan/zoom does not affect sidebar position.
- [ ] Year ruler, year guides, markers, and lines remain aligned after zoom.

---

## 13. MVP scope

### In scope

- Desktop web app.
- TMDB search/autocomplete.
- Add/remove multiple shows.
- Dynamic timeline range.
- Horizontal pan + zoom.
- Synchronized vertical show rows.
- Ratings toggle.
- Episode-count toggle.
- Same-year/split-release handling.
- Sticky right search panel.
- Current Figma visual system.

### Not required for MVP

- Mobile layout.
- User accounts.
- Saved comparisons/cloud persistence.
- Show detail pages.
- Social/sharing features.
- Recommendation carousels unless explicitly reintroduced.
- ECG/heartbeat visualization.
- Ongoing-show pulse animation.
- Displaying release dates as marker text.
- A separate per-show normalized rating scale.

---

## 14. Open decisions that Codex must not silently invent

1. **Production IMDb rating source** and exact season/part aggregation method.
2. **Missing IMDb rating UI** in ratings-on mode.
3. Whether the historical optional **5.0–9.5 compressed rating view** returns; current primary behavior is the honest shared 0–10 scale.
4. Exact source/enrichment workflow for split-season release parts not represented directly by TMDB.
5. Persistence beyond the current browser session.

When one of these blocks implementation, surface the decision instead of fabricating data or product behavior.
