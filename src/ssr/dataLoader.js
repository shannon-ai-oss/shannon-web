const normalizeShareSlug = (url) => {
  const match = /^\/share\/(.+)$/.exec(url.replace(/\/?$/, ''));
  return match ? match[1] : null;
};

const getApiBase = () =>
  process.env.VITE_API_BASE_URL
  || process.env.VITE_PUBLIC_API_BASE_URL
  || '';

const buildCallableUrl = (name) => {
  const base = getApiBase();
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/${name}`;
};

const fetchSharedChat = async (slug) => {
  const url = buildCallableUrl('getShareBySlug');
  if (!url) return null;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json().catch(() => null);
  return data || null;
};

export async function loadDataForUrl({ url, initialData = {} }) {
  const next = { ...initialData };
  if (!url) {
    return next;
  }

  const shareSlug = normalizeShareSlug(url);
  if (shareSlug) {
    if (!next.share || next.share.slug !== shareSlug) {
      next.share = await fetchSharedChat(shareSlug);
    }
  }
  return next;
}
