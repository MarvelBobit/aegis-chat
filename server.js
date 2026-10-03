const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// File-based Persistent Database Engine
const dataDir = path.join(__dirname, 'data');
const dbFilePath = path.join(dataDir, 'database.json');

// In-Memory active caches backed by database.json
const users = new Map();
const aegisIdIndex = new Map();
const usernameIndex = new Map();
const connections = new Map();
let pendingRequests = [];
let messages = [];

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Save all state to database.json
function saveDatabase() {
  try {
    const serializedUsers = Array.from(users.values());
    const serializedConnections = {};
    for (const [userId, connSet] of connections.entries()) {
      serializedConnections[userId] = Array.from(connSet);
    }

    const payload = {
      version: 1,
      lastSaved: new Date().toISOString(),
      users: serializedUsers,
      connections: serializedConnections,
      pendingRequests,
      messages: messages.slice(-500) // keep last 500 messages
    };

    fs.writeFileSync(dbFilePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

// Load all state from database.json on server boot
function loadDatabase() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      const data = JSON.parse(raw);

      if (Array.isArray(data.users)) {
        data.users.forEach(u => {
          u.isOnline = false; // reset online status on server boot
          users.set(u.id, u);
          if (u.aegisId) aegisIdIndex.set(u.aegisId.toUpperCase(), u.id);
          if (u.username) usernameIndex.set(u.username.toLowerCase(), u.id);
          if (!connections.has(u.id)) connections.set(u.id, new Set());
        });
      }

      if (data.connections && typeof data.connections === 'object') {
        for (const [uId, friendIds] of Object.entries(data.connections)) {
          if (!connections.has(uId)) connections.set(uId, new Set());
          const set = connections.get(uId);
          if (Array.isArray(friendIds)) {
            friendIds.forEach(fId => set.add(fId));
          }
        }
      }

      if (Array.isArray(data.pendingRequests)) {
        pendingRequests = data.pendingRequests;
      }

      if (Array.isArray(data.messages)) {
        messages = data.messages;
      }

      console.log(`[DB] Successfully loaded ${users.size} user(s), ${pendingRequests.length} pending request(s), and ${messages.length} message(s) from ${dbFilePath}`);
      return;
    }
  } catch (err) {
    console.error('Error loading database, initializing fresh database:', err);
  }

  // Seed default starter user if no database exists
  const starterAegisId = 'AEG-1001';
  const starterUser = {
    id: 'user_alex',
    username: 'alex',
    displayName: 'Alex',
    aegisId: starterAegisId,
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    publicKey: null,
    isOnline: false,
    lastSeen: Date.now()
  };
  users.set(starterUser.id, starterUser);
  aegisIdIndex.set(starterAegisId, starterUser.id);
  usernameIndex.set(starterUser.username, starterUser.id);
  connections.set(starterUser.id, new Set());
  saveDatabase();
  console.log(`[DB] Initialized fresh database with starter account ${starterAegisId} at ${dbFilePath}`);
}

// Initialize database immediately on startup
loadDatabase();

// Helper to generate a clean shareable Aegis ID (e.g. AEG-4821)
function generateAegisId() {
  let id;
  do {
    const num = Math.floor(1000 + Math.random() * 9000);
    id = `AEG-${num}`;
  } while (aegisIdIndex.has(id));
  return id;
}

// --- REST API Endpoints ---

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    network: 'AEGIS_CLEAN_E2EE',
    activeConnections: wss.clients.size,
    registeredUsers: users.size,
    timestamp: Date.now()
  });
});

// Register New Account
app.post('/api/auth/register', (req, res) => {
  const { username, displayName, password, publicKey } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (usernameIndex.has(cleanUsername)) {
    return res.status(409).json({ error: 'Username already taken. Please choose another.' });
  }

  const userId = `user_${cleanUsername}_${uuidv4().slice(0, 4)}`;
  const aegisId = generateAegisId();

  const newUser = {
    id: userId,
    username: cleanUsername,
    displayName: (displayName && displayName.trim()) || cleanUsername,
    aegisId,
    password,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
    publicKey: publicKey || null,
    isOnline: true,
    lastSeen: Date.now()
  };

  users.set(userId, newUser);
  aegisIdIndex.set(aegisId, userId);
  usernameIndex.set(cleanUsername, userId);
  connections.set(userId, new Set());
  saveDatabase();

  res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      aegisId: newUser.aegisId,
      avatar: newUser.avatar,
      publicKey: newUser.publicKey
    }
  });
});

