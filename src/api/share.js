import { httpsCallable } from '@/lib/localFunctions';
import { functions } from '@/config/backend';
const callableCache = new Map();

const getCallable = (name) => {
  if (!callableCache.has(name)) {
    callableCache.set(name, httpsCallable(functions, name));
  }
  return callableCache.get(name);
};

const mapHttpsErrorToStatus = (error) => {
  if (!error || typeof error !== 'object') {
    return { status: 500, message: 'Unknown error' };
  }
  const code = error.code || error.error?.code;
  const message = error.message || error.error?.message || 'Request failed';
  switch (code) {
    case 'unauthenticated':
      return { status: 401, message };
    case 'permission-denied':
      return { status: 403, message };
    case 'not-found':
      return { status: 404, message };
    case 'invalid-argument':
      return { status: 400, message };
    default:
      return { status: 500, message };
  }
};

const wrapCallable = async (callableName, payload) => {
  try {
    const callable = getCallable(callableName);
    const response = await callable(payload);
    if (!response?.data) {
      throw new Error('Empty response from share service');
    }
    return response.data;
  } catch (err) {
    const { status, message } = mapHttpsErrorToStatus(err);
    const wrapped = new Error(message || 'Request failed');
    wrapped.status = status;
    wrapped.code = err.code;
    throw wrapped;
  }
};

export const fetchChatShareSettings = async (chatId) => {
  return await wrapCallable('getShareForChat', { chatId });
};

export const upsertChatShare = async (chatId, visibility) => {
  return await wrapCallable('upsertShare', { chatId, visibility });
};

export const fetchSharedChat = (slug) =>
  wrapCallable('getShareBySlug', { slug });

export default {
  fetchChatShareSettings,
  upsertChatShare,
  fetchSharedChat,
};
