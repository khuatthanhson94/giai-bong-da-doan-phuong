const API_BASE = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '');
const API = `${API_BASE}/api`;

function getToken() {
  return localStorage.getItem('token');
}

const apiCache = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds short-lived cache for GET requests

export function clearApiCache() {
  apiCache.clear();
}

async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  // Clear cache when performing any write action (POST/PUT/DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    clearApiCache();
  }

  const headers = { ...options.headers };
  const isFormData = options.body instanceof FormData;

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Automatically append tournament_id to URL query if present in localStorage
  let finalUrl = url;
  const tId = localStorage.getItem("v3_selected_tournament_id");
  if (tId && !url.includes("tournament_id=")) {
    const separator = url.includes("?") ? "&" : "?";
    // Avoid attaching to login/register, seasons listing, or absolute urls
    if (!url.startsWith("http") && !url.includes("/auth/login") && !url.includes("/auth/register") && url !== "/seasons" && !url.startsWith("/tournaments")) {
      finalUrl = `${url}${separator}tournament_id=${tId}`;
    }
  }

  // Check in-memory cache for GET requests
  const cacheKey = `${method}:${finalUrl}`;
  if (method === 'GET' && !options.noCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  // Automatically inject tournament_id to POST/PUT request bodies
  let bodyContent = options.body;
  if (tId && ['POST', 'PUT'].includes(method) && !isFormData) {
    if (options.body && typeof options.body === 'object') {
      const updatedBody = { ...options.body };
      if (!updatedBody.hasOwnProperty('tournament_id')) {
        updatedBody.tournament_id = Number(tId);
      }
      bodyContent = updatedBody;
    }
  }

  const fetchOptions = {
    ...options,
    headers,
    body: isFormData ? bodyContent : (bodyContent !== undefined ? JSON.stringify(bodyContent) : undefined)
  };

  const res = await fetch(API + finalUrl, fetchOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');

  if (method === 'GET') {
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  return data;
}

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body }),
  put: (url, body, options) => request(url, { ...options, method: 'PUT', body }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
  upload: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/upload', { method: 'POST', body: fd, headers: {} });
  },
  clearCache: clearApiCache
};

export default api;
