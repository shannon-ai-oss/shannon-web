const getBaseUrl = () => {
  const configured =
    import.meta.env?.VITE_MEMORY_API_URL ||
    import.meta.env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_PUBLIC_API_BASE_URL ||
    '';
  return configured ? configured.replace(/\/$/, '') : '';
};

export const MEMORY_API_BASE_URL = getBaseUrl();

export const memoryApiFetch = async (path, payload) => {
  const base = MEMORY_API_BASE_URL;
  if (!base) {
    return null;
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error || text || 'Memory request failed';
    throw new Error(message);
  }
  return data;
};

export default {
  MEMORY_API_BASE_URL,
  memoryApiFetch,
};
