const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'keys.json');

// Ensure data directory and database file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ keys: [] }, null, 2));
}

app.use(express.json());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Helper: load keys from JSON
function loadKeys() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    return data.keys || [];
  } catch (err) {
    console.error('Error reading keys database:', err);
    return [];
  }
}

// Helper: save keys to JSON
function saveKeys(keys) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ keys }, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing keys database:', err);
    return false;
  }
}

// Helper: generate access key
function generateKeyString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `NOVA-${part()}-${part()}`;
}

// Deterministic Predictor Algorithm
function getDeterministicPrediction(inputNumber) {
  const salt = 'omega_standalone_predictor_salt_982';
  const str = inputNumber.trim() + salt;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  hash = Math.abs(hash);

  const predictedNumber = hash % 10;
  const size = predictedNumber <= 4 ? 'Small' : 'Big';
  
  let color;
  if (predictedNumber === 0) color = 'Red-Violet';
  else if (predictedNumber === 5) color = 'Green-Violet';
  else if ([1, 3, 7, 9].includes(predictedNumber)) color = 'Green';
  else color = 'Red';

  const confidence = 82 + (hash % 17); // 82% to 98%

  return {
    number: predictedNumber,
    color,
    size,
    confidence
  };
}

// Middleware: Admin auth check
function checkAdminAuth(req, res, next) {
  const headerPassword = req.headers['x-admin-password'];
  if (headerPassword === ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
}

// Public API: User Access Key Login
app.post('/api/login', (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Access Key is required' });
  }

  const keys = loadKeys();
  const found = keys.find(k => k.key === key.trim().toUpperCase());

  if (!found) {
    return res.status(401).json({ error: 'Invalid Access Key' });
  }
  if (!found.isActive) {
    return res.status(403).json({ error: 'Access Key is suspended' });
  }

  return res.json({ success: true, key: found.key, description: found.description });
});

// Public API: Predict
app.post('/api/predict', (req, res) => {
  const { number, key } = req.body;
  if (!number) {
    return res.status(400).json({ error: 'Period number is required' });
  }
  if (!key) {
    return res.status(400).json({ error: 'Access Key is required' });
  }

  const keys = loadKeys();
  const found = keys.find(k => k.key === key.trim().toUpperCase());

  if (!found || !found.isActive) {
    return res.status(401).json({ error: 'Unauthorized key' });
  }

  const prediction = getDeterministicPrediction(number);
  return res.json({ success: true, prediction });
});

// Admin APIs: List Keys
app.get('/api/admin/keys', checkAdminAuth, (req, res) => {
  const keys = loadKeys();
  return res.json({ keys });
});

// Admin APIs: Create Key
app.post('/api/admin/keys', checkAdminAuth, (req, res) => {
  const { description } = req.body;
  const keys = loadKeys();
  
  const newKey = {
    id: crypto.randomUUID(),
    key: generateKeyString(),
    description: description || 'Unnamed User',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  keys.push(newKey);
  saveKeys(keys);

  return res.status(201).json({ success: true, key: newKey });
});

// Admin APIs: Toggle Key status
app.post('/api/admin/keys/toggle', checkAdminAuth, (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Key ID is required' });
  }

  const keys = loadKeys();
  const keyIndex = keys.findIndex(k => k.id === id);

  if (keyIndex === -1) {
    return res.status(404).json({ error: 'Access key not found' });
  }

  keys[keyIndex].isActive = !keys[keyIndex].isActive;
  saveKeys(keys);

  return res.json({ success: true, key: keys[keyIndex] });
});

// Admin APIs: Delete Key
app.delete('/api/admin/keys', checkAdminAuth, (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Key ID is required' });
  }

  let keys = loadKeys();
  const found = keys.some(k => k.id === id);

  if (!found) {
    return res.status(404).json({ error: 'Access key not found' });
  }

  keys = keys.filter(k => k.id !== id);
  saveKeys(keys);

  return res.json({ success: true });
});

// SPA Routing: Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`============================================`);
  console.log(`  Standalone Color Predictor app listening  `);
  console.log(`  Url: http://localhost:${PORT}             `);
  console.log(`  Admin password: ${ADMIN_PASSWORD}         `);
  console.log(`============================================`);
});
