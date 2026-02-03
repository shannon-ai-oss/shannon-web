import { httpsCallable } from '@/lib/localFunctions';
import { functions } from '@/config/backend';

const callables = new Map();

const getCallable = (name) => {
  if (!callables.has(name)) {
    callables.set(name, httpsCallable(functions, name));
  }
  return callables.get(name);
};

export async function createSessionCookie(idToken) {
  if (!idToken) {
    throw new Error('idToken required');
  }
  const callable = getCallable('authCreateSessionCookie');
  await callable({ idToken });
}

export async function clearSessionCookie() {
  const callable = getCallable('authClearSessionCookie');
  await callable();
}

export default {
  createSessionCookie,
  clearSessionCookie,
};
