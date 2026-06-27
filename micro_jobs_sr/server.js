const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '@WimJeff8888',
  database: process.env.DB_NAME || 'MicroJobs',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req, callback) {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) req.destroy();
  });

  req.on('end', () => {
    try {
      callback(null, JSON.parse(body || '{}'));
    } catch (error) {
      callback(error);
    }
  });
}

function handleRegister(req, res) {
  parseJsonBody(req, (error, data) => {
    if (error || !data.email || !data.password || !data.name || !data.location) {
      sendJson(res, 400, { error: 'Invalid input' });
      return;
    }

    const values = [data.name, data.location, data.email, data.password];
    db.query(
      'INSERT INTO users (name, location, email, password) VALUES (?, ?, ?, ?)',
      values,
      (dbError, result) => {
        if (dbError) {
          sendJson(res, 400, { error: 'Registration failed', details: dbError.message });
          return;
        }

        sendJson(res, 201, { success: true, userId: result.insertId });
      }
    );
  });
}

function handleLogin(req, res) {
  parseJsonBody(req, (error, data) => {
    if (error || !data.email || !data.password) {
      sendJson(res, 400, { error: 'Invalid input' });
      return;
    }

    db.query('SELECT * FROM users WHERE email = ?', [data.email], (dbError, results) => {
      if (dbError || results.length === 0) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }

      const user = results[0];
      if (user.password !== data.password) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }

      sendJson(res, 200, {
        success: true,
        userId: user.id,
        name: user.name,
        location: user.location,
      });
    });
  });
}

function handleJobs(res) {
  db.query('SELECT * FROM jobs', (error, results) => {
    if (error) {
      sendJson(res, 500, { error: 'Database error', details: error.message });
      return;
    }

    sendJson(res, 200, results);
  });
}

function serveStaticFile(req, res) {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/index.html') reqPath = '/index.html';
  reqPath = reqPath.replace(/^\/public/, '');

  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (error, content) => {
    if (!error) {
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(content);
      return;
    }

    if (ext === '' || ext === '.html') {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fallbackContent);
      });
      return;
    }

    res.writeHead(404);
    res.end('File not found');
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/api/register' && req.method === 'POST') {
    handleRegister(req, res);
    return;
  }

  if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
    handleLogin(req, res);
    return;
  }

  if (parsedUrl.pathname === '/api/jobs' && req.method === 'GET') {
    handleJobs(res);
    return;
  }

  serveStaticFile(req, res);
});

db.getConnection((error, connection) => {
  if (error) console.error('MySQL connection failed:', error.message);
  else {
    console.log('MySQL connected successfully!');
    connection.release();
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