// Log In to Existing Account
app.post('/api/auth/login', (req, res) => {
  const { username, password, publicKey } = req.body;
  const cleanUsername = username?.trim().toLowerCase();

  const userId = usernameIndex.get(cleanUsername);
  if (!userId) {
    return res.status(404).json({ error: 'Account not found with that username' });
  }

  const user = users.get(userId);
  if (user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  if (publicKey) user.publicKey = publicKey;
  user.isOnline = true;
  user.lastSeen = Date.now();
  saveDatabase();

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      aegisId: user.aegisId,
      avatar: user.avatar,
      publicKey: user.publicKey
    }
  });
});

// Verify & Restore Active Session (Survives Reloads & Restarts Forever)
app.post('/api/auth/verify-session', (req, res) => {
  const { userId, username, aegisId, displayName, avatar, publicKey } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  let user = users.get(userId);
  if (!user && username) {
    const foundId = usernameIndex.get(username.trim().toLowerCase());
    if (foundId) user = users.get(foundId);
  }

  if (!user && aegisId) {
    const foundId = aegisIdIndex.get(aegisId.trim().toUpperCase());
    if (foundId) user = users.get(foundId);
  }

  // Self-healing restore: if user session was stored locally with valid keys,
  // ensure the server never abandons this account!
  if (!user) {
    if (username && aegisId) {
      const cleanUsername = username.trim().toLowerCase();
      user = {
        id: userId,
        username: cleanUsername,
        displayName: displayName || cleanUsername,
        aegisId: aegisId.trim().toUpperCase(),
        password: '',
        avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
        publicKey: publicKey || null,
        isOnline: true,
        lastSeen: Date.now()
      };
      users.set(userId, user);
      aegisIdIndex.set(user.aegisId, userId);
      usernameIndex.set(cleanUsername, userId);
      if (!connections.has(userId)) connections.set(userId, new Set());
      saveDatabase();
      console.log(`[DB] Restored active session user ${user.username} (${user.aegisId}) into database`);
    } else {
      return res.status(404).json({ error: 'Session user not found' });
    }
  }

  if (publicKey) user.publicKey = publicKey;
  if (avatar && avatar !== user.avatar) user.avatar = avatar;
  if (displayName && displayName !== user.displayName) user.displayName = displayName;
  user.isOnline = true;
  user.lastSeen = Date.now();
  saveDatabase();

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      aegisId: user.aegisId,
      avatar: user.avatar,
      publicKey: user.publicKey
    }
  });
});

// Update or register public key
app.post('/api/users/register-key', (req, res) => {
  const { id, publicKey } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing userId' });

  const user = users.get(id);
  if (user) {
    user.publicKey = publicKey;
    saveDatabase();
  }
  res.json({ success: true });
});

// Update user profile (Avatar / Display Name)
app.post('/api/users/update-profile', (req, res) => {
  const { userId, avatar, displayName } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (avatar) user.avatar = avatar;
  if (displayName) user.displayName = displayName.trim();
  saveDatabase();

  // Broadcast update to peers
  broadcast({
    type: 'user-profile-updated',
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      aegisId: user.aegisId,
      avatar: user.avatar,
      publicKey: user.publicKey,
      isOnline: user.isOnline
    }
  });

  res.json({ success: true, user });
});

// Lookup user by Aegis ID
app.get('/api/users/by-aegis-id/:aegisId', (req, res) => {
  const searchId = req.params.aegisId.trim().toUpperCase();
  const userId = aegisIdIndex.get(searchId);
  if (!userId) {
    return res.status(404).json({ error: 'No user found with that Aegis ID' });
  }

  const user = users.get(userId);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    aegisId: user.aegisId,
    avatar: user.avatar,
    publicKey: user.publicKey,
    isOnline: user.isOnline
  });
});

