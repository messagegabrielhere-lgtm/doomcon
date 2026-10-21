'use strict';
// Local forward proxy. Point the agent at it (HTTPS_PROXY/HTTP_PROXY=http://127.0.0.1:<port>)
// and every outbound connection is recorded by the recorder, not by the agent:
// destination, bytes sent and received, duration, and whether this host has ever been
// contacted before. HTTPS traffic stays encrypted end to end (no interception); the
// recorder sees where data went and how much, not the contents.

const http = require('http');
const net = require('net');
const { URL } = require('url');

function createProxy({ log, knownHosts = new Set() }) {
  const seen = knownHosts;

  function note(host) {
    const first = !seen.has(host);
    if (first) seen.add(host);
    return first;
  }

  const server = http.createServer((req, res) => {
    // Plain-HTTP forward request: absolute URL in req.url
    let target;
    try { target = new URL(req.url); } catch { res.writeHead(400); return res.end('absolute URL required'); }
    const started = Date.now();
    let sent = 0, received = 0;
    const upstream = http.request({
      host: target.hostname, port: target.port || 80, method: req.method,
      path: target.pathname + target.search, headers: req.headers,
    }, up => {
      res.writeHead(up.statusCode, up.headers);
      up.on('data', c => { received += c.length; });
      up.pipe(res);
      up.on('end', () => log.append('net', {
        scheme: 'http', host: target.hostname, port: Number(target.port || 80), method: req.method,
        path: target.pathname, status: up.statusCode, bytesOut: sent, bytesIn: received,
        ms: Date.now() - started, firstContact: note(target.hostname),
      }));
    });
    upstream.on('error', err => {
      log.append('net', { scheme: 'http', host: target.hostname, method: req.method, error: err.code || err.message, firstContact: note(target.hostname) });
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.on('data', c => { sent += c.length; });
    req.pipe(upstream);
  });

  server.on('connect', (req, clientSocket, head) => {
    const [host, portStr] = req.url.split(':');
    const port = Number(portStr) || 443;
    const started = Date.now();
    let sent = head.length, received = 0, finished = false;
    const upstream = net.connect(port, host, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      clientSocket.pipe(upstream);
      upstream.pipe(clientSocket);
    });
    clientSocket.on('data', c => { sent += c.length; });
    upstream.on('data', c => { received += c.length; });
    const done = err => {
      if (finished) return; finished = true;
      log.append('net', {
        scheme: 'https', host, port, bytesOut: sent, bytesIn: received, ms: Date.now() - started,
        firstContact: note(host), ...(err ? { error: err.code || err.message } : {}),
      });
      clientSocket.destroy(); upstream.destroy();
    };
    upstream.on('error', done); clientSocket.on('error', done);
    upstream.on('close', () => done()); clientSocket.on('close', () => done());
  });

  return server;
}

module.exports = { createProxy };
