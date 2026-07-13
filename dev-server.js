const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const port = process.env.PORT || 8000;
const host = '0.0.0.0';
const base = path.resolve(process.cwd());
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const cleanPath = reqPath.replace(/^[/\\]+/, '');
    const filePath = path.resolve(base, cleanPath);
    if (!filePath.startsWith(base + path.sep) && filePath !== base) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(filePath, (err, stats) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      if (stats.isDirectory()) {
        const index = path.join(filePath, 'index.html');
        fs.stat(index, (ie, is) => {
          if (ie) { res.writeHead(404); res.end('Not found'); return; }
          streamFile(index, res);
        });
      } else {
        streamFile(filePath, res);
      }
    });
  } catch (e) {
    res.writeHead(500); res.end('Server error');
  }
});

function streamFile(fp, res) {
  const ext = path.extname(fp).toLowerCase();
  const type = mime[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': `${type}${type.startsWith('text/') || type.includes('javascript') || type.includes('json') ? '; charset=utf-8' : ''}`,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(fp).pipe(res);
}

function getIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry && entry.family === 'IPv4' && !entry.internal) {
        ips.push(entry.address);
      }
    });
  });

  return [...new Set(ips)];
}

server.listen(port, host, () => {
  console.log(`Serving ${base}`);
  console.log(`Local:   http://127.0.0.1:${port}/`);

  const lanIps = getIPv4Addresses();
  lanIps.forEach((ip) => {
    console.log(`Mobile:  http://${ip}:${port}/`);
  });
});
