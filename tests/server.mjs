import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = {
  '/styles.css': [new URL('../styles.css', import.meta.url), 'text/css; charset=utf-8'],
  '/': [new URL('./harness.html', import.meta.url), 'text/html; charset=utf-8'],
  '/harness.js': [new URL('./harness.js', import.meta.url), 'text/javascript; charset=utf-8'],
  '/main.js': [new URL('../main.js', import.meta.url), 'text/javascript; charset=utf-8'],
};
createServer(async (request, response) => {
  const target = files[new URL(request.url, 'http://127.0.0.1').pathname];
  if (!target) { response.writeHead(404); response.end(); return; }
  try {
    response.writeHead(200, { 'Content-Type': target[1], 'Cache-Control': 'no-store' });
    response.end(await readFile(target[0]));
  } catch { response.writeHead(500); response.end(); }
}).listen(4179, '127.0.0.1');
