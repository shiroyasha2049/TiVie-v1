(function createSidebar(global) {
  function renderSidebar(shows) {
    const countCopy = shows.length
      ? `Comparing ${shows.length} ${shows.length === 1 ? "show" : "shows"}`
      : "Add a show to begin";

    return `
      <aside class="sidebar" aria-label="Selected TV shows">
        <header class="sidebar-header">
          <div>
            <h2>TV Shows</h2>
            <p>${countCopy}</p>
          </div>
          <button class="icon-button" type="button" data-action="open-search" aria-label="Add a TV show">+</button>
        </header>
        <div class="sidebar-list" data-role="sidebar-list">
          ${shows.map(renderShowRow).join("")}
        </div>
      </aside>
    `;
  }

  function renderShowRow(show) {
    const statusLabel = show.status === "ongoing" ? "Ongoing" : "Finished";
    return `
      <article class="sidebar-row">
        <button
          class="remove-button"
          type="button"
          data-action="remove-show"
          data-show-id="${escapeHtml(show.id)}"
          aria-label="Remove ${escapeHtml(show.title)}"
        >−</button>
        ${renderPoster(show)}
        <div class="show-meta">
          <h3 class="show-title">${escapeHtml(show.title)}</h3>
          <p class="show-years">${global.TVTimeline.math.formatRunYears(show)}</p>
          <p class="show-status">
            <span class="status-dot ${show.status}" aria-hidden="true"></span>
            ${statusLabel}
          </p>
        </div>
      </article>
    `;
  }

  function renderPoster(show) {
    return show.posterUrl
      ? `<img class="poster-image" src="${escapeHtml(show.posterUrl)}" alt="${escapeHtml(show.title)} poster" width="44" height="64" />`
      : `<div class="poster-placeholder" aria-label="Poster placeholder for ${escapeHtml(show.title)}">${escapeHtml(show.initials)}</div>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  global.TVTimeline = global.TVTimeline || {};
  global.TVTimeline.renderSidebar = renderSidebar;
})(window);
