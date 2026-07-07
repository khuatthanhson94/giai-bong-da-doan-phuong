import { useEffect, useState } from 'react';
import api from '../../api/client';
import RichTextEditor from '../../components/RichTextEditor';
import { getFullUrl } from '../../utils/url';

export default function AdminNews() {
  const [news, setNews] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', image: '', video_url: '', published: 1 });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/news/admin/all').then(setNews);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) await api.put(`/news/${editId}`, form);
    else await api.post('/news', form);
    setShowForm(false);
    setEditId(null);
    setForm({ title: '', content: '', category: 'general', image: '', video_url: '', published: 1 });
    load();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.upload(file);
      const url = res.url || `/uploads/${res.filename}`;
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      console.error('Failed to upload news cover image:', err);
      alert('Tải ảnh bìa thất bại: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Quản lý tin tức</h1>
        <button onClick={() => {
          setShowForm(true);
          setEditId(null);
          setForm({ title: '', content: '', category: 'general', image: '', video_url: '', published: 1 });
        }} className="btn-primary text-sm">+ Thêm bài viết</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
          <label className="form-label font-semibold">Tiêu đề bài viết</label>
          <input className="input-field" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          
          <label className="form-label font-semibold">Chuyên mục</label>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="general">Chung</option>
            <option value="khai-mac">Khai mạc</option>
            <option value="vong-dau">Vòng đấu</option>
            <option value="tong-ket">Tổng kết</option>
          </select>
          
          <div className="space-y-1">
            <label className="form-label font-semibold text-gray-700">Nội dung bài viết</label>
            <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} />
          </div>
          
          <label className="form-label font-semibold">Ảnh đại diện tin bài (Không bắt buộc)</label>
          <input className="input-field" placeholder="URL ảnh" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="mt-1 block text-sm" />
          {form.image && (
            <img src={getFullUrl(form.image)} alt="Cover preview" className="mt-2 w-32 h-20 object-cover rounded border" />
          )}
          
          <label className="form-label font-semibold">URL Video Youtube (Nhúng - Không bắt buộc)</label>
          <input className="input-field" placeholder="URL video (YouTube embed)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
          
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm">Lưu</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Hủy</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {news.map((n) => (
          <div key={n.id} className="card p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{n.title}</h3>
              <p className="text-xs text-gray-400">{n.category} • {new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => { setForm(n); setEditId(n.id); setShowForm(true); }} className="text-primary text-sm">Sửa</button>
              <button onClick={async () => { if (confirm('Xóa?')) { await api.delete(`/news/${n.id}`); load(); } }} className="text-red-500 text-sm">Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
