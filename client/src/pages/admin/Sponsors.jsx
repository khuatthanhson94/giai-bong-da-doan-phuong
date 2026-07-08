import { useEffect, useState, useRef } from 'react';
import api from '../../api/client';
import { getFullUrl } from '../../utils/url';

const TIERS = [
  { value: 'diamond', label: '💎 Kim Cương' },
  { value: 'gold', label: '🥇 Vàng' },
  { value: 'silver', label: '🥈 Bạc' },
  { value: 'bronze', label: '🥉 Đồng' },
  { value: 'general', label: '🤝 Đồng hành' }
];

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [form, setForm] = useState({
    name: '',
    logo: '',
    link: '',
    tier: 'general',
    order_index: 0
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [settings, setSettings] = useState({});
  const fileInputRef = useRef(null);

  const load = () => {
    api.get('/sponsors').then(setSponsors);
  };

  useEffect(() => {
    load();
    api.get('/settings').then(setSettings).catch(console.error);
  }, []);

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.url || `/uploads/${res.filename}`;
      setForm((prev) => ({ ...prev, logo: url }));
      setLogoPreview(url);
    } catch (err) {
      alert('Tải ảnh thất bại: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/sponsors/${editId}`, form);
      } else {
        await api.post('/sponsors', form);
      }
      load();
      setShowForm(false);
      setForm({ name: '', logo: '', link: '', tier: 'general', order_index: 0 });
      setLogoPreview('');
      setEditId(null);
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi lưu nhà tài trợ.');
    }
  };

  const handleEdit = (sponsor) => {
    setEditId(sponsor.id);
    setForm({
      name: sponsor.name,
      logo: sponsor.logo || '',
      link: sponsor.link || '',
      tier: sponsor.tier || 'general',
      order_index: sponsor.order_index || 0
    });
    setLogoPreview(sponsor.logo || '');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhà tài trợ này?')) return;
    try {
      await api.delete(`/sponsors/${id}`);
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa nhà tài trợ.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">Quản lý Nhà tài trợ</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm({ name: '', logo: '', link: '', tier: 'general', order_index: 0 });
            setLogoPreview('');
          }}
          className="btn-primary text-sm py-2 px-4 self-center sm:self-auto"
        >
          + Thêm nhà tài trợ
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-6 bg-white shadow-lg rounded-2xl border border-gray-100 animate-fade-in">
          <h2 className="text-lg font-bold text-primary border-b pb-2">
            {editId ? '📝 Chỉnh sửa Nhà tài trợ' : '➕ Thêm Nhà tài trợ mới'}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Tên nhà tài trợ */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Tên nhà tài trợ <span className="text-red-500">*</span></label>
              <input
                className="input-field w-full max-w-full"
                placeholder="Nhập tên đơn vị tài trợ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* Phân hạng */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Hạng tài trợ</label>
              <select
                className="input-field w-full max-w-full"
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
              >
                {TIERS.map(tier => (
                  <option key={tier.value} value={tier.value}>{tier.label}</option>
                ))}
              </select>
            </div>

            {/* Đường dẫn liên kết */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Đường dẫn Website / Facebook</label>
              <input
                className="input-field w-full max-w-full"
                placeholder="https://example.com"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
            </div>

            {/* Số thứ tự sắp xếp */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Thứ tự hiển thị (Càng nhỏ hiển thị trước)</label>
              <input
                type="number"
                className="input-field w-full max-w-full"
                placeholder="0"
                value={form.order_index}
                onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="grid md:grid-cols-2 gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Logo nhà tài trợ</label>
              <input
                className="input-field bg-white w-full max-w-full"
                placeholder="Đường dẫn URL ảnh logo"
                value={form.logo}
                onChange={(e) => {
                  setForm({ ...form, logo: e.target.value });
                  setLogoPreview(e.target.value);
                }}
              />
              <div className="mt-2">
                <span className="text-xs text-gray-400 block mb-1">Hoặc tải file ảnh lên trực tiếp:</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  ref={fileInputRef}
                  className="text-xs text-gray-550"
                />
              </div>
            </div>

            <div className="flex items-center justify-center p-2">
              {logoPreview || settings?.logo_url ? (
                <div className="text-center">
                  <img
                    src={logoPreview ? getFullUrl(logoPreview) : getFullUrl(settings?.logo_url)}
                    alt="Logo preview"
                    className="w-24 h-24 object-contain rounded-lg border bg-white p-1 shadow-sm mx-auto"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {logoPreview ? 'Ảnh xem trước' : 'Mặc định (Logo giải đấu)'}
                  </span>
                </div>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center bg-white p-2">
                  Chưa có logo
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-5 py-2">
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary text-sm px-6 py-2 shadow-md shadow-blue-500/10">
              {editId ? 'Cập nhật' : 'Lưu lại'}
            </button>
          </div>
        </form>
      )}

      {/* Sponsors list table */}
      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              <th className="w-16 text-center">STT</th>
              <th>Nhà tài trợ</th>
              <th>Hạng</th>
              <th>Thứ tự</th>
              <th>Liên kết</th>
              <th className="w-32 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.map((s, idx) => {
              const tierLabel = TIERS.find(t => t.value === s.tier)?.label || s.tier;
              return (
                <tr key={s.id}>
                  <td className="text-center text-gray-500 font-medium">{idx + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      {s.logo || settings?.logo_url ? (
                        <img
                          src={s.logo ? getFullUrl(s.logo) : getFullUrl(settings?.logo_url)}
                          alt={s.name}
                          className="w-12 h-12 object-contain rounded border bg-white p-0.5 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-semibold flex-shrink-0">
                          No Logo
                        </div>
                      )}
                      <span className="font-semibold text-gray-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="font-medium text-gray-700">{tierLabel}</td>
                  <td className="font-mono text-gray-600">{s.order_index}</td>
                  <td>
                    {s.link ? (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-xs block text-xs"
                      >
                        {s.link}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Chưa có liên kết</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="text-primary text-sm hover:underline font-medium"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-500 text-sm hover:underline font-medium"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sponsors.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-gray-400 py-8 italic">
                  Chưa có nhà tài trợ nào được thêm vào danh sách.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