// Get user's accepted friends / connected contacts only
app.get('/api/connect/friends/:userId', (req, res) => {
  const { userId } = req.params;
  const friendIds = connections.get(userId) || new Set();

  const friendsList = [];
  friendIds.forEach(fId => {
    const u = users.get(fId);
    if (u) {
      friendsList.push({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        aegisId: u.aegisId,
        avatar: u.avatar,
        publicKey: u.publicKey,
        isOnline: u.isOnline
      });
    }
  });

  res.json(friendsList);
});

// Get pending connection requests for a user
app.get('/api/connect/pending/:userId', (req, res) => {
  const { userId } = req.params;
  const requests = pendingRequests.filter(r => r.toId === userId);
  res.json(requests);
});

// Send a connection request to an Aegis ID
app.post('/api/connect/request', (req, res) => {
  const { fromId, toAegisId } = req.body;
  if (!fromId || !toAegisId) {
    return res.status(400).json({ error: 'Missing sender ID or recipient Aegis ID' });
  }

  const targetAegisId = toAegisId.trim().toUpperCase();
  const targetUserId = aegisIdIndex.get(targetAegisId);

  if (!targetUserId) {
    return res.status(404).json({ error: `User ID "${targetAegisId}" does not exist. Check spelling.` });
  }

  if (targetUserId === fromId) {
    return res.status(400).json({ error: 'You cannot connect with your own ID' });
  }

  // Check if already connected
  const userFriends = connections.get(fromId) || new Set();
  if (userFriends.has(targetUserId)) {
    return res.status(400).json({ error: 'You are already connected with this user' });
  }

  // Check if request already pending
  const existing = pendingRequests.find(
    r => (r.fromId === fromId && r.toId === targetUserId) || (r.fromId === targetUserId && r.toId === fromId)
  );
  if (existing) {
    return res.status(400).json({ error: 'A connection request is already pending between you two' });
  }

  const sender = users.get(fromId);
  const target = users.get(targetUserId);

  const request = {
    id: `req_${uuidv4().slice(0, 8)}`,
    fromId: sender.id,
    fromUsername: sender.username,
    fromDisplayName: sender.displayName,
    fromAegisId: sender.aegisId,
    toId: target.id,
    toAegisId: target.aegisId,
    timestamp: Date.now()
  };

  pendingRequests.push(request);
  saveDatabase();

  // Notify recipient via WebSocket in real-time
  sendToUser(target.id, {
    type: 'incoming-connection-request',
    request
  });

  res.status(201).json({ success: true, request, recipientName: target.displayName });
});

// Accept a connection request
app.post('/api/connect/accept', (req, res) => {
  const { requestId } = req.body;
  const idx = pendingRequests.findIndex(r => r.id === requestId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Connection request not found' });
  }

  const request = pendingRequests[idx];
  pendingRequests.splice(idx, 1);

  // Add mutual connection
  if (!connections.has(request.fromId)) connections.set(request.fromId, new Set());
  if (!connections.has(request.toId)) connections.set(request.toId, new Set());

  connections.get(request.fromId).add(request.toId);
  connections.get(request.toId).add(request.fromId);
  saveDatabase();

  const userA = users.get(request.fromId);
  const userB = users.get(request.toId);

  // Notify both parties in real-time via WebSocket
  sendToUser(request.fromId, {
    type: 'connection-accepted',
    newFriend: {
      id: userB.id,
      username: userB.username,
      displayName: userB.displayName,
      aegisId: userB.aegisId,
      avatar: userB.avatar,
      publicKey: userB.publicKey,
      isOnline: userB.isOnline
    }
  });

  sendToUser(request.toId, {
    type: 'connection-accepted',
    newFriend: {
      id: userA.id,
      username: userA.username,
      displayName: userA.displayName,
      aegisId: userA.aegisId,
      avatar: userA.avatar,
      publicKey: userA.publicKey,
      isOnline: userA.isOnline
    }
  });

  res.json({ success: true, connectedWith: userA });
});

// Decline a connection request
app.post('/api/connect/decline', (req, res) => {
  const { requestId } = req.body;
  const idx = pendingRequests.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    pendingRequests.splice(idx, 1);
    saveDatabase();
  }
  res.json({ success: true });
});

// Messages API
app.get('/api/messages/:userA/:userB', (req, res) => {
  const { userA, userB } = req.params;
  const conversation = messages.filter(
    m => (m.from === userA && m.to === userB) || (m.from === userB && m.to === userA)
  );
  res.json(conversation);
});

