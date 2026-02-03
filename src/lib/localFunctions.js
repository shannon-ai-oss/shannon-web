const buildUrl = (name) => {
  const base = import.meta.env?.VITE_API_BASE_URL
    || import.meta.env?.VITE_PUBLIC_API_BASE_URL
    || '';
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/${name}`;
};

export const getFunctions = () => ({});

export const httpsCallable = (_functions, name) => async (payload) => {
  const url = buildUrl(name);
  if (!url) {
    throw new Error('API base URL not configured');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return { data };
};
