import express from 'express'
import WebSocket, { WebSocketServer } from 'ws'

const app = express()


const httpServer = app.listen(8080, () => {
  console.log('HTTP server listening on port 8080');
});



const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', function connection(ws) {
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('message', function message(data, isBinary) {
    console.log("message received from client", )
    const messageData = isBinary ? data : data.toString();
    console.log("Message received from client:", messageData);

    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });

  ws.send('Hello! Message From Server!!');
});



process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  wss.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

