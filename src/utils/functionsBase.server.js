const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  return value.replace(/\/$/, '');
};

export const getFunctionsBaseUrl = () => {
  const configured = normalizeUrl(
    process.env.VITE_API_BASE_URL
    || process.env.VITE_PUBLIC_API_BASE_URL
    || process.env.API_BASE_URL
    || process.env.VITE_FUNCTIONS_BASE_URL
    || process.env.FUNCTIONS_BASE_URL,
  );
  if (configured) {
    return configured;
  }
  return '';
};

export const FUNCTIONS_BASE_URL = getFunctionsBaseUrl();

export default FUNCTIONS_BASE_URL;
