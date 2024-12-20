const express = require('express');
const cors = require('cors');
const venomClient = require('./venomClient');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/connect-whatsapp', async (req, res) => {
  try {
    const sessionId = `session-${Date.now()}`; // Generate a unique sessionId
    console.log('Creating new WhatsApp session:', sessionId);

    let isResolved = false; // Used to avoid multiple responses

    // Attach the QR Code listener BEFORE creating the session
    venomClient.onQR(function (sid, qrCode) {
      console.log('onQR callback triggered. Session ID:', sid, 'QR Code:', qrCode);
    
      if (sid === sessionId && !isResolved) {
        console.log('QR Code received, sending to client...');
        isResolved = true; // Prevent duplicate responses
        res.json({ 
          sessionId,
          qrCode,
          status: 'qr_ready'
        });
      }
    });

    // Call createSession AFTER attaching the listener
    console.log('Initializing WhatsApp session...');
    await venomClient.createSession(sessionId);
    console.log('Session created successfully:', sessionId);

    // Set up timeout in case QR code generation fails
    setTimeout(() => {
      if (!isResolved) {
        console.error('QR Code generation timeout for session:', sessionId);
        isResolved = true; // Prevent duplicate responses
        res.status(500).json({ 
          error: 'QR Code generation timeout',
          details: 'Failed to generate QR code within the timeout period'
        });
      }
    }, 30000);

  } catch (error) {
    console.error('WhatsApp connection error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to connect to WhatsApp',
        details: error.message 
      });
    }
  }
});


app.get('/whatsapp-status/:sessionId', (req, res) => {
  const session = venomClient.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ status: session.status });
});

app.get('/whatsapp-chats/:sessionId', async (req, res) => {
  try {
    const chats = await venomClient.getAllChats(req.params.sessionId);
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.post('/analyze-whatsapp-chat', async (req, res) => {
  const { sessionId, chatId } = req.body;
  
  try {
    const chatText = await venomClient.getChatHistory(sessionId, chatId);
    // Forward to your R analysis endpoint
    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: chatText })
    });
    
    if (!response.ok) {
      throw new Error('Analysis failed');
    }
    
    const analysis = await response.json();
    res.json(analysis);
  } catch (error) {
    console.error('WhatsApp analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/disconnect-whatsapp/:sessionId', async (req, res) => {
  try {
    await venomClient.closeSession(req.params.sessionId);
    res.json({ status: 'disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WhatsApp server running on port ${PORT}`);
});