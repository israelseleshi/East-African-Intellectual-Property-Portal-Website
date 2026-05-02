const { execSync, spawn } = require('child_process');

// Check if port 3306 is already listening (tunnel exists)
function isPortListening(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: 'pipe' });
    return result.toString().trim().length > 0;
  } catch (e) {
    return false;
  }
}

// Kill existing tunnel processes
function killExistingTunnels() {
  try {
    const result = execSync('netstat -ano | findstr :3306 | findstr LISTENING', { stdio: 'pipe' }).toString();
    const lines = result.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const match = line.match(/(\d+)$/);
      if (match) {
        const pid = match[1];
        try {
          execSync(`powershell -Command "Stop-Process -Id ${pid} -Force"`, { stdio: 'ignore' });
          console.log(`Killed existing process on port 3306 (PID: ${pid})`);
        } catch (e) {}
      }
    });
  } catch (e) {}
}

if (isPortListening(3306)) {
  console.log('✓ SSH tunnel already running on port 3306.');
  process.exit(0);
}

console.log('Starting SSH tunnel to a2hosting...');
killExistingTunnels();

// Use spawn to background the SSH process on Windows
const ssh = spawn('ssh', ['-L', '3306:127.0.0.1:3306', '-N', 'a2hosting'], {
  detached: true,
  stdio: 'ignore'
});

ssh.unref();

// Wait a bit for tunnel to establish
setTimeout(() => {
  if (isPortListening(3306)) {
    console.log('✓ SSH tunnel started (localhost:3306 -> a2hosting:3306).');
    process.exit(0);
  } else {
    console.error('✗ SSH tunnel failed to start. Please manually run: ssh -L 3306:127.0.0.1:3306 -N a2hosting');
    process.exit(1);
  }
}, 3000);
