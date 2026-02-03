import { buildUrl } from './client';
import { FUNCTIONS_BASE_URL } from '@/utils/functionsBase';

async function handleRepairResponse(res) {
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Repair failed: ${res.status} ${text}`.trim());
  }

  try {
    return JSON.parse(text || '{}');
  } catch (err) {
    throw new Error('Repair response was not valid JSON');
  }
}

export async function requestRepair(token, { kind, snippet, prompt, uid, error }) {
  let endpoint = '/repair';
  let payload = { kind, snippet, prompt };

  if (kind === 'mermaid') {
    if (!uid) {
      throw new Error('User ID required for Mermaid repair.');
    }
    endpoint = '/repairMermaid';
    payload = {
      uid,
      snippet,
      prompt,
      error,
    };
  } else if (uid) {
    payload = { ...payload, uid };
  }

  const resolvedEndpoint = (() => {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    if (endpoint === '/repairMermaid') {
      return `${FUNCTIONS_BASE_URL}${endpoint}`;
    }
    return buildUrl(endpoint);
  })();

  const response = await fetch(resolvedEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return handleRepairResponse(response);
}
