(function createSearchDrawer(global) {
  function renderSearchDrawer(results, selectedShows, searchState) {
    const { query, isOpen, isLoading, error, source, addingKey } = searchState;
    const availableResults = results.filter((result) => !isSelected(result, selectedShows));
    return `
      <div class="drawer-backdrop ${isOpen ? "open" : ""}" data-action="close-search" aria-hidden="true"></div>
      <aside class="search-drawer ${isOpen ? "open" : ""}" aria-hidden="${!isOpen}" aria-label="Search TV shows">
        <header class="drawer-header">
          <h2>Add a TV show</h2>
          <button class="drawer-close" type="button" data-action="close-search" aria-label="Close search">×</button>
        </header>
        <div class="search-field-wrap">
          <input
            type="search"
            data-role="search-input"
            value="${escapeHtml(query)}"
            placeholder="Search TV shows"
            autocomplete="off"
            aria-label="Search TV shows"
          />
        </div>
        <p class="drawer-note">
          ${source === "tmdb" ? "Live catalog" : "Offline catalog"}
          <span class="mock-badge">${source === "tmdb" ? "TMDB" : "fixtures"}</span>
        </p>
        ${error ? `<p class="search-error" role="status">${escapeHtml(error)}</p>` : ""}
        <div class="search-results">
          ${
            isLoading
              ? `<p class="no-results">Searching TMDB…</p>`
              : availableResults.length
                ? availableResults.map((result) => renderResult(result, addingKey)).join("")
                : `<p class="no-results">No unselected shows match that search.</p>`
          }
        </div>
      </aside>
    `;
  }

  function renderResult(show, addingKey) {
    const isAdding = addingKey === show.key;
    const years = show.firstYear ? `${show.firstYear}${show.lastYear ? `–${show.lastYear}` : "–"}` : "Release year unavailable";
    return `
      <article class="search-result">
        ${
          show.posterUrl
            ? `<img class="poster-image search-poster" src="${escapeHtml(show.posterUrl)}" alt="" width="38" height="54" />`
            : `<div class="poster-placeholder" aria-hidden="true">${escapeHtml(show.initials || "TV")}</div>`
        }
        <div>
          <h3>${escapeHtml(show.title)}</h3>
          <p>${years}</p>
        </div>
        <button
          class="result-add"
          type="button"
          data-action="add-show"
          data-result-key="${escapeHtml(show.key)}"
          aria-label="Add ${escapeHtml(show.title)}"
          ${isAdding ? "disabled" : ""}
        >${isAdding ? "…" : "+"}</button>
      </article>
    `;
  }

  function isSelected(result, selectedShows) {
    return selectedShows.some((show) =>
      result.source === "tmdb" ? show.tmdbId === result.tmdbId : show.id === result.id,
    );
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  global.TVTimeline = global.TVTimeline || {};
  global.TVTimeline.renderSearchDrawer = renderSearchDrawer;
})(window);
