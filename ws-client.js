import { WebSocket } from 'ws';
const ws = new WebSocket('ws://localhost:3001');
ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => {
  console.log(data.toString());
  ws.close();
  process.exit(0);
});
