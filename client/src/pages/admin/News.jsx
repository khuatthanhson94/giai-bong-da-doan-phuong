import { useEffect, useState } from 'react';
import api from '../../api/client';
import RichTextEditor from '../../components/RichTextEditor';
import { getFullUrl } from '../../utils/url';
import { resizeImage } from '../../utils/imageResize';

export default function AdminNews() {
  const [news, setNews] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', image: '', video_url: '', published: 1 });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = () => api.get('/news/admin/all').then((data) => {
    setNews(data);
    setSelectedIds([]);
  });
  useEffect(() => { load(); }, []);

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} bài viết đã chọn?`)) return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/news/${id}`);
      }
      alert('Đã xóa thành công các bài viết được chọn.');
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa các bài viết.');
    }
  };

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
      // Resize to max 1200x800 for news cover image
      const resizedFile = await resizeImage(file, 1200, 800);
      const res = await api.upload(resizedFile);
      const url = res.url || `/uploads/${res.filename}`;
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      console.error('Failed to upload news cover image:', err);
      alert('Tải ảnh bìa thất bại: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">Quản lý tin tức</h1>
        <button onClick={() => {
          setShowForm(true);
          setEditId(null);
          setForm({ title: '', content: '', category: 'general', image: '', video_url: '', published: 1 });
        }} className="btn-primary text-sm py-2 px-4 self-center sm:self-auto">+ Thêm bài viết</button>
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

      {news.length > 0 && (
        <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-150">
          <input
            type="checkbox"
            checked={selectedIds.length === news.length}
            onChange={(e) => {
              if (e.target.checked) setSelectedIds(news.map(n => n.id));
              else setSelectedIds([]);
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          />
          <span className="text-xs font-semibold text-gray-600">Chọn tất cả bài viết</span>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 animate-fade-in">
          <span className="text-sm font-semibold text-red-700">
            Đang chọn <span className="font-bold">{selectedIds.length}</span> bài viết
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition duration-200"
          >
            🗑️ Xóa các mục đã chọn
          </button>
        </div>
      )}

      <div className="space-y-3">
        {news.map((n) => (
          <div key={n.id} className="card p-4 flex justify-between items-center gap-4 hover:border-cyan-150 duration-200">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={selectedIds.includes(n.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedIds([...selectedIds, n.id]);
                  else setSelectedIds(selectedIds.filter(id => id !== n.id));
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer flex-shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-800 truncate">{n.title}</h3>
                <p className="text-xs text-gray-400">{n.category} • {new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
            <div className="space-x-2 flex-shrink-0">
              <button onClick={() => { setForm(n); setEditId(n.id); setShowForm(true); }} className="text-primary text-sm font-semibold hover:underline">Sửa</button>
              <button onClick={async () => { if (confirm('Xóa?')) { await api.delete(`/news/${n.id}`); load(); } }} className="text-red-500 text-sm hover:underline">Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
