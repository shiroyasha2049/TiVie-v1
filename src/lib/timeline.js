(function createTimelineMath(global) {
  const LANE_HEIGHT = 150;
  const LANE_TOP_PAD = 24;
  const LANE_BOTTOM_PAD = 32;
  const CONTENT_SIDE_PAD = 24;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getDomain(shows) {
    const years = shows.flatMap((show) => [
      show.firstYear,
      show.lastYear,
      ...show.releases.map((item) => item.year),
    ]).filter(Number.isFinite);
    const currentYear = new Date().getFullYear();
    if (!years.length) return { min: currentYear - 4, max: currentYear + 4 };
    return { min: Math.min(...years), max: Math.max(...years) };
  }

  function getYears(domain) {
    return Array.from({ length: domain.max - domain.min + 1 }, (_, index) => domain.min + index);
  }

  function getTimelineWidth(domain, pxPerYear) {
    return Math.max(1, domain.max - domain.min) * pxPerYear + CONTENT_SIDE_PAD * 2;
  }

  function yearToX(year, domain, pxPerYear) {
    return CONTENT_SIDE_PAD + (year - domain.min) * pxPerYear;
  }

  function ratingToY(rating) {
    const usable = LANE_HEIGHT - LANE_TOP_PAD - LANE_BOTTOM_PAD;
    return LANE_TOP_PAD + ((10 - clamp(rating ?? 5, 0, 10)) / 10) * usable;
  }

  function flatToY() {
    return LANE_HEIGHT / 2;
  }

  function addSameYearOffsets(releases, domain, pxPerYear) {
    const byYear = releases.reduce((groups, item) => {
      groups[item.year] = groups[item.year] || [];
      groups[item.year].push(item);
      return groups;
    }, {});

    return Object.values(byYear)
      .flatMap((group) => {
        const sorted = [...group].sort((a, b) => (a.airDate || "").localeCompare(b.airDate || ""));
        const maxSpread = pxPerYear * 0.46;
        const step = sorted.length > 1 ? Math.min(28, maxSpread / (sorted.length - 1)) : 0;
        const start = -((sorted.length - 1) * step) / 2;
        return sorted.map((item, index) => ({
          ...item,
          x: yearToX(item.year, domain, pxPerYear) + start + index * step,
        }));
      })
      .sort((a, b) => (a.airDate || "").localeCompare(b.airDate || ""));
  }

  function formatRunYears(show) {
    return show.status === "ongoing"
      ? `${show.firstYear}–`
      : `${show.firstYear}–${show.lastYear || show.releases.at(-1)?.year || show.firstYear}`;
  }

  global.TVTimeline = global.TVTimeline || {};
  global.TVTimeline.math = {
    LANE_HEIGHT,
    clamp,
    getDomain,
    getYears,
    getTimelineWidth,
    yearToX,
    ratingToY,
    flatToY,
    addSameYearOffsets,
    formatRunYears,
  };
})(window);
