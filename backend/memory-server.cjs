const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.MEMORY_PORT || 8787);
const DATA_PATH =
  process.env.MEMORY_STORE_PATH ||
  path.join(__dirname, 'data', 'memory.json');
const VECTOR_DIM = Number(process.env.MEMORY_VECTOR_DIM || 512);
const MAX_RESULTS = Number(process.env.MEMORY_MAX_RESULTS || 8);

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const loadStore = () => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[memory-server] Failed to load store', err);
  }
  return { users: {} };
};

let store = loadStore();

const persistStore = () => {
  try {
    ensureDir(DATA_PATH);
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('[memory-server] Failed to persist store', err);
  }
};

const getUserBucket = (uid) => {
  if (!uid) return null;
  if (!store.users[uid]) {
    store.users[uid] = {
      profile: { memoryVersion: 'v4', text: '' },
      nodes: {},
    };
  }
  return store.users[uid];
};

const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
};

const hashToken = (token) => {
  const hash = crypto.createHash('sha1').update(token).digest();
  return hash.readUInt32BE(0) % VECTOR_DIM;
};

const embedText = (text) => {
  const vec = new Array(VECTOR_DIM).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const idx = hashToken(token);
    vec[idx] += 1;
  }
  let norm = 0;
  for (const value of vec) {
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i += 1) {
      vec[i] = vec[i] / norm;
    }
  }
  return vec;
};

const cosine = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
};

const jsonResponse = (res, status, payload) => {
  const body = JSON.stringify(payload || {});
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
};

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
  });

const handleRequest = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = req.url || '/';
  let payload;
  try {
    payload = await parseBody(req);
  } catch (err) {
    jsonResponse(res, 400, { error: err.message || 'Invalid payload' });
    return;
  }

  if (url === '/health') {
    jsonResponse(res, 200, { status: 'ok' });
    return;
  }

  if (url === '/memory/profile/get') {
    const bucket = getUserBucket(payload.uid);
    if (!bucket) {
      jsonResponse(res, 400, { error: 'uid required' });
      return;
    }
    jsonResponse(res, 200, bucket.profile || { memoryVersion: 'v4', text: '' });
    return;
  }

  if (url === '/memory/profile/set') {
    const bucket = getUserBucket(payload.uid);
    if (!bucket) {
      jsonResponse(res, 400, { error: 'uid required' });
      return;
    }
    const memoryVersion = payload.memoryVersion || bucket.profile?.memoryVersion || 'v4';
    const text = typeof payload.text === 'string' ? payload.text : bucket.profile?.text || '';
    bucket.profile = { memoryVersion, text };
    persistStore();
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (url === '/memory/nodes/list') {
    const bucket = getUserBucket(payload.uid);
    if (!bucket) {
      jsonResponse(res, 400, { error: 'uid required' });
      return;
    }
    const nodes = Object.values(bucket.nodes || {}).map((node) => ({
      ...node,
      vector: undefined,
    }));
    jsonResponse(res, 200, { nodes });
    return;
  }

  if (url === '/memory/node/upsert') {
    const bucket = getUserBucket(payload.uid);
    const node = payload.node || {};
    if (!bucket || !node) {
      jsonResponse(res, 400, { error: 'uid and node required' });
      return;
    }
    const id =
      node.id ||
      `mem_${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')}`;
    const createdAt = node.created_at || new Date().toISOString();
    const updatedAt = new Date().toISOString();
    const content = typeof node.content === 'string' ? node.content : '';
    const vector = embedText(content);
    bucket.nodes[id] = {
      ...node,
      id,
      content,
      created_at: createdAt,
      updated_at: updatedAt,
      vector,
    };
    persistStore();
    jsonResponse(res, 200, { node: { ...bucket.nodes[id], vector: undefined } });
    return;
  }

  if (url === '/memory/node/delete') {
    const bucket = getUserBucket(payload.uid);
    if (!bucket || !payload.nodeId) {
      jsonResponse(res, 400, { error: 'uid and nodeId required' });
      return;
    }
    delete bucket.nodes[payload.nodeId];
    persistStore();
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (url === '/memory/reset') {
    const bucket = getUserBucket(payload.uid);
    if (!bucket) {
      jsonResponse(res, 400, { error: 'uid required' });
      return;
    }
    bucket.profile = { memoryVersion: bucket.profile?.memoryVersion || 'v4', text: '' };
    bucket.nodes = {};
    persistStore();
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (url === '/memory/query') {
    const bucket = getUserBucket(payload.uid);
    if (!bucket) {
      jsonResponse(res, 400, { error: 'uid required' });
      return;
    }
    const query = typeof payload.query === 'string' ? payload.query : '';
    const topK = Math.min(Number(payload.topK || MAX_RESULTS), MAX_RESULTS);
    const qVec = embedText(query);
    const nodes = Object.values(bucket.nodes || {});
    let matches = [];
    if (nodes.length === 0 && bucket.profile?.text) {
      matches = [
        {
          id: 'profile',
          content: bucket.profile.text,
          score: 1,
        },
      ];
    } else {
      matches = nodes
        .map((node) => ({
          id: node.id,
          content: node.content,
          score: cosine(qVec, node.vector),
          node: { ...node, vector: undefined },
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    }
    jsonResponse(res, 200, { matches });
    return;
  }

  jsonResponse(res, 404, { error: 'Not found' });
};

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[memory-server] Unhandled error', err);
    jsonResponse(res, 500, { error: 'Internal server error' });
  });
});

server.listen(PORT, () => {
  console.log(`[memory-server] Listening on :${PORT}`);
});
