import { FUNCTIONS_BASE_URL } from '@/utils/functionsBase';

const API_KEY_STATUS_ENDPOINT = `${FUNCTIONS_BASE_URL}/api_key_status`;
const API_KEY_ROTATE_ENDPOINT = `${FUNCTIONS_BASE_URL}/api_key_rotate`;
const API_USAGE_ENDPOINT = `${FUNCTIONS_BASE_URL}/api_usage_logs`;
const PLAN_STATUS_ENDPOINT = `${FUNCTIONS_BASE_URL}/plan_status`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  || (typeof window !== 'undefined' ? window.location.origin : FUNCTIONS_BASE_URL);
const CHAT_ENDPOINT_OVERRIDE = import.meta.env.VITE_CHAT_API_URL?.replace(/\/$/, '');

async function handleJsonResponse(response: Response) {
  const text = await response.text();
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // Non-JSON response; fall through to error handling.
    }
  }
  if (!response.ok) {
    const message = parsed?.message || parsed?.error || text || 'Request failed';
    throw new Error(message);
  }
  return parsed;
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export async function fetchApiKeyStatus(token: string) {
  const response = await fetch(API_KEY_STATUS_ENDPOINT, {
    method: 'GET',
    headers: authHeaders(token),
  });
  return handleJsonResponse(response);
}

export async function rotateApiKey(token: string) {
  const response = await fetch(API_KEY_ROTATE_ENDPOINT, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  return handleJsonResponse(response);
}

export async function fetchApiUsageLogs(token: string) {
  const response = await fetch(API_USAGE_ENDPOINT, {
    method: 'GET',
    headers: authHeaders(token),
  });
  return handleJsonResponse(response);
}

export async function fetchPlanStatus(token: string) {
  const response = await fetch(PLAN_STATUS_ENDPOINT, {
    method: 'GET',
    headers: authHeaders(token),
  });
  return handleJsonResponse(response);
}

export const API_ENDPOINTS = {
  chat: CHAT_ENDPOINT_OVERRIDE || `${API_BASE_URL}/v1/chat/completions`,
};
