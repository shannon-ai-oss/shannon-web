let cachedBaseUrl = null;

const computeFunctionsBase = () => {
  const configured = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return '';
};

export const getFunctionsBaseUrl = () => {
  if (!cachedBaseUrl) {
    cachedBaseUrl = computeFunctionsBase();
  }
  return cachedBaseUrl;
};

export const FUNCTIONS_BASE_URL = getFunctionsBaseUrl();

export default FUNCTIONS_BASE_URL;
