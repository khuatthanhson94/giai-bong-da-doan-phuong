import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function Seasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('active');
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [showForm, setShowForm] = useState(false);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const baseUrl = API_BASE || window.location.origin;
    const cleanUrl = url.startsWith('/') ? url : `/uploads/${url}`;
    return `${baseUrl}${cleanUrl}`;
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setError('');
      const res = await api.post('/upload', formData);
      setLogo(res.url);
    } catch (err) {
      setError('Tải logo lên thất bại: ' + err.message);
    }
  };

  const handleUploadBanner = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setError('');
      const res = await api.post('/upload', formData);
      setBanner(res.url);
    } catch (err) {
      setError('Tải banner lên thất bại: ' + err.message);
    }
  };

  const loadSeasons = () => {
    setLoading(true);
    api.get('/seasons')
      .then(setSeasons)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setYear(new Date().getFullYear());
    setStatus('active');
    setLogo('');
    setBanner('');
    setShowForm(false);
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setName(s.name);
    setYear(s.year);
    setStatus(s.status);
    setLogo(s.logo || '');
    setBanner(s.banner || '');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const body = { name, year: Number(year), status, logo, banner };
    try {
      if (editId) {
        await api.put(`/seasons/${editId}`, body);
        setSuccess('Cập nhật mùa giải thành công!');
      } else {
        await api.post('/seasons', body);
        setSuccess('Tạo mùa giải mới thành công!');
      }
      resetForm();
      loadSeasons();
      // Reload page contexts
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn đưa mùa giải này vào thùng rác? Tất cả các giải đấu con cũng sẽ tạm thời bị ẩn.')) return;
    setError('');
    setSuccess('');

    try {
      await api.delete(`/seasons/${id}`);
      setSuccess('Đã đưa mùa giải vào thùng rác!');
      loadSeasons();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Mùa giải</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các chuỗi thời gian tổ chức các giải đấu (Ví dụ: Mùa giải 2026)</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 shadow-md"
        >
          ➕ Thêm mùa giải mới
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm font-medium border border-green-200">{success}</div>}

      {/* Form Popup Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 select-none">
              <h3 className="font-extrabold text-gray-800 text-base">
                {editId ? '📝 Chỉnh sửa Mùa giải' : '➕ Thêm Mùa giải mới'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Mùa giải <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Mùa giải 2026"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Năm <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Logo Mùa giải (Tùy chọn)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Đường dẫn logo hoặc tải lên..."
                    value={logo}
                    onChange={e => setLogo(e.target.value)}
                    className="input-field flex-1"
                  />
                  <label className="bg-gray-150 hover:bg-gray-200 border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer select-none">
                    Tải lên
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  </label>
                </div>
                {logo && (
                  <img src={getFullUrl(logo)} alt="Logo Preview" className="w-16 h-16 object-contain border rounded-xl mt-2 p-1 bg-white" />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Banner Mùa giải (Tùy chọn)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Đường dẫn banner hoặc tải lên..."
                    value={banner}
                    onChange={e => setBanner(e.target.value)}
                    className="input-field flex-1"
                  />
                  <label className="bg-gray-150 hover:bg-gray-200 border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer select-none">
                    Tải lên
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadBanner} />
                  </label>
                </div>
                {banner && (
                  <img src={getFullUrl(banner)} alt="Banner Preview" className="w-32 h-16 object-cover border rounded-xl mt-2 p-1 bg-white" />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-55 select-none">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-5 py-2">
                Hủy bỏ
              </button>
              <button type="submit" className="btn-primary text-sm px-6 py-2 shadow-md">
                {editId ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
          {loading ? (
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">Đang tải danh sách mùa giải...</div>
          ) : seasons.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">Chưa có mùa giải nào được ghi nhận.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-700 text-sm font-semibold border-b">
                  <tr>
                    <th className="p-4 w-16 text-center">STT</th>
                    <th className="p-4">Tên Mùa giải</th>
                    <th className="p-4">Năm</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {seasons.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 text-center text-gray-500 font-medium">{idx + 1}</td>
                      <td className="p-4 font-semibold text-gray-800">{s.name}</td>
                      <td className="p-4 text-gray-600">{s.year}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {s.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(s)}
                          className="text-primary hover:text-primary-dark font-semibold transition"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-red-500 hover:text-red-700 font-semibold transition"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
