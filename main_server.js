// Prevent command window from closing on errors (registered first to catch import crashes)
process.on('uncaughtException', (err) => {
  console.error('\n[FATAL ERROR]', err.stack || err.message);
  console.log('\n---------------------------------------------------');
  console.log('Troubleshooting tips:');
  console.log('1. Ensure you ran this application as Administrator.');
  console.log('2. Ensure no other Web Server (IIS/Apache/Vite) is running on Port 80.');
  console.log('3. Ensure no other DNS Service is running on Port 53.');
  console.log('---------------------------------------------------');
  console.log('\nPress Ctrl+C to close this window.');
  // Keep terminal open
  setInterval(() => {}, 10000);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n[Unhandled Rejection]', reason);
});

const dns2 = require('dns2');
const dgram = require('dgram');
const express = require('express');
const path = require('path');
const os = require('os');
const { Packet } = dns2;

// Get local IPv4 interface
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const SERVER_IP = getLocalIp();
const PUBLIC_DNS = '8.8.8.8';

console.log(`===================================================`);
console.log(`   WARGAMING CONSOLE UNIFIED SERVER`);
console.log(`===================================================`);
console.log(`Server LAN IP Address: ${SERVER_IP}`);
console.log(`DNS Routing: wargaming.com -> ${SERVER_IP}`);
console.log(`Web Server Port: 80`);
console.log(`---------------------------------------------------`);

// 1. Start Static Web Server on Port 80
const app = express();
const fs = require('fs');

// Check if an external "dist" directory exists next to the executable
const externalDistPath = path.join(process.cwd(), 'dist');
const distPath = fs.existsSync(externalDistPath) ? externalDistPath : path.join(__dirname, 'dist');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Web] ${new Date().toLocaleTimeString()} - ${req.ip} -> ${req.method} ${req.url}`);
  next();
});

// Middleware to serve static files
app.use(express.static(distPath));

// Endpoint to dynamically serve the server's current IP address for LAN discovery
app.get('/config.json', (req, res) => {
  res.json({ server_ip: SERVER_IP });
});

// Fallback all routes to index.html for React Router compatibility
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const handleServerStartError = (serverName, err) => {
  console.error(`\n[FATAL ERROR] Failed to start ${serverName}:`, err.message);
  console.log('\n---------------------------------------------------');
  console.log('Troubleshooting tips:');
  console.log('1. Ensure you ran this application as Administrator.');
  console.log('2. Ensure no other service is already using that port.');
  console.log('---------------------------------------------------');
  console.log('\nPress Ctrl+C to close this window.');
  // Keep terminal open
  setInterval(() => {}, 10000);
};

app.listen(80, () => {
  console.log(`[Web] Serving UI from /dist on port 80`);
}).on('error', (err) => {
  handleServerStartError('Web Server (Port 80)', err);
});

// 2. Start DNS Server on Port 53
const dnsServer = dns2.createServer({
  udp: true,
  handle: async (request, send, rinfo) => {
    const response = Packet.createResponseFromRequest(request);
    const [question] = request.questions;
    const { name } = question;

    if (name.toLowerCase() === 'wargaming.com' || name.toLowerCase().endsWith('.wargaming.com')) {
      console.log(`[DNS] Resolving ${name} locally to ${SERVER_IP} for client ${rinfo.address}`);
      response.answers.push({
        name,
        type: Packet.TYPE.A,
        class: Packet.CLASS.IN,
        ttl: 300,
        address: SERVER_IP
      });
      send(response);
    } else {
      // Proxy standard dns lookup queries to public DNS
      try {
        const client = dgram.createSocket('udp4');
        client.on('message', (msg) => {
          send(msg);
          client.close();
        });
        client.send(request.toBuffer(), 53, PUBLIC_DNS, (err) => {
          if (err) {
            client.close();
            send(response);
          }
        });
      } catch (e) {
        send(response);
      }
    }
  }
});

dnsServer.listen({ udp: 53 }).then(() => {
  console.log(`[DNS] Listening on port 53`);
}).catch((err) => {
  handleServerStartError('DNS Server (Port 53)', err);
});
