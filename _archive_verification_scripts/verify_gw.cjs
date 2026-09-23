const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:18789');
ws.on('open', () => {
  console.log('WS connected!');
  ws.send(JSON.stringify({ type: 'ping' }));
});
ws.on('message', (data) => {
  console.log('Response:', data.toString().substring(0, 200));
  ws.close();
});
ws.on('error', (e) => {
  console.log('WS error:', e.message);
});
setTimeout(() => { ws.close(); process.exit(0); }, 5000);
