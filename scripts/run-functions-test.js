require("dotenv").config({ path: ".env.local" });
const http = require('http');
const { parse } = require('url');

const handlers = {
  services: require('../api/_handlers/services.js'),
  appointments: require('../api/_handlers/appointments.js'),
  firms: require('../api/_handlers/firms.js'),
};

function enhanceResponse(res) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };

  res.json = function json(payload) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(payload));
  };

  res.send = function send(payload) {
    if (typeof payload === 'object' && payload !== null) {
      return res.json(payload);
    }
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    res.end(String(payload ?? ''));
  };
}

function getHandler(pathnameSegments) {
  if (pathnameSegments.length < 2 || pathnameSegments[0] !== 'api') {
    return null;
  }
  return handlers[pathnameSegments[1]] ?? null;
}

function attachQuery(req, parsedUrl, pathnameSegments) {
  req.query = Object.fromEntries(parsedUrl.query ? Object.entries(parsedUrl.query) : []);
  if (pathnameSegments.length >= 3) {
    const dynamic = pathnameSegments[2];
    if (dynamic) {
      req.query = { ...req.query, id: dynamic };
    }
  }
}

function readRequestBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve();
        return;
      }
      const raw = Buffer.concat(chunks).toString();
      req.rawBody = raw;
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        try {
          req.body = JSON.parse(raw);
        } catch (error) {
          req.body = raw;
        }
      } else {
        req.body = raw;
      }
      resolve();
    });
  });
}

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);
  const parsedUrl = parse(req.url, true);
  const pathnameSegments = parsedUrl.pathname.split('/').filter(Boolean);
  const handler = getHandler(pathnameSegments);

  if (!handler) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  attachQuery(req, parsedUrl, pathnameSegments);

  try {
    await readRequestBody(req);
    await handler(req, res);
  } catch (error) {
    console.error('Function execution error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
    } else {
      res.end();
    }
  }
});

const port = 3333;
server.listen(port, () => {
  const { spawn } = require('child_process');
  const child = spawn(process.execPath, ['scripts/test-api.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, API_BASE_URL: `http://localhost:${port}` },
  });

  child.on('exit', (code) => {
    server.close(() => {
      process.exit(code ?? 1);
    });
  });
});
