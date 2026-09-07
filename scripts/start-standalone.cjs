const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const script = args[0];
const scriptArgs = args.slice(1);
if (!script) {
  console.error('Usage: node start-standalone.cjs <script> [args...]');
  process.exit(1);
}
const env = { ...process.env };
env.HOSTNAME = '127.0.0.1';
const child = spawn('node', [script, ...scriptArgs], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code));
