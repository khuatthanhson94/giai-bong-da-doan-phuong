export const getFullUrl = (url, width) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    if (url.includes('res.cloudinary.com') && !url.includes('/f_auto')) {
      const transform = width ? `f_auto,q_auto,w_${width}` : 'f_auto,q_auto';
      return url.replace('/image/upload/', `/image/upload/${transform}/`);
    }
    return url;
  }
  const API_BASE = (
    import.meta.env.VITE_API_URL || ''
  ).replace(/\/$/, '');
  const baseUrl = API_BASE || window.location.origin;
  const cleanUrl = url.startsWith('/') ? url : `/uploads/${url}`;
  return `${baseUrl}${cleanUrl}`;
};
