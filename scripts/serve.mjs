// Tiny static server (no dependencies). npm run serve -> http://localhost:5173/web/
// Serves the repo the way GitHub Pages does, so web/ can use the shared design system in design/,
// but only those two folders: never .env, cases/ or anything else in the repo.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(fileURLToPath(new URL("../", import.meta.url)));
const allowed = ["web", "design"].map((d) => join(root, d) + sep);
const port = Number(process.env.PORT || 5173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".mp3": "audio/mpeg", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/" || path === "/index.html") { res.writeHead(302, { location: "/web/" }).end(); return; }
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(root, path));
  if (!allowed.some((dir) => file.startsWith(dir))) { res.writeHead(404).end("Not found"); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Plan in Motion: http://localhost:${port}/web/`));
