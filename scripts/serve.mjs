import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const root = process.argv.includes('--dist') ? resolve(project, 'dist') : project;
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
const baseIndex = process.argv.indexOf('--base');
const base = baseIndex >= 0 ? '/' + process.argv[baseIndex + 1].replace(/^\/+|\/+$/g, '') + '/' : '/';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8' };

const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === base.slice(0, -1) && base !== '/') {
      response.writeHead(302, { Location: base }); response.end(); return;
    }
    if (!path.startsWith(base)) throw new Error('Not found');
    const local = path.slice(base.length) || 'index.html';
    if (!/^(index\.html|styles\.css|app\.js|src\/catalog\.mjs|data\/prompts\.json|assets\/.+|licenses\/.+)$/.test(local)) throw new Error('Not found');
    const absolute = resolve(root, local);
    const rel = relative(root, absolute);
    if (rel.startsWith('..') || isAbsolute(rel) || !(await stat(absolute)).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': types[extname(absolute)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(await readFile(absolute));
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Prompt Gallery: http://127.0.0.1:${port}${base}`));
