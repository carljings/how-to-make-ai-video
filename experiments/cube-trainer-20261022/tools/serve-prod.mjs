// 本机模拟生产：按 deploy/nginx-cube.conf 里的 add_header 原样加响应头（含 CSP），在 /cube/ 下提供 dist/。
// 用来在上线前确认 CSP 不会挡住 Worker、WASM 与字体。只监听 127.0.0.1。
// 用法：node tools/serve-prod.mjs [dist 目录] [端口] [nginx 片段]
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = process.argv[2] || fileURLToPath(new URL("../dist/", import.meta.url));
const PORT = Number(process.argv[3] || 4180);
const SNIPPET = process.argv[4] || fileURLToPath(new URL("../../deploy/nginx-cube.conf", import.meta.url));

// 解析片段：/cube/ 块与嵌套的 /cube/assets/ 块各自的 add_header
const headers = { main: [], assets: [] };
let where = null;
for (const line of readFileSync(SNIPPET, "utf8").split("\n")) {
  if (/location \^~ \/cube\/assets\/ \{/.test(line)) where = "assets";
  else if (/location \^~ \/cube\/ \{/.test(line)) where = "main";
  else if (/^\s*\}\s*$/.test(line)) where = where === "assets" ? "main" : null;
  const m = line.match(/^\s*add_header\s+(\S+)\s+"(.*)"\s+always;\s*$/);
  if (m && where) headers[where].push([m[1], m[2]]);
}
if (!headers.main.length || !headers.assets.length) throw new Error("没能从 nginx 片段解析出 add_header");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".woff": "font/woff",
  ".svg": "image/svg+xml", ".png": "image/png",
};

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const path = decodeURIComponent(url.pathname);
  if (path === "/cube") { res.writeHead(301, { Location: "/cube/" }); res.end(); return; }
  if (!path.startsWith("/cube/") || path.includes("\0")) { res.writeHead(404); res.end("not found"); return; }
  const rel = normalize(path.slice("/cube/".length));
  if (rel.startsWith("..")) { res.writeHead(404); res.end(); return; }
  let file = join(DIST, rel);
  let st;
  try { st = statSync(file); } catch { res.writeHead(404); res.end("not found"); return; }
  if (st.isDirectory()) {
    if (!path.endsWith("/")) { res.writeHead(301, { Location: path + "/" }); res.end(); return; }
    file = join(file, "index.html");
    try { st = statSync(file); } catch { res.writeHead(403); res.end(); return; }
  }
  const set = path.startsWith("/cube/assets/") ? headers.assets : headers.main;
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Content-Length": st.size, ...Object.fromEntries(set) });
  res.end(req.method === "HEAD" ? undefined : readFileSync(file));
}).listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}/cube/  （响应头取自 ${SNIPPET}）`));
