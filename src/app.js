(function startApp(global) {
  const api = global.TVTimeline;
  const app = document.querySelector("#app");
  const initialShows = api.initialShowIds
    .map((id) => api.catalog.find((show) => show.id === id))
    .filter(Boolean);

  const state = {
    selectedShows: initialShows,
    showRatings: true,
    showEpisodeCounts: true,
    pxPerYear: 120,
    scrollX: 0,
    pinLatest: true,
    searchOpen: false,
    searchQuery: "",
    searchResults: fixtureSearchResults(""),
    searchLoading: false,
    searchError: null,
    searchSource: "fixtures",
    addingShowKey: null,
  };

  let dragState = null;
  let verticalSyncLock = false;
  let searchTimer = null;
  let searchRequestId = 0;

  function selectedShows() {
    return state.selectedShows;
  }

  function getLayout() {
    const domain = api.math.getDomain(selectedShows());
    return {
      domain,
      years: api.math.getYears(domain),
      pxPerYear: state.pxPerYear,
      timelineWidth: api.math.getTimelineWidth(domain, state.pxPerYear),
    };
  }

  function render(options = {}) {
    const preserveVerticalScroll = options.preserveVerticalScroll ?? true;
    const previousTop = preserveVerticalScroll
      ? document.querySelector('[data-role="timeline-scroll"]')?.scrollTop || 0
      : 0;
    const layout = getLayout();

    app.innerHTML = `
      <div class="app-shell">
        <header class="title-bar">
          <h1>TV show lifespan tracker</h1>
          <p>Compare release timing and rating movement across a shared calendar.</p>
        </header>
        <div class="workspace">
          ${api.renderSidebar(selectedShows())}
          ${api.renderTimeline(selectedShows(), state, layout)}
        </div>
        ${api.renderSearchDrawer(state.searchResults, selectedShows(), {
          query: state.searchQuery,
          isOpen: state.searchOpen,
          isLoading: state.searchLoading,
          error: state.searchError,
          source: state.searchSource,
          addingKey: state.addingShowKey,
        })}
      </div>
    `;

    bindEvents();
    if (state.pinLatest) {
      state.scrollX = Math.max(0, layout.timelineWidth - getViewportWidth());
      state.pinLatest = false;
    }
    clampScroll(layout);
    applyHorizontalPosition(layout);
    const sidebarList = document.querySelector('[data-role="sidebar-list"]');
    const timelineScroll = document.querySelector('[data-role="timeline-scroll"]');
    if (sidebarList && timelineScroll) {
      sidebarList.scrollTop = previousTop;
      timelineScroll.scrollTop = previousTop;
    }
    if (state.searchOpen && options.focusSearch) {
      requestAnimationFrame(() => document.querySelector('[data-role="search-input"]')?.focus());
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", handleAction);
    });

    const searchInput = document.querySelector('[data-role="search-input"]');
    searchInput?.addEventListener("input", handleSearchInput);

    bindPanSurfaces();
    bindScrollbar();
    bindVerticalSync();
  }

  function handleAction(event) {
    const action = event.currentTarget.dataset.action;
    const showId = event.currentTarget.dataset.showId;
    const resultKey = event.currentTarget.dataset.resultKey;

    if (action === "open-search") {
      searchRequestId += 1;
      clearTimeout(searchTimer);
      state.searchOpen = true;
      state.searchQuery = "";
      state.searchResults = fixtureSearchResults("");
      state.searchLoading = false;
      state.searchError = null;
      state.searchSource = "fixtures";
      render({ focusSearch: true });
    }
    if (action === "close-search") {
      searchRequestId += 1;
      clearTimeout(searchTimer);
      state.searchOpen = false;
      state.searchLoading = false;
      render();
    }
    if (action === "add-show" && resultKey) addSearchResult(resultKey);
    if (action === "remove-show" && showId) {
      state.selectedShows = state.selectedShows.filter((show) => show.id !== showId);
      state.pinLatest = true;
      render();
    }
    if (action === "toggle-ratings") {
      state.showRatings = !state.showRatings;
      render();
    }
    if (action === "toggle-episodes") {
      state.showEpisodeCounts = !state.showEpisodeCounts;
      render();
    }
    if (action === "zoom-in") zoomBy(20);
    if (action === "zoom-out") zoomBy(-20);
  }

  function handleSearchInput(event) {
    state.searchQuery = event.target.value;
    state.searchError = null;
    state.addingShowKey = null;
    searchRequestId += 1;
    const requestId = searchRequestId;
    clearTimeout(searchTimer);

    if (state.searchQuery.trim().length < 2) {
      state.searchResults = fixtureSearchResults(state.searchQuery);
      state.searchLoading = false;
      state.searchSource = "fixtures";
      renderWithSearchFocus();
      return;
    }

    state.searchLoading = true;
    renderWithSearchFocus();
    searchTimer = setTimeout(async () => {
      try {
        const results = await api.tmdb.search(state.searchQuery.trim());
        if (requestId !== searchRequestId) return;
        state.searchResults = results;
        state.searchSource = "tmdb";
        state.searchError = null;
      } catch (error) {
        if (requestId !== searchRequestId) return;
        state.searchResults = fixtureSearchResults(state.searchQuery);
        state.searchSource = "fixtures";
        state.searchError =
          error.code === "MISSING_TMDB_CREDENTIAL"
            ? "TMDB is not configured yet. Add your credential to .env.local and restart npm run dev. Showing matching fixtures for now."
            : "TMDB search is unavailable. Showing matching fixtures for now.";
      } finally {
        if (requestId !== searchRequestId) return;
        state.searchLoading = false;
        renderWithSearchFocus();
      }
    }, 300);
  }

  async function addSearchResult(resultKey) {
    const result = state.searchResults.find((item) => item.key === resultKey);
    if (!result || state.addingShowKey) return;

    if (result.source === "fixture") {
      const fixture = api.catalog.find((show) => show.id === result.id);
      if (fixture && !state.selectedShows.some((show) => show.id === fixture.id)) {
        state.selectedShows.push(fixture);
      }
      finishAddingShow();
      return;
    }

    state.addingShowKey = resultKey;
    state.searchError = null;
    render({ focusSearch: true });
    try {
      const show = await api.tmdb.getShow(result.tmdbId);
      if (!show.releases.length) {
        throw new Error("TMDB returned no dated seasons for this show.");
      }
      if (!state.selectedShows.some((selected) => selected.tmdbId === show.tmdbId)) {
        state.selectedShows.push(show);
      }
      finishAddingShow();
    } catch (error) {
      state.addingShowKey = null;
      state.searchError = error.message || "The show could not be added.";
      render({ focusSearch: true });
    }
  }

  function finishAddingShow() {
    state.addingShowKey = null;
    state.searchOpen = false;
    state.searchQuery = "";
    state.searchError = null;
    state.pinLatest = true;
    render({ preserveVerticalScroll: false });
  }

  function renderWithSearchFocus() {
    render({ focusSearch: true });
    const nextInput = document.querySelector('[data-role="search-input"]');
    nextInput?.setSelectionRange(state.searchQuery.length, state.searchQuery.length);
  }

  function fixtureSearchResults(query) {
    const normalized = query.trim().toLowerCase();
    return api.catalog
      .filter((show) => show.title.toLowerCase().includes(normalized))
      .map((show) => ({
        key: `fixture:${show.id}`,
        source: "fixture",
        id: show.id,
        tmdbId: show.tmdbId,
        title: show.title,
        initials: show.initials,
        firstYear: show.firstYear,
        lastYear: show.lastYear,
        posterUrl: show.posterUrl,
      }));
  }

  function handleEscape(event) {
    if (event.key === "Escape" && state.searchOpen) {
      state.searchOpen = false;
      render();
    }
  }

  function zoomBy(delta) {
    const oldWidth = getLayout().timelineWidth;
    const viewportWidth = getViewportWidth();
    const centerRatio = oldWidth > 0 ? (state.scrollX + viewportWidth / 2) / oldWidth : 0;
    state.pxPerYear = api.math.clamp(state.pxPerYear + delta, 60, 200);
    const newWidth = getLayout().timelineWidth;
    state.scrollX = centerRatio * newWidth - viewportWidth / 2;
    render();
  }

  function bindPanSurfaces() {
    document.querySelectorAll('[data-role="pan-surface"], [data-role="timeline-scroll"]').forEach((surface) => {
      surface.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        dragState = { startX: event.clientX, startScrollX: state.scrollX, surface };
        surface.classList.add("is-dragging");
        surface.setPointerCapture(event.pointerId);
      });
      surface.addEventListener("pointermove", (event) => {
        if (!dragState || dragState.surface !== surface) return;
        state.scrollX = dragState.startScrollX + dragState.startX - event.clientX;
        applyHorizontalPosition(getLayout());
      });
      surface.addEventListener("pointerup", finishDrag);
      surface.addEventListener("pointercancel", finishDrag);
      surface.addEventListener(
        "wheel",
        (event) => {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
            event.preventDefault();
            state.scrollX += event.deltaX || event.deltaY;
            applyHorizontalPosition(getLayout());
          }
        },
        { passive: false },
      );
    });
  }

  function finishDrag(event) {
    if (!dragState) return;
    dragState.surface.classList.remove("is-dragging");
    if (dragState.surface.hasPointerCapture?.(event.pointerId)) {
      dragState.surface.releasePointerCapture(event.pointerId);
    }
    dragState = null;
  }

  function bindScrollbar() {
    const track = document.querySelector('[data-role="scrollbar-track"]');
    const thumb = document.querySelector('[data-role="scrollbar-thumb"]');
    if (!track || !thumb) return;

    track.addEventListener("pointerdown", (event) => {
      if (event.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const layout = getLayout();
      const maxScroll = Math.max(0, layout.timelineWidth - getViewportWidth());
      state.scrollX = ratio * maxScroll;
      applyHorizontalPosition(layout);
    });

    thumb.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      const layout = getLayout();
      const maxScroll = Math.max(0, layout.timelineWidth - getViewportWidth());
      const trackWidth = track.clientWidth;
      const thumbWidth = thumb.offsetWidth;
      const startLeft = Number.parseFloat(thumb.style.left) || 0;
      const startX = event.clientX;
      thumb.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const left = api.math.clamp(startLeft + moveEvent.clientX - startX, 0, trackWidth - thumbWidth);
        state.scrollX = maxScroll ? (left / (trackWidth - thumbWidth)) * maxScroll : 0;
        applyHorizontalPosition(layout);
      };
      const up = () => {
        thumb.removeEventListener("pointermove", move);
        thumb.removeEventListener("pointerup", up);
        thumb.removeEventListener("pointercancel", up);
      };
      thumb.addEventListener("pointermove", move);
      thumb.addEventListener("pointerup", up);
      thumb.addEventListener("pointercancel", up);
    });
  }

  function bindVerticalSync() {
    const sidebarList = document.querySelector('[data-role="sidebar-list"]');
    const timelineScroll = document.querySelector('[data-role="timeline-scroll"]');
    if (!sidebarList || !timelineScroll) return;

    const sync = (source, target) => {
      if (verticalSyncLock) return;
      verticalSyncLock = true;
      try {
        target.scrollTop = source.scrollTop;
      } finally {
        verticalSyncLock = false;
      }
    };

    sidebarList.addEventListener("scroll", () => sync(sidebarList, timelineScroll));
    timelineScroll.addEventListener("scroll", () => sync(timelineScroll, sidebarList));
  }

  function getViewportWidth() {
    return document.querySelector(".timeline-panel")?.clientWidth || 1;
  }

  function clampScroll(layout) {
    const maxScroll = Math.max(0, layout.timelineWidth - getViewportWidth());
    state.scrollX = api.math.clamp(state.scrollX, 0, maxScroll);
  }

  function applyHorizontalPosition(layout) {
    clampScroll(layout);
    document.querySelectorAll('[data-role="horizontal-content"]').forEach((content) => {
      content.style.transform = `translateX(${-state.scrollX}px)`;
    });

    const track = document.querySelector('[data-role="scrollbar-track"]');
    const thumb = document.querySelector('[data-role="scrollbar-thumb"]');
    if (!track || !thumb) return;
    const viewportWidth = getViewportWidth();
    const trackWidth = track.clientWidth;
    const visibleRatio = Math.min(1, viewportWidth / layout.timelineWidth);
    const thumbWidth = Math.max(36, trackWidth * visibleRatio);
    const maxScroll = Math.max(0, layout.timelineWidth - viewportWidth);
    const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${maxScroll ? (state.scrollX / maxScroll) * maxThumbLeft : 0}px`;
    thumb.hidden = visibleRatio >= 1;
  }

  function handleResize() {
    applyHorizontalPosition(getLayout());
  }

  document.addEventListener("keydown", handleEscape);
  global.addEventListener("resize", handleResize);
  render({ preserveVerticalScroll: false });
})(window);
