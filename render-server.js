import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 10000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8"
};

const API = new Map([
  ["/api/health", "./api/health.js"],
  ["/api/kai/search", "./api/kai/search.js"],
  ["/api/kai/chat", "./api/kai/chat.js"],
  ["/api/tools/math", "./api/tools/math.js"]
]);
const handlers = new Map();

async function bodyOf(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  const type = String(req.headers["content-type"] || "");
  if (type.includes("application/json")) return JSON.parse(raw);
  if (type.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(raw));
  return { raw };
}

function responseAdapter(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (value) => {
    if (res.writableEnded) return res;
    if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(value));
    return res;
  };
  return res;
}

async function handleApi(req, res, pathname, url) {
  const modulePath = API.get(pathname);
  if (!modulePath) return false;
  try {
    let handler = handlers.get(modulePath);
    if (!handler) {
      const moduleUrl = pathToFileURL(path.join(ROOT, modulePath.replace(/^\.\//, ""))).href;
      handler = (await import(moduleUrl)).default;
      handlers.set(modulePath, handler);
    }
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = ["POST", "PUT", "PATCH"].includes(req.method) ? await bodyOf(req) : {};
    await handler(req, responseAdapter(res));
  } catch (error) {
    if (!res.writableEnded) {
      res.statusCode = error?.message === "Request body too large." ? 413 : 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: error?.message || "Internal server error" }));
    }
  }
  return true;
}

async function handleStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method not allowed");
    return;
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { res.writeHead(400); res.end("Bad request"); return; }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relative);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  try {
    const data = await readFile(filePath);
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600"
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (await handleApi(req, res, url.pathname.replace(/\/$/, "") || "/", url)) return;
  await handleStatic(req, res, url.pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("HAxBRO KAI prototype listening on port " + PORT);
});
