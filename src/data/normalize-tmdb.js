(function createTmdbNormalizer(global) {
  const ONGOING_STATUSES = new Set(["Returning Series", "In Production", "Planned", "Pilot"]);

  function yearFromDate(date) {
    const year = Number(String(date || "").slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : undefined;
  }

  function posterUrl(path) {
    return path ? `https://image.tmdb.org/t/p/w185${path}` : undefined;
  }

  function initials(title) {
    return String(title || "TV")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  function normalizeSearch(payload) {
    return (payload.results || []).map((show) => ({
      key: `tmdb:${show.id}`,
      source: "tmdb",
      tmdbId: show.id,
      title: show.name || show.original_name || "Untitled TV show",
      initials: initials(show.name || show.original_name),
      firstYear: yearFromDate(show.first_air_date),
      posterUrl: posterUrl(show.poster_path),
    }));
  }

  function normalizeShow(show) {
    const releases = (show.seasons || [])
      .filter((season) => season.season_number > 0 && yearFromDate(season.air_date))
      .map((season) => ({
        id: `tmdb-${show.id}-s${season.season_number}`,
        seasonNumber: season.season_number,
        label: `S${season.season_number}`,
        airDate: season.air_date,
        year: yearFromDate(season.air_date),
        episodeCount: season.episode_count || undefined,
        imdbRating: undefined,
        ratingSource: null,
      }))
      .sort((a, b) => a.airDate.localeCompare(b.airDate));

    const firstYear = yearFromDate(show.first_air_date) || releases[0]?.year;
    const rawLastYear = yearFromDate(show.last_air_date) || releases.at(-1)?.year;
    const status = ONGOING_STATUSES.has(show.status) ? "ongoing" : "finished";

    return {
      id: `tmdb:${show.id}`,
      tmdbId: show.id,
      title: show.name || show.original_name || "Untitled TV show",
      initials: initials(show.name || show.original_name),
      posterPath: show.poster_path || undefined,
      posterUrl: posterUrl(show.poster_path),
      status,
      tmdbStatus: show.status,
      firstYear,
      lastYear: status === "finished" ? rawLastYear : undefined,
      releases,
      dataSource: "tmdb",
    };
  }

  global.TVTimeline = global.TVTimeline || {};
  global.TVTimeline.normalizeTmdb = { search: normalizeSearch, show: normalizeShow };
})(window);
