import express from 'express';
import { WebSocketServer } from 'ws';
import si from 'systeminformation';
import { exec } from 'child_process';
import http from 'http';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Gracefully handle underlying server/WebSocket errors (like port already in use)
wss.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error('WebSocket server error: port 3001 is already in use. Is another instance running?');
  } else {
    console.error('WebSocket server error:', err);
  }
});

// Helper to parse Windows netstat for active connections
function getActiveConnections() {
  return new Promise((resolve) => {
    exec('netstat -n -p TCP', (err, stdout) => {
      if (err) return resolve([]);
      
      const lines = stdout.split('\n');
      const connections = [];
      let count = 0;
      
      for (let line of lines) {
        const str = line.trim();
        if (!str || !str.includes('ESTABLISHED')) continue;
        
        const parts = str.split(/\s+/);
        if (parts.length >= 4 && parts[0] === 'TCP') {
          // Windows netstat looks like:
          // TCP    192.168.1.100:5432    203.20.1.5:443   ESTABLISHED
          const source = parts[1];
          const dest = parts[2];
          
          const sourceSplit = source.lastIndexOf(':');
          const destSplit = dest.lastIndexOf(':');
          
          if (sourceSplit === -1 || destSplit === -1) continue;
          
          const sourceIp = source.substring(0, sourceSplit);
          const destIp = dest.substring(0, destSplit);
          const port = dest.substring(destSplit + 1);

          connections.push({
            id: `net-${count++}-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            protocol: 'TCP',
            source: sourceIp.replace('[::1]', 'localhost').replace('127.0.0.1', 'localhost'),
            destination: destIp,
            port: parseInt(port, 10) || 80,
            size: Math.floor(Math.random() * 2000) + 128, // Packet size isn't logged in netstat - mock the byte size
            latency: Math.floor(Math.random() * 80) + 1, // Latency isn't visible in raw netstat easily
            status: 'allowed',
          });
        }
        
        // Let's cap at 30 to not overwhelm the UI initially
        if (connections.length >= 30) break;
      }
      resolve(connections);
    });
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected to real-time tracker.');

  // Helper: list devices seen on the local network via ARP table
  const getNetworkDevices = () => {
    return new Promise((resolve) => {
      exec('arp -a', (err, stdout) => {
        if (err) return resolve([]);

        const lines = stdout.split('\n');
        const devices = [];

        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('Interface:') || trimmed.startsWith('Internet Address')) continue;

          // Match IP + MAC
          const match = trimmed.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F\-]+)(?:\s+(\w+))?/);
          if (match) {
            const [, ip, mac, type] = match;

            if (
              ip === '255.255.255.255' ||
              ip.endsWith('.255') ||
              ip.startsWith('224.') ||
              ip.startsWith('239.') ||
              mac.toLowerCase() === 'ff-ff-ff-ff-ff-ff' ||
              mac.toLowerCase().startsWith('01-00-5e')
            ) {
              continue;
            }

            devices.push({ ip, mac, type: type || 'unknown' });
          }
        }

        resolve(devices);
      });
    });
  };

  (async () => {
    try {
      const connections = await getActiveConnections();
      ws.send(JSON.stringify({
        type: 'NETWORK_UPDATE',
        connections
      }));
    } catch (e) {
      console.error(e);
    }
  })();

  const interval = setInterval(async () => {
    try {
      const [connections, stats, latency, devices] = await Promise.all([
        getActiveConnections(),
        si.networkStats(),
        si.inetLatency('8.8.8.8').catch(() => null),
        getNetworkDevices()
      ]);

      let totalRx = 0;
      let totalTx = 0;
      stats.forEach((net) => {
        totalRx += (net.rx_sec || 0) / 1024;
        totalTx += (net.tx_sec || 0) / 1024; 
      });

      const payload = {
        type: 'NETWORK_UPDATE',
        bandwidth: {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          inbound: Math.round(totalRx),
          outbound: Math.round(totalTx)
        },
        internet: {
          latencyMs: latency,
          downKbps: Math.round(totalRx * 8),
          upKbps: Math.round(totalTx * 8)
        },
        devices,
        connections
      };

      ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Error fetching system data:', error);
    }
  }, 3000);

  ws.on('close', () => {
    console.log('Client disconnected.');
    clearInterval(interval);
  });
});

const PORT = 3001;
server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. If the monitor is already running, close the other instance or free the port.`);
  } else {
    console.error('HTTP server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`Live Network Monitor API running on ws://localhost:${PORT}`);
});
