export const getFullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const API_BASE = (
    import.meta.env.VITE_API_URL || ''
  ).replace(/\/$/, '');
  const baseUrl = API_BASE || window.location.origin;
  const cleanUrl = url.startsWith('/') ? url : `/uploads/${url}`;
  return `${baseUrl}${cleanUrl}`;
};
