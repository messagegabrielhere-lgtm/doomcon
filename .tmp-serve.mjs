import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = '/app/public';
const TYPES = { '.html':'text/html; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.xml':'application/xml', '.txt':'text/plain' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(f));
}).listen(8137, () => console.log('serving 8137'));
