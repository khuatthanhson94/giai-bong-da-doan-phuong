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
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setName(s.name);
    setYear(s.year);
    setStatus(s.status);
    setLogo(s.logo || '');
    setBanner(s.banner || '');
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
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm font-medium border border-green-200">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{editId ? 'Chỉnh sửa Mùa giải' : 'Thêm Mùa giải mới'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên Mùa giải</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Mùa giải 2026"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
              <input
                type="number"
                required
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (Tùy chọn)</label>
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={logo}
                onChange={e => setLogo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner URL (Tùy chọn)</label>
              <input
                type="text"
                placeholder="https://example.com/banner.jpg"
                value={banner}
                onChange={e => setBanner(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark cursor-pointer transition"
              >
                {editId ? 'Cập nhật' : 'Thêm mới'}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">Đang tải danh sách mùa giải...</div>
          ) : seasons.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-500">Chưa có mùa giải nào được ghi nhận.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-700 text-sm font-semibold border-b">
                  <tr>
                    <th className="p-4">Tên Mùa giải</th>
                    <th className="p-4">Năm</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {seasons.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
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
    </div>
  );
}
