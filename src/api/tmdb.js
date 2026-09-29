(function createTmdbClient(global) {
  async function request(path, options = {}) {
    const response = await fetch(path, {
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || "TMDB request failed.");
      error.code = body.code || "TMDB_REQUEST_FAILED";
      error.status = response.status;
      throw error;
    }
    return body;
  }

  async function search(query, options = {}) {
    const payload = await request(`/api/tmdb/search?query=${encodeURIComponent(query)}`, options);
    return global.TVTimeline.normalizeTmdb.search(payload);
  }

  async function getShow(tmdbId, options = {}) {
    const payload = await request(`/api/tmdb/tv/${encodeURIComponent(tmdbId)}`, options);
    return global.TVTimeline.normalizeTmdb.show(payload);
  }

  global.TVTimeline = global.TVTimeline || {};
  global.TVTimeline.tmdb = { search, getShow };
})(window);
