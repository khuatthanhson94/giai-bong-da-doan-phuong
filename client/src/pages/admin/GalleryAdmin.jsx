import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', image_url: '', video_url: '', album: 'Chung', type: 'image' });

  const load = () => api.get('/gallery').then(setItems);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/gallery', form);
    setForm({ title: '', image_url: '', video_url: '', album: 'Chung', type: 'image' });
    load();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await api.upload(file);
    setForm({ ...form, image_url: url, type: 'image' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Quản lý thư viện ảnh</h1>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-2 gap-4">
        <input className="input-field" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input-field" placeholder="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} />
        <input className="input-field" placeholder="URL ảnh" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <input type="file" accept="image/*" onChange={handleUpload} className="input-field" />
        <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="image">Ảnh</option>
          <option value="video">Video</option>
        </select>
        <input className="input-field" placeholder="URL video" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
        <button type="submit" className="btn-primary text-sm md:col-span-2">Upload / Thêm</button>
      </form>

      <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card p-3">
            {item.image_url && <img src={item.image_url} alt="" className="w-full aspect-square object-cover rounded-lg mb-2" />}
            <p className="text-sm font-medium truncate">{item.title}</p>
            <button
              onClick={async () => { if (confirm('Xóa?')) { await api.delete(`/gallery/${item.id}`); load(); } }}
              className="text-red-500 text-xs mt-1"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
