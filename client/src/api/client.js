const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const headers = { ...options.headers };
  const isFormData = options.body instanceof FormData;

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOptions = {
    ...options,
    headers,
    body: isFormData ? options.body : JSON.stringify(options.body)
  };

  const res = await fetch(API + url, fetchOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/upload', { method: 'POST', body: fd, headers: {} });
  },
};

export default api;
