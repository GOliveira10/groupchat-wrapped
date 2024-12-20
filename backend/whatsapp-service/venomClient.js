const venom = require('venom-bot');
const EventEmitter = require('events');

class VenomClient extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  async createSession(sessionId) {
    try {
      console.log(`Creating new session: ${sessionId}`);
      
      const client = await venom.create(
        sessionId,
        (base64Qr) => {
          console.log('QR Code received in venom client');
          const session = this.sessions.get(sessionId);
          if (session) {
            session.qrCode = base64Qr;
            session.status = 'qr_ready';
            // Emit event with sessionId and qrCode
            console.log('Emitting QR event for session:', sessionId);
            this.emit('qr', sessionId, base64Qr);
          }
        },
        (statusSession) => {
          console.log('Status Session:', statusSession);
          const session = this.sessions.get(sessionId);
          if (session) {
            session.status = statusSession;
            this.emit('status', sessionId, statusSession);
          }
        },
        {
          headless: true,
          devtools: false,
          useChrome: true,
          debug: true,
          logQR: true,
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-web-security'
          ],
          refreshQR: 30000,
          autoClose: 120000,
          createPathFileToken: true,
          waitForLogin: true,
          chromiumVersion: '818858'
        }
      );

      this.sessions.set(sessionId, {
        client,
        status: 'initializing',
        qrCode: null
      });

      return sessionId;

    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }


  async getChatHistory(sessionId, chatId) {
    console.log(`Fetching chat history for session ${sessionId}, chat ${chatId}`);
    const session = this.sessions.get(sessionId);
    if (!session || !session.client) {
      throw new Error('Session not found');
    }

    try {
      const messages = await session.client.loadAndGetAllMessagesInChat(chatId);
      return this.formatWhatsAppChat(messages);
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  async getAllChats(sessionId) {
    console.log(`Fetching all chats for session ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (!session || !session.client) {
      throw new Error('Session not found');
    }

    try {
      return await session.client.getAllChats();
    } catch (error) {
      console.error('Error getting chats:', error);
      throw error;
    }
  }

  formatWhatsAppChat(messages) {
    return messages.map(msg => {
      try {
        // Convert timestamp to Date object (Venom provides timestamp in seconds)
        const timestamp = new Date(msg.timestamp * 1000);
        
        // Format date to match WhatsApp export format: MM/DD/YY, HH:MM
        const dateStr = timestamp.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        });
        const timeStr = timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        // Get sender name (handle both individual and group messages)
        const sender = msg.sender.pushname || msg.sender.name || msg.from;

        // Format message to match WhatsApp export format
        return `[${dateStr}, ${timeStr}] ${sender}: ${msg.body}`;
      } catch (error) {
        console.error('Error formatting message:', error);
        return ''; // Skip malformed messages
      }
    }).filter(Boolean).join('\n');
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId) {
    console.log(`Closing session ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (session && session.client) {
      try {
        await session.client.close();
        this.sessions.delete(sessionId);
        console.log(`Session ${sessionId} closed successfully`);
      } catch (error) {
        console.error('Error closing session:', error);
        throw error;
      }
    }
  }

  // Fixed event helper methods
  once(sessionId, event, callback) {
    const fullEventName = `${sessionId}:${event}`;
    super.once(fullEventName, callback);
  }

  on(sessionId, event, callback) {
    const fullEventName = `${sessionId}:${event}`;
    super.on(fullEventName, callback);
  }

  // Helper method to check session status
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.status : 'not_found';
  }

  // Helper method to get QR code
  getSessionQR(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.qrCode : null;
  }

  onQR(callback) {
    if (typeof callback !== 'function') {
      console.error("onQR expected a function, but received:", typeof callback);
      throw new Error("Callback must be a function");
    }
    this.on('qr', callback);
  }

  onStatus(callback) {
    this.on('status', callback);
  }
}


module.exports = new VenomClient();