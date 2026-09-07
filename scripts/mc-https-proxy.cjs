const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PROXY_PORT = parseInt(process.env.MC_HTTPS_PORT || '3001', 10);
const UPSTREAM_PORT = parseInt(process.env.PORT || '3000', 10);
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789', 10);

const CERT_FILE = process.env.MC_CERT_FILE || path.join(process.cwd(), 'certs', 'mc.crt');
const KEY_FILE = process.env.MC_KEY_FILE || path.join(process.cwd(), 'certs', 'mc.key');

let proxyServer;

function createServer() {
  const httpsOptions = {
    key: fs.readFileSync(KEY_FILE),
    cert: fs.readFileSync(CERT_FILE),
  };

  proxyServer = https.createServer(httpsOptions);

  // Handle WebSocket upgrade
  proxyServer.on('upgrade', (req, socket, head) => {
    console.log(`[proxy] Upgrade: ${req.url}`);
    
    const targetPath = req.url || '/';
    
    const targetPort = (targetPath.startsWith('/gateway-ws') || targetPath.startsWith('/__openclaw__')) ? GATEWAY_PORT : UPSTREAM_PORT;
    const targetHost = 'localhost';
    
    console.log(`[proxy] -> ${targetHost}:${targetPort}`);
    
    // Create a TCP connection to the target
    const targetSocket = net.connect(targetPort, targetHost, () => {
      console.log(`[proxy] Connected to ${targetHost}:${targetPort}`);
      
      // Forward the upgrade request
      const upgradeReq = `GET ${targetPath} HTTP/1.1\r\n` +
        `Host: ${targetHost}:${targetPort}\r\n`;
      
      // Forward all headers
      for (const [key, value] of Object.entries(req.headers)) {
        if (key !== 'host') {
          upgradeReq += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`;
        }
      }
      upgradeReq += '\r\n';
      
      targetSocket.write(upgradeReq);
      
      // If there's body data from the upgrade, forward it
      if (head && head.length > 0) {
        targetSocket.write(head);
      }
      
      // Pipe sockets both ways
      socket.pipe(targetSocket);
      targetSocket.pipe(socket);
    });

    targetSocket.on('error', (err) => {
      console.error(`[proxy] Target error: ${err.message}`);
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.error(`[proxy] Client error: ${err.message}`);
      targetSocket.destroy();
    });

    targetSocket.on('end', () => {
      socket.end();
    });

    socket.on('end', () => {
      targetSocket.end();
    });
  });

  // Regular HTTPS request handler
  proxyServer.on('request', (req, res) => {
    req.socket.setKeepAlive(true);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    const targetPath = req.url || '/';

    const upstreamHeaders = { ...req.headers, connection: 'close' };
    upstreamHeaders['x-forwarded-proto'] = 'https';
    upstreamHeaders['x-forwarded-host'] = req.headers.host || '';

    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: UPSTREAM_PORT,
        path: targetPath,
        method: req.method,
        headers: upstreamHeaders,
      },
      (proxyRes) => {
        const responseHeaders = { ...proxyRes.headers };
        if (responseHeaders['set-cookie']) {
          responseHeaders['set-cookie'] = responseHeaders['set-cookie'].map((c) => c.replace('HttpOnly; Secure', 'HttpOnly'));
        }
        
        // Add CSP to allow ws://127.0.0.1 for mixed content
        responseHeaders['Content-Security-Policy'] = "default-src * 'unsafe-inline' 'unsafe-eval'; connect-src * ws: wss:; upgrade-insecure-requests;";
        
        res.writeHead(proxyRes.statusCode, { ...responseHeaders, 'Access-Control-Allow-Origin': '*' });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream error', detail: err.message }));
      }
    });

    req.pipe(proxyReq);
  });

  proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`[proxy] HTTPS proxy listening on :${PROXY_PORT} -> http://127.0.0.1:${UPSTREAM_PORT}`);
    console.log(`[proxy] WebSocket tunnel: /gateway-ws -> ws://127.0.0.1:${GATEWAY_PORT}`);
  });

  proxyServer.on('error', (err) => {
    console.error(`[proxy] server error: ${err.message}`);
    process.exit(1);
  });
}

process.on('SIGTERM', () => {
  if (proxyServer) proxyServer.close(() => process.exit(0));
});

createServer();
