import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = 'localhost';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'portrait-engine.js']);
const assetExtensions = new Set(['.css', '.js', '.json', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg', '.woff2', '.woff', '.ico', '.txt']);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.avif':'image/avif', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.md':'text/plain; charset=utf-8' };
const server = http.createServer((request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let name;
  try { name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end('Bad request'); return; }
  if (/[\x00-\x1f\x7f]/.test(name)) { response.writeHead(400); response.end('Bad request'); return; }
  if (name === '/') name = '/index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  const relative = path.relative(root, file);
  if (!publicFiles.has(relative) && !(relative.startsWith('assets' + path.sep) && assetExtensions.has(path.extname(file).toLowerCase()))) {
    response.writeHead(404); response.end('Not found'); return;
  }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') response.end();
    else {
      const stream = fs.createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    }
  });
});
server.on('error', error => { console.error(`Could not start preview: ${error.message}`); process.exitCode = 1; });
server.listen(port, host, () => {
  console.log(`Max Verstappen website ready at http://localhost:${port}`);
});
