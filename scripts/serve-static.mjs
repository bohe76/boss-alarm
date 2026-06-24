import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(process.cwd());
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const port = portArgIndex >= 0 ? Number(args[portArgIndex + 1]) : 4173;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(body);
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const filePath = path.resolve(root, `.${decodedPath}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return path.join(filePath, 'index.html');
  }
  return filePath;
}

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const filePath = resolveRequestPath(requestUrl.pathname);

  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    send(res, 404, 'Not found');
    return;
  }

  res.writeHead(200, {
    'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
