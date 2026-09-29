(function createTimeline(global) {
  const math = global.TVTimeline.math;

  function renderTimeline(shows, settings, layout) {
    const { domain, years, timelineWidth, pxPerYear } = layout;
    return `
      <section class="timeline-panel" aria-label="TV show comparison timeline">
        <header class="timeline-header">
          <div class="year-ruler-viewport" data-role="pan-surface">
            <div class="year-ruler-content" data-role="horizontal-content" style="width:${timelineWidth}px">
              ${years
                .map(
                  (year) => `<span class="year-label" style="left:${math.yearToX(year, domain, pxPerYear)}px">${year}</span>`,
                )
                .join("")}
            </div>
          </div>
          <button class="search-trigger" type="button" data-action="open-search" aria-label="Search for a TV show">⌕</button>
          <div class="scrollbar-track" data-role="scrollbar-track" aria-label="Timeline horizontal scrollbar">
            <button class="scrollbar-thumb" type="button" data-role="scrollbar-thumb" aria-label="Drag to pan the timeline"></button>
          </div>
        </header>

        <div class="timeline-scroll" data-role="timeline-scroll" tabindex="0" aria-label="Timeline lanes; drag or scroll horizontally to pan">
          ${
            shows.length
              ? shows.map((show) => renderLane(show, settings, layout)).join("")
              : `<div class="empty-timeline"><div><strong>Your timeline is ready.</strong><span>Add a show to start comparing.</span></div></div>`
          }
        </div>

        <div class="rating-legend" ${settings.showRatings ? "" : "hidden"}>
          Height = IMDb rating · 0–10 <span class="mock-badge">mock ratings</span>
        </div>
        <div class="floating-controls" aria-label="Display controls">
          <div class="control-pair">
            IMDb ratings
            <button class="switch" type="button" role="switch" aria-checked="${settings.showRatings}" data-action="toggle-ratings" aria-label="Show IMDb ratings"></button>
          </div>
          <div class="control-pair">
            Episode count
            <button class="switch" type="button" role="switch" aria-checked="${settings.showEpisodeCounts}" data-action="toggle-episodes" aria-label="Show episode counts"></button>
          </div>
        </div>
        <div class="zoom-controls" aria-label="Timeline zoom controls">
          <button type="button" data-action="zoom-out" aria-label="Zoom out">−</button>
          <span class="zoom-label">${pxPerYear}px / year</span>
          <button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
        </div>
      </section>
    `;
  }

  function renderLane(show, settings, layout) {
    const { domain, years, timelineWidth, pxPerYear } = layout;
    const releases = math.addSameYearOffsets(show.releases, domain, pxPerYear).map((item) => ({
      ...item,
      hasRating: Number.isFinite(item.imdbRating),
      y: settings.showRatings
        ? Number.isFinite(item.imdbRating)
          ? math.ratingToY(item.imdbRating)
          : math.LANE_HEIGHT - 13
        : math.flatToY(),
    }));
    const lineColor = show.status === "ongoing" ? "var(--ongoing)" : "var(--finished)";
    const pathReleases = settings.showRatings ? releases.filter((item) => item.hasRating) : releases;
    const points = pathReleases.map((item) => `${item.x},${item.y}`).join(" ");
    const ratingsUnavailable = settings.showRatings && releases.length && !pathReleases.length;

    return `
      <article class="timeline-lane" aria-label="${escapeHtml(show.title)} timeline">
        <div class="lane-canvas" data-role="horizontal-content" style="width:${timelineWidth}px">
          ${years
            .map(
              (year) => `<span class="year-guide" aria-hidden="true" style="left:${math.yearToX(year, domain, pxPerYear)}px"></span>`,
            )
            .join("")}
          ${
            settings.showRatings
              ? `<span class="rating-reference" aria-hidden="true" style="top:${math.ratingToY(5)}px"></span>`
              : ""
          }
          <svg class="lane-path" width="${timelineWidth}" height="${math.LANE_HEIGHT}" aria-hidden="true">
            ${
              pathReleases.length > 1
                ? `<polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>`
                : ""
            }
          </svg>
          ${releases.map((item, index) => renderRelease(show, item, index, releases.length, settings)).join("")}
        </div>
        ${settings.showRatings ? renderRatingAxis() : ""}
        ${ratingsUnavailable ? `<span class="unrated-lane-note">IMDb N/A</span>` : ""}
      </article>
    `;
  }

  function renderRatingAxis() {
    return `<div class="rating-axis" aria-hidden="true">
      ${Array.from({ length: 11 }, (_, index) => 10 - index)
        .map((rating) => `<span class="rating-tick" style="top:${math.ratingToY(rating)}px">${rating}</span>`)
        .join("")}
    </div>`;
  }

  function renderRelease(show, item, index, releaseCount, settings) {
    const isFinal = show.status === "finished" && index === releaseCount - 1;
    const isUnrated = settings.showRatings && !item.hasRating;
    const labelBelow = !isUnrated && index % 2 === 1;
    const ratingCopy = item.hasRating
      ? item.ratingSource === "mock"
        ? `mock rating ${item.imdbRating}`
        : `IMDb rating ${item.imdbRating}`
      : "IMDb rating unavailable";
    return `
      <span
        class="release-marker ${show.status} ${isFinal ? "final" : ""} ${isUnrated ? "unrated" : ""}"
        style="left:${item.x}px;top:${item.y}px"
        title="${escapeHtml(item.label)}: ${ratingCopy}"
        aria-hidden="true"
      ></span>
      <span class="release-label-group ${labelBelow ? "below" : ""}" style="left:${item.x}px;top:${item.y}px">
        <span class="season-label">${escapeHtml(item.label)}</span>
        ${
          settings.showEpisodeCounts && item.episodeCount != null
            ? `<span class="episode-count">${item.episodeCount} eps</span>`
            : ""
        }
      </span>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  global.TVTimeline = global.TVTimeline || {};
  global.TVTimeline.renderTimeline = renderTimeline;
})(window);
