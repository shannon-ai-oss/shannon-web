import { getAuth, googleProvider } from '@/lib/localAuth';
import { storage } from '@/lib/localStorageClient';

export const auth = getAuth();
export const db = {};
export const functions = {};
export { storage, googleProvider };

export default {
  auth,
  db,
  functions,
  storage,
  googleProvider,
};
