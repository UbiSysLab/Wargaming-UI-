const dns2 = require('dns2');
const dgram = require('dgram');
const { Packet } = dns2;

// Get the active LAN IPv4 address
const os = require('os');
// Dynamic interface resolver based on client request IP
function getLocalIp(clientIp) {
  // If client is connected via Windows Mobile Hotspot, return the standard gateway IP
  if (clientIp && clientIp.startsWith('192.168.137.')) {
    return '192.168.137.1';
  }

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

const PUBLIC_DNS = '8.8.8.8';

console.log(`===================================================`);
console.log(`   WARGAMING LOCAL DNS SERVER - RUNNING`);
console.log(`===================================================`);
console.log(`Subnet Discovery Active (0.0.0.0:53)`);
console.log(`Routing: wargaming.com -> Host Laptop IP`);
console.log(`All other requests are forwarded to: ${PUBLIC_DNS}`);
console.log(`---------------------------------------------------`);
console.log(`ZERO-CONFIGURATION STEPS FOR CLIENTS:`);
console.log(`1. Enable Windows "Mobile Hotspot" on the laptop.`);
console.log(`2. Connect client devices to the laptop's Wi-Fi.`);
console.log(`3. Open browser and type: http://wargaming.com`);
console.log(`===================================================`);

const server = dns2.createServer({
  udp: true,
  handle: async (request, send, rinfo) => {
    const response = Packet.createResponseFromRequest(request);
    const [question] = request.questions;
    const { name } = question;

    if (name.toLowerCase() === 'wargaming.com' || name.toLowerCase().endsWith('.wargaming.com')) {
      const resolvedIp = getLocalIp(rinfo.address);
      console.log(`[DNS] Resolving ${name} locally to ${resolvedIp} for client ${rinfo.address}`);
      response.answers.push({
        name,
        type: Packet.TYPE.A,
        class: Packet.CLASS.IN,
        ttl: 300,
        address: resolvedIp
      });
      send(response);
    } else {
      // Forward to Google Public DNS for standard internet access
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

server.on('request', (request, response, rinfo) => {
  // Silent logging
});

server.on('error', (err) => {
  console.error('DNS Server Error:', err);
});

// Port 53 is the standard DNS port
server.listen({ udp: 53 });
