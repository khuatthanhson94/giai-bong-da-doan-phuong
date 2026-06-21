import { useEffect, useState } from 'react';
import { resizeImage } from '../../utils/imageResize';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [form, setForm] = useState({});
  const [logoPreview, setLogoPreview] = useState('');
  const [unionLogoPreview, setUnionLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [message, setMessage] = useState('');
  const { changePassword } = useAuth();

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return `${window.location.origin}/uploads/${url}`;
  };

  // Upload image file with client‑side resize and update form state
  const handleFileUpload = async (key, file) => {
    if (!file) return;
    // Resize to reasonable dimensions (400×400 for logo, 1200×300 for banner)
    const maxWidth = key === 'banner_url' ? 1200 : 400;
    const maxHeight = key === 'banner_url' ? 300 : 400;
    const resizedBlob = await resizeImage(file, maxWidth, maxHeight);
    const res = await api.upload(resizedBlob);
    const url = res.url || `/uploads/${res.filename}`;
    setForm(prev => ({ ...prev, [key]: url }));
    if (key === 'logo_url') setLogoPreview(url);
    if (key === 'union_logo') setUnionLogoPreview(url);
    if (key === 'banner_url') setBannerPreview(url);
  };

  useEffect(() => {
    api.get('/settings').then((data) => {
      setSettings(data);
      setForm(data);
      setLogoPreview(data.logo_url || '');
      setUnionLogoPreview(data.union_logo || '');
      setBannerPreview(data.banner_url || '');
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await api.put('/settings', form);
    setMessage('Đã lưu cài đặt');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setMessage('Đổi mật khẩu thành công');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setMessage(err.message);
    }
  };

  const fields = [
    { key: 'union_name', label: 'Tên Đoàn phường (VD: Đoàn phường Tùng Thiện)' },
    { key: 'tournament_name_short', label: 'Tên giải đấu viết ngắn (VD: Giải Bóng đá TN)' },
    { key: 'tournament_name', label: 'Tên giải đấu đầy đủ' },
    { key: 'slogan', label: 'Khẩu hiệu' },
    { key: 'about', label: 'Giới thiệu (HTML)' },
    { key: 'contact_phone', label: 'Điện thoại' },
    { key: 'contact_email', label: 'Email' },
    { key: 'contact_address', label: 'Địa chỉ' },
    { key: 'livestream_url', label: 'Link livestream' },
    { key: 'num_teams', label: 'Số đội tham gia' },
    { key: 'num_groups', label: 'Số bảng chia' },
    { key: 'union_logo', label: 'Logo Đoàn phường' },
    { key: 'logo_url', label: 'URL Logo Giải Đấu' },
    { key: 'banner_url', label: 'URL Banner Giải Đấu' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Cài đặt giải đấu</h1>
      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{message}</div>}

      <form onSubmit={handleSave} className="card p-6 mb-8 space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key}>
            {key === 'logo_url' || key === 'banner_url' || key === 'union_logo' ? (
              <div>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input className="input-field" type="file" accept="image/*" onChange={e => handleFileUpload(key, e.target.files[0])} />
                {key === 'logo_url' && logoPreview && (
                  <img src={getFullUrl(logoPreview)} alt="Logo preview" className="mt-2 w-24 h-24 object-cover" />
                )}
                {key === 'union_logo' && unionLogoPreview && (
                  <img src={getFullUrl(unionLogoPreview)} alt="Union Logo preview" className="mt-2 w-24 h-24 object-cover" />
                )}
                {key === 'banner_url' && bannerPreview && (
                  <img src={getFullUrl(bannerPreview)} alt="Banner preview" className="mt-2 w-full h-48 object-cover banner-image" />
                )}
              </div>
            ) : key === 'about' ? (
              <div>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <textarea className="input-field" rows={4} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input className="input-field" value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            )}
          </div>
        ))}
        <button type="submit" className="btn-primary text-sm">Lưu cài đặt</button>
      </form>

      <form onSubmit={handleChangePassword} className="card p-6 space-y-4">
        <h3 className="font-bold">Đổi mật khẩu</h3>
        <input type="password" className="input-field" placeholder="Mật khẩu hiện tại" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
        <input type="password" className="input-field" placeholder="Mật khẩu mới" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
        <button type="submit" className="btn-outline text-sm">Đổi mật khẩu</button>
      </form>
    </div>
  );
}
