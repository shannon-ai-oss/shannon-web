const STORE_KEY = 'shannon:local-store';

let store = { docs: {} };
let loaded = false;
const listeners = new Set();

const loadStore = () => {
  if (loaded) return;
  loaded = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.docs) {
        store = { docs: parsed.docs };
      }
    }
  } catch (err) {
    console.warn('[localStore] Failed to load store', err);
  }
};

const saveStore = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('[localStore] Failed to save store', err);
  }
};

const cloneData = (value) => {
  if (!value) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

const isDirectChild = (docPath, collectionPath) => {
  if (!docPath.startsWith(`${collectionPath}/`)) return false;
  const suffix = docPath.slice(collectionPath.length + 1);
  return suffix && !suffix.includes('/');
};

const buildDocSnapshot = (docRef) => {
  loadStore();
  const data = store.docs[docRef.path];
  return {
    id: docRef.id,
    ref: docRef,
    exists: () => Boolean(data),
    data: () => cloneData(data),
  };
};

const applyConstraints = (docs, constraints) => {
  if (!constraints || constraints.length === 0) return docs;
  let working = [...docs];
  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      working = working.filter((doc) => {
        const value = doc.data?.[constraint.field];
        if (constraint.op === '==') {
          return value === constraint.value;
        }
        return true;
      });
    }
  }
  for (const constraint of constraints) {
    if (constraint.type === 'orderBy') {
      const { field, direction } = constraint;
      working.sort((a, b) => {
        const aValue = a.data?.[field];
        const bValue = b.data?.[field];
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return direction === 'desc' ? 1 : -1;
        if (bValue == null) return direction === 'desc' ? -1 : 1;
        if (aValue < bValue) return direction === 'desc' ? 1 : -1;
        if (aValue > bValue) return direction === 'desc' ? -1 : 1;
        return 0;
      });
    }
  }
  for (const constraint of constraints) {
    if (constraint.type === 'limit') {
      working = working.slice(0, constraint.limit);
    }
  }
  return working;
};

const buildQuerySnapshot = (ref) => {
  loadStore();
  const collectionPath = ref.type === 'query' ? ref.collection.path : ref.path;
  const constraints = ref.type === 'query' ? ref.constraints : [];
  const docs = Object.entries(store.docs)
    .filter(([path]) => isDirectChild(path, collectionPath))
    .map(([path, data]) => {
      const ref = buildDocRef(path);
      return {
        id: ref.id,
        ref,
        data: cloneData(data),
      };
    });
  const filtered = applyConstraints(docs, constraints);
  const snapshots = filtered.map((docItem) => ({
    id: docItem.id,
    ref: docItem.ref,
    exists: () => true,
    data: () => cloneData(docItem.data),
  }));
  return {
    docs: snapshots,
    size: snapshots.length,
    empty: snapshots.length === 0,
    forEach: (callback) => snapshots.forEach(callback),
  };
};

const notify = () => {
  for (const listener of listeners) {
    try {
      const snapshot = listener.ref.type === 'doc'
        ? buildDocSnapshot(listener.ref)
        : buildQuerySnapshot(listener.ref);
      listener.callback(snapshot);
    } catch (err) {
      console.warn('[localStore] Failed to notify listener', err);
    }
  }
};

export const serverTimestamp = () => new Date().toISOString();

const buildCollectionRef = (path) => {
  const segments = path.split('/').filter(Boolean);
  const id = segments[segments.length - 1] || null;
  let parent = null;
  if (segments.length > 1) {
    const parentDocPath = segments.slice(0, -1).join('/');
    parent = buildDocRef(parentDocPath);
  }
  return { type: 'collection', path, id, parent };
};

const buildDocRef = (path) => {
  const segments = path.split('/').filter(Boolean);
  const id = segments[segments.length - 1] || null;
  const parentPath = segments.slice(0, -1).join('/');
  const parent = parentPath ? buildCollectionRef(parentPath) : null;
  return { type: 'doc', path, id, parentPath, parent };
};

export const collection = (_db, ...segments) => buildCollectionRef(segments.join('/'));

export const doc = (_db, ...segments) => buildDocRef(segments.join('/'));

export const where = (field, op, value) => ({
  type: 'where',
  field,
  op,
  value,
});

export const orderBy = (field, direction = 'asc') => ({
  type: 'orderBy',
  field,
  direction,
});

export const limit = (value) => ({
  type: 'limit',
  limit: value,
});

export const query = (collectionRef, ...constraints) => ({
  type: 'query',
  collection: collectionRef,
  constraints,
});

export const addDoc = async (collectionRef, data) => {
  const id = randomId();
  const docRef = doc(null, collectionRef.path, id);
  await setDoc(docRef, data);
  return docRef;
};

export const setDoc = async (docRef, data, options = {}) => {
  loadStore();
  const existing = store.docs[docRef.path] || {};
  const next = options.merge ? { ...existing, ...data } : { ...data };
  store.docs[docRef.path] = next;
  saveStore();
  notify();
};

export const updateDoc = async (docRef, data) => {
  loadStore();
  const existing = store.docs[docRef.path] || {};
  store.docs[docRef.path] = { ...existing, ...data };
  saveStore();
  notify();
};

export const deleteDoc = async (docRef) => {
  loadStore();
  delete store.docs[docRef.path];
  saveStore();
  notify();
};

export const getDoc = async (docRef) => buildDocSnapshot(docRef);

export const getDocs = async (ref) => buildQuerySnapshot(ref.type === 'query' ? ref : ref);

export const onSnapshot = (ref, callback) => {
  const listener = { ref, callback };
  listeners.add(listener);
  try {
    const snapshot = ref.type === 'doc' ? buildDocSnapshot(ref) : buildQuerySnapshot(ref);
    callback(snapshot);
  } catch (err) {
    console.warn('[localStore] Initial snapshot failed', err);
  }
  return () => listeners.delete(listener);
};

export const writeBatch = () => {
  const ops = [];
  return {
    set: (ref, data, options) => ops.push({ type: 'set', ref, data, options }),
    update: (ref, data) => ops.push({ type: 'update', ref, data }),
    delete: (ref) => ops.push({ type: 'delete', ref }),
    commit: async () => {
      for (const op of ops) {
        if (op.type === 'set') {
          await setDoc(op.ref, op.data, op.options);
        } else if (op.type === 'update') {
          await updateDoc(op.ref, op.data);
        } else if (op.type === 'delete') {
          await deleteDoc(op.ref);
        }
      }
    },
  };
};

export const Timestamp = {
  now: () => new Date(),
};
