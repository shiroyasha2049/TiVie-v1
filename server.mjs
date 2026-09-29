import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

await loadLocalEnvironment(join(ROOT, ".env.local"));
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/tmdb/status") {
      return sendJson(response, 200, {
        configured: Boolean(process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY),
      });
    }

    if (url.pathname === "/api/tmdb/search") {
      const query = url.searchParams.get("query")?.trim();
      if (!query) return sendJson(response, 400, { error: "A search query is required." });
      const data = await tmdbRequest("/search/tv", {
        query,
        include_adult: "false",
        language: "en-US",
        page: "1",
      });
      return sendJson(response, 200, data, { "Cache-Control": "private, max-age=60" });
    }

    const tvMatch = url.pathname.match(/^\/api\/tmdb\/tv\/(\d+)$/);
    if (tvMatch) {
      const data = await tmdbRequest(`/tv/${tvMatch[1]}`, { language: "en-US" });
      return sendJson(response, 200, data, { "Cache-Control": "private, max-age=300" });
    }

    const seasonMatch = url.pathname.match(/^\/api\/tmdb\/tv\/(\d+)\/season\/(\d+)$/);
    if (seasonMatch) {
      const data = await tmdbRequest(`/tv/${seasonMatch[1]}/season/${seasonMatch[2]}`, {
        language: "en-US",
      });
      return sendJson(response, 200, data, { "Cache-Control": "private, max-age=300" });
    }

    return serveStaticFile(url.pathname, request, response);
  } catch (error) {
    console.error(
      `[server] ${error.code || error.name || "ERROR"}: ${error.message}`,
      error.cause?.code ? `(cause: ${error.cause.code})` : "",
    );
    const status = error.statusCode || 500;
    const message = status >= 500 ? "The local server could not complete that request." : error.message;
    return sendJson(response, status, { error: message, code: error.code || "SERVER_ERROR" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Tivie is running at http://127.0.0.1:${PORT}`);
  if (!process.env.TMDB_READ_ACCESS_TOKEN && !process.env.TMDB_API_KEY) {
    console.log("TMDB is not configured yet; fixture search will remain available.");
  }
});

async function tmdbRequest(pathname, parameters = {}) {
  const accessToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!accessToken && !apiKey) {
    const error = new Error("Add a TMDB credential to .env.local, then restart the server.");
    error.statusCode = 503;
    error.code = "MISSING_TMDB_CREDENTIAL";
    throw error;
  }

  const url = new URL(`${TMDB_BASE_URL}${pathname}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);

  const headers = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const tmdbResponse = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });
  const body = await tmdbResponse.json().catch(() => ({}));

  if (!tmdbResponse.ok) {
    const error = new Error(body.status_message || "TMDB rejected the request.");
    error.statusCode = tmdbResponse.status;
    error.code = "TMDB_REQUEST_FAILED";
    throw error;
  }

  return body;
}

async function serveStaticFile(pathname, request, response) {
  const decodedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const target = resolve(ROOT, `.${decodedPath}`);
  if (target !== ROOT && !target.startsWith(`${ROOT}${sep}`)) {
    return sendJson(response, 403, { error: "That path is not available." });
  }

  const fileStats = await stat(target).catch(() => null);
  if (!fileStats?.isFile()) return sendJson(response, 404, { error: "Not found." });

  const content = await readFile(target);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(target).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "Content-Length": content.length,
  });
  if (request.method === "HEAD") return response.end();
  response.end(content);
}

function sendJson(response, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  response.end(payload);
}

async function loadLocalEnvironment(filePath) {
  const contents = await readFile(filePath, "utf8").catch(() => "");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
