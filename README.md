# Tivie — TV Show Lifespan Tracker

Fixture-driven first visual milestone for the TV timeline described in
`tv-timeline-prd-v2.md` and `tv-timeline-drd-v2.md`.

## Run the app

Node.js is required for live TMDB data. The server has no third-party package
dependencies, so no install step is necessary:

```powershell
npm.cmd run dev
```

Then open `http://127.0.0.1:4173`. Opening `index.html` directly still works in
offline fixture mode.

## Current behavior

- Three initial fixture shows, including Arcane split into release parts.
- Dynamic year domain based on plotted releases.
- Shared, absolute IMDb-style 0–10 graph mode using clearly mocked values.
- Independent rating and episode-count toggles.
- Add/remove interactions with a fixture-backed search drawer.
- Canvas drag, trackpad/wheel pan, custom scrollbar, and year-density zoom.
- Fixed sidebar, search trigger, drawer, legend, and controls.

## TMDB configuration

1. Copy `.env.example` to `.env.local`.
2. Add either your TMDB API Read Access Token (preferred) or v3 API key.
3. Restart `npm.cmd run dev` after changing the credential.

The browser calls only the local `/api/tmdb/*` routes. `server.mjs` attaches the
credential server-side, so it never enters the frontend source or request URL
when the read-access token is used. TMDB responses are normalized into the same
`TimelineShow` shape as the fixtures before reaching the renderer.

Search automatically falls back to matching fixtures when the server or TMDB
credential is unavailable.

IMDb values in the fixtures are labeled as mock data in code and in the UI.
They must not be treated as verified production IMDb data.
