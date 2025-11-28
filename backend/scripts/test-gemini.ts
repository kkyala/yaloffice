
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const WS_URL = 'ws://localhost:8000/ws/gemini-proxy?sessionId=test-session';

function runTest() {
  console.log(`Connecting to ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('Connected to Gemini Proxy');

    // Send a text message to start the conversation
    const startMsg = {
      type: 'text',
      text: 'Hello, are you ready for the interview?'
    };
    ws.send(JSON.stringify(startMsg));
    console.log('Sent start message');

    // Simulate sending audio (silence)
    // Send 1 second of silence (16kHz, 16-bit mono = 32000 bytes)
    const silence = Buffer.alloc(32000);
    
    // Send in chunks
    let offset = 0;
    const chunkSize = 4096;
    
    const interval = setInterval(() => {
      if (offset >= silence.length) {
        clearInterval(interval);
        console.log('Finished sending audio');
        return;
      }
      
      const chunk = silence.subarray(offset, offset + chunkSize);
      ws.send(chunk); // Send as binary
      offset += chunkSize;
    }, 100); // Send every 100ms (approx real-time)
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('Received message:', JSON.stringify(msg, null, 2));
    } catch (e) {
      console.log('Received binary or invalid message:', data.length, 'bytes');
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  ws.on('close', () => {
    console.log('WebSocket closed');
  });
}

runTest();
