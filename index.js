const express = require('express');
const { exec } = require('child_process');
const os = require('os');
const http = require('http');

const app = express();
const PORT = 4000;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

const platform = os.platform();
let command = null;

if (platform === 'linux') {
  command = 'ip route | grep default';
}

// Function to find gateway
function findGateway() {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) return reject(error);
      const parts = stdout.trim().split(/\s+/);
      const index = parts.indexOf('via') + 1;
      resolve(parts[index]);
    });
  });
}

app.get('/', async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  // ✅ Priority: Check for mobile first
  if (isMobile) {
    console.log('📱 Mobile user detected!');
    const workingIp = await reachableIp(commonGateways);
    if (workingIp) {
      return res.redirect(`http://${workingIp}`);
    } else {
      return res.status(404).send('❌ No reachable router found.');
    }
  }

  // ✅ Then handle Linux-based PC requests
  else if (platform === 'linux') {
    try {
      const gateway = await findGateway();
      console.log('📡 Gateway found:', gateway);
      return res.redirect(`http://${gateway}`);
    } catch (err) {
      console.error('❌ Gateway error:', err);
      return res.status(500).send('Gateway detect failed.');
    }
  }

  // ✅ Fallback for other OS/Desktop
  else {
    res.send('💻 Hello from unknown platform.');
  }
});

// ✅ Fixed spelling + logic: reachableIp
function reachableIp(ipList) {
  return new Promise(async (resolve) => {
    for (let ip of ipList) {
      const isReachable = await checkIpFromHttp(ip);
      if (isReachable) {
        return resolve(ip); // return early if found
      }
    }
    resolve(null); // none found
  });
}

// ✅ Fixed spelling: checkIpFromHttp
function checkIpFromHttp(ip) {
  return new Promise((resolve) => {
    const req = http.get({ host: ip, port: 80, timeout: 50 }, (res) => {
      res.resume();
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

const commonGateways = [
  '192.168.0.1', '192.168.1.1', '192.168.2.1',
  '10.0.0.1', '10.0.1.1', '10.1.1.1',
  '172.16.0.1', '172.16.1.1', '172.16.2.1',
  '192.168.68.1',
  // Add more as needed...
];