// --- WebSocket Live Blind Relay ---
const connectedClients = new Map(); // socket -> userId
const userSockets = new Map(); // userId -> Set of sockets

function broadcast(data, excludeSocket = null) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function sendToUser(userId, data) {
  const sockets = userSockets.get(userId);
  if (sockets && sockets.size > 0) {
    const payload = JSON.stringify(data);
    sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
    return true;
  }
  return false;
}

wss.on('connection', ws => {
  let authenticatedUserId = null;

  ws.on('message', rawMsg => {
    try {
      const data = JSON.parse(rawMsg.toString());

      switch (data.type) {
        case 'register': {
          authenticatedUserId = data.userId;
          connectedClients.set(ws, authenticatedUserId);

          if (!userSockets.has(authenticatedUserId)) {
            userSockets.set(authenticatedUserId, new Set());
          }
          userSockets.get(authenticatedUserId).add(ws);

          if (users.has(authenticatedUserId)) {
            const u = users.get(authenticatedUserId);
            u.isOnline = true;
            if (data.publicKey) u.publicKey = data.publicKey;
          }

          broadcast({
            type: 'user-presence',
            userId: authenticatedUserId,
            isOnline: true
          });

          ws.send(JSON.stringify({
            type: 'registered',
            userId: authenticatedUserId,
            timestamp: Date.now()
          }));
          break;
        }

        case 'send-message': {
          // Zero-knowledge blind relay:
          // Server receives ONLY: { id, from, to, ciphertext, iv, seq, burnDuration, msgType, timestamp }
          const messageId = data.id || `msg_${uuidv4().slice(0, 10)}`;
          const blindedMsg = {
            id: messageId,
            from: data.from,
            to: data.to,
            ciphertext: data.ciphertext,
            iv: data.iv,
            seq: data.seq || 1,
            burnDuration: data.burnDuration || null,
            msgType: data.msgType || 'text',
            voiceWaveform: data.voiceWaveform || null,
            timestamp: data.timestamp || Date.now()
          };

          messages.push(blindedMsg);
          saveDatabase();

          // Relay to recipient
          const delivered = sendToUser(data.to, {
            type: 'incoming-message',
            message: blindedMsg
          });

          // Echo to sender's other tabs
          const senderSockets = userSockets.get(data.from);
          if (senderSockets) {
            const senderPayload = JSON.stringify({
              type: 'message-sent-ack',
              message: blindedMsg,
              delivered
            });
            senderSockets.forEach(s => {
              if (s !== ws && s.readyState === WebSocket.OPEN) {
                s.send(senderPayload);
              }
            });
          }

          ws.send(JSON.stringify({
            type: 'message-ack',
            messageId,
            delivered,
            timestamp: Date.now()
          }));
          break;
        }

        case 'typing': {
          sendToUser(data.to, {
            type: 'user-typing',
            from: data.from,
            isTyping: data.isTyping
          });
          break;
        }

        case 'burn-message': {
          const idx = messages.findIndex(m => m.id === data.messageId);
          if (idx !== -1) {
            messages.splice(idx, 1);
            saveDatabase();
          }
          sendToUser(data.from, { type: 'message-burned', messageId: data.messageId });
          sendToUser(data.to, { type: 'message-burned', messageId: data.messageId });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const sockets = userSockets.get(authenticatedUserId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSockets.delete(authenticatedUserId);
          if (users.has(authenticatedUserId)) {
            const u = users.get(authenticatedUserId);
            u.isOnline = false;
            u.lastSeen = Date.now();
          }
          broadcast({
            type: 'user-presence',
            userId: authenticatedUserId,
            isOnline: false
          });
        }
      }
      connectedClients.delete(ws);
    }
  });
});

// Serve Client Production Build (for Render.com & Production Deployments)
const candidateDistPaths = [
  path.join(__dirname, '../client/dist'),
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist')
];
const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p));
if (clientDistPath) {
  console.log('Serving client static build from:', clientDistPath);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.warn('[WARN] No client/dist directory found. Ensure client was built.');
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🔒 AEGIS PRIVATE RELAY SERVER ONLINE (PORT ${PORT})`);
  console.log(`🆔 ID-Based Connections & Zero-Knowledge Active`);
  console.log(`=================================================`);
});
