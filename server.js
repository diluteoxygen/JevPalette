const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;

// Import serverless API handlers
const verifyAccessHandler = require('./api/verify-access');
const sessionHandler = require('./api/session');
const guessHandler = require('./api/guess');
const colorsHandler = require('./api/colors');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

/**
 * Adapt Node.js http req/res to match Vercel Serverless Function helper methods
 */
function adaptServerless(req, res, parsedUrl) {
  req.query = parsedUrl.query;

  res.status = function (code) {
    res.statusCode = code;
    return res;
  };

  res.json = function (data) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
    return res;
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  adaptServerless(req, res, parsedUrl);

  // Parse body for POST requests
  if (req.method === 'POST') {
    const bodyStr = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    try {
      req.body = JSON.parse(bodyStr || '{}');
    } catch {
      req.body = {};
    }
  }

  // API Routes
  if (pathname === '/api/verify-access') {
    return verifyAccessHandler(req, res);
  }
  if (pathname === '/api/session') {
    return sessionHandler(req, res);
  }
  if (pathname === '/api/guess') {
    return guessHandler(req, res);
  }
  if (pathname === '/api/colors') {
    return colorsHandler(req, res);
  }

  // Static file serving from public/
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`TypeSafe JEV Color Guesser (Closed Beta Protected) running at http://localhost:${PORT}`);
});
