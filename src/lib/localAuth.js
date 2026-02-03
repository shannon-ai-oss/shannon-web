const USERS_KEY = 'shannon:local-auth:users';
const SESSION_KEY = 'shannon:local-auth:session';

const listeners = new Set();

const loadUsers = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveUsers = (users) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const loadSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (user) => {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

const createToken = (uid) => `local-${uid}`;

const hydrateUser = (record) => {
  if (!record) return null;
  return {
    uid: record.uid,
    email: record.email,
    displayName: record.displayName || record.email?.split('@')[0] || 'User',
    photoURL: record.photoURL || null,
    emailVerified: true,
    getIdToken: async () => createToken(record.uid),
    getIdTokenResult: async () => ({ claims: {} }),
  };
};

const auth = {
  currentUser: hydrateUser(loadSession()),
};

const notify = () => {
  for (const callback of listeners) {
    callback(auth.currentUser);
  }
};

export const getAuth = () => auth;

export const onAuthStateChanged = (_auth, callback) => {
  listeners.add(callback);
  callback(auth.currentUser);
  return () => listeners.delete(callback);
};

export const signInWithEmailAndPassword = async (_auth, email, password) => {
  const users = loadUsers();
  const record = users[email];
  if (!record || record.password !== password) {
    throw new Error('Invalid credentials');
  }
  auth.currentUser = hydrateUser(record);
  saveSession(record);
  notify();
  return { user: auth.currentUser };
};

export const createUserWithEmailAndPassword = async (_auth, email, password) => {
  const users = loadUsers();
  if (users[email]) {
    throw new Error('Account already exists');
  }
  const record = {
    uid: `user_${Math.random().toString(36).slice(2, 10)}`,
    email,
    password,
    displayName: email?.split('@')[0] || 'User',
    photoURL: null,
  };
  users[email] = record;
  saveUsers(users);
  auth.currentUser = hydrateUser(record);
  saveSession(record);
  notify();
  return { user: auth.currentUser };
};

export const signInWithPopup = async (_auth, _provider) => {
  const email = `guest_${Math.random().toString(36).slice(2, 8)}@local.shannon`;
  const record = {
    uid: `user_${Math.random().toString(36).slice(2, 10)}`,
    email,
    password: 'oauth',
    displayName: 'Guest',
    photoURL: null,
  };
  const users = loadUsers();
  users[email] = record;
  saveUsers(users);
  auth.currentUser = hydrateUser(record);
  saveSession(record);
  notify();
  return { user: auth.currentUser };
};

export const signOut = async () => {
  auth.currentUser = null;
  saveSession(null);
  notify();
};

export const sendPasswordResetEmail = async () => ({ ok: true });

export const GoogleAuthProvider = function GoogleAuthProvider() {};

export const googleProvider = new GoogleAuthProvider();
