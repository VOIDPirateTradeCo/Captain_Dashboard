const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const env = { ...process.env };
env.HOSTNAME = '127.0.0.1';
const child = spawn('node', args, { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code));
