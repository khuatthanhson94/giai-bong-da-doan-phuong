import { useEffect, useState } from 'react';
import api from '../../api/client';

import { getFullUrl } from '../../utils/url';

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', image_url: '', video_url: '', album: 'Chung', type: 'image' });
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/gallery').then(setItems);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/gallery', form);
    setForm({ title: '', image_url: '', video_url: '', album: 'Chung', type: 'image' });
    setShowForm(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">Quản lý thư viện ảnh</h1>
        <button
          onClick={() => {
            setForm({ title: '', image_url: '', video_url: '', album: 'Chung', type: 'image' });
            setShowForm(true);
          }}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 shadow self-center sm:self-auto"
        >
          ➕ Thêm hình ảnh / Video
        </button>
      </div>

      {/* Form Popup Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-fade-in text-left">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-55 select-none">
              <h3 className="font-extrabold text-gray-800 text-base">
                ➕ Thêm ảnh / video mới vào Thư viện
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="form-label font-semibold text-gray-700">Tiêu đề <span className="text-red-500">*</span></label>
                  <input className="input-field" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="form-label font-semibold text-gray-700">Album</label>
                  <input className="input-field" placeholder="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="form-label font-semibold text-gray-700">Loại Media</label>
                  <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="image">Hình ảnh</option>
                    <option value="video">Video Clip</option>
                  </select>
                </div>
                <div className="space-y-1">
                  {form.type === 'image' ? (
                    <>
                      <label className="form-label font-semibold text-gray-700">Tải tệp tin ảnh</label>
                      <input type="file" accept="image/*" onChange={handleUpload} className="text-xs text-gray-500 mt-1.5" />
                    </>
                  ) : (
                    <>
                      <label className="form-label font-semibold text-gray-700">Đường dẫn Video (Youtube/Embed) <span className="text-red-500">*</span></label>
                      <input className="input-field" placeholder="URL video" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} required={form.type === 'video'} />
                    </>
                  )}
                </div>
              </div>

              {form.type === 'image' && (
                <div className="space-y-1">
                  <label className="form-label font-semibold text-gray-700">Hoặc điền URL ảnh trực tiếp</label>
                  <input className="input-field" placeholder="URL ảnh" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                  {form.image_url && (
                    <div className="mt-2 text-center">
                      <img src={getFullUrl(form.image_url)} alt="Preview" className="max-h-32 object-contain rounded border mx-auto bg-gray-50 p-1" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-55 select-none">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-5 py-2">
                Hủy bỏ
              </button>
              <button type="submit" className="btn-primary text-sm px-6 py-2 shadow-md">
                Lưu lại
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card p-3">
            {item.image_url && <img src={getFullUrl(item.image_url)} alt="" className="w-full aspect-square object-cover rounded-lg mb-2" />}
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
