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
  const { user, changePassword } = useAuth();

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const baseUrl = API_BASE || window.location.origin;
    const cleanUrl = url.startsWith('/') ? url : `/uploads/${url}`;
    return `${baseUrl}${cleanUrl}`;
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
    if (user && user.role !== 'team') {
      api.get('/settings').then((data) => {
        setSettings(data);
        setForm(data);
        setLogoPreview(data.logo_url || '');
        setUnionLogoPreview(data.union_logo || '');
        setBannerPreview(data.banner_url || '');
      });
    }
  }, [user]);

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

  const [migrateStatus, setMigrateStatus] = useState(null); // { cloudinaryConfigured, localImagesCount }
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  useEffect(() => {
    api.get('/admin/migrate-uploads/status').then(setMigrateStatus).catch(() => {});
  }, []);

  const handleMigrateUploads = async () => {
    if (!window.confirm(`Bạn sắp migrate ${migrateStatus?.localImagesCount || 0} ảnh từ Render disk lên Cloudinary CDN. Tiếp tục?`)) return;
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await api.post('/admin/migrate-uploads', {});
      setMigrateResult({ success: true, ...res });
      // Refresh status
      const status = await api.get('/admin/migrate-uploads/status');
      setMigrateStatus(status);
    } catch (err) {
      setMigrateResult({ success: false, message: err.message });
    } finally {
      setMigrating(false);
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
    { key: 'feature_1_icon', label: 'Tính năng 1: Icon (Emoji / Biểu tượng)' },
    { key: 'feature_1_title', label: 'Tính năng 1: Tiêu đề' },
    { key: 'feature_1_desc', label: 'Tính năng 1: Mô tả ngắn' },
    { key: 'feature_2_icon', label: 'Tính năng 2: Icon (Emoji / Biểu tượng)' },
    { key: 'feature_2_title', label: 'Tính năng 2: Tiêu đề' },
    { key: 'feature_2_desc', label: 'Tính năng 2: Mô tả ngắn' },
    { key: 'feature_3_icon', label: 'Tính năng 3: Icon (Emoji / Biểu tượng)' },
    { key: 'feature_3_title', label: 'Tính năng 3: Tiêu đề' },
    { key: 'feature_3_desc', label: 'Tính năng 3: Mô tả ngắn' },
  ];

  if (user?.role === 'team') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-primary mb-6">Đổi mật khẩu</h1>
        {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{message}</div>}

        <form onSubmit={handleChangePassword} className="card p-6 space-y-4">
          <input type="password" className="input-field" placeholder="Mật khẩu hiện tại" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
          <input type="password" className="input-field" placeholder="Mật khẩu mới" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
          <button type="submit" className="btn-primary text-sm px-6">Đổi mật khẩu</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Cài đặt giải đấu</h1>
      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{message}</div>}

      <form onSubmit={handleSave} className="card p-6 mb-8 space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key}>
            {key === 'logo_url' || key === 'union_logo' || key === 'banner_url' ? (
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
        <h3 className="font-bold">Đổi mật khẩu admin</h3>
        <input type="password" className="input-field" placeholder="Mật khẩu hiện tại" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
        <input type="password" className="input-field" placeholder="Mật khẩu mới" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
        <button type="submit" className="btn-outline text-sm">Đổi mật khẩu</button>
      </form>

      {/* Cloudinary Migration Card */}
      <div className="card p-6 mt-6 border-2 border-orange-200 bg-orange-50">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">☁️</span>
          <div>
            <h3 className="font-bold text-orange-800">Migrate ảnh lên Cloudinary CDN</h3>
            <p className="text-sm text-orange-700 mt-1">
              Chuyển toàn bộ ảnh đang lưu trên server Render sang Cloudinary CDN để <strong>giảm 100% băng thông ảnh</strong> khỏi Render.
              Sau khi migrate, ảnh sẽ được phục vụ từ CDN toàn cầu của Cloudinary — nhanh hơn và không tốn băng thông Render.
            </p>
          </div>
        </div>

        {migrateStatus && (
          <div className={`text-sm rounded px-4 py-2 mb-4 font-medium ${
            !migrateStatus.cloudinaryConfigured
              ? 'bg-red-100 text-red-700'
              : migrateStatus.localImagesCount === 0
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-800'
          }`}>
            {!migrateStatus.cloudinaryConfigured
              ? '❌ Cloudinary chưa được cấu hình trên server'
              : migrateStatus.localImagesCount === 0
                ? '✅ Tất cả ảnh đã được lưu trên Cloudinary CDN!'
                : `⚠️ Có ${migrateStatus.localImagesCount} ảnh đang lưu trên Render disk (chưa migrate)`}
          </div>
        )}

        {migrateResult && (
          <div className={`text-sm rounded px-4 py-3 mb-4 ${migrateResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
            <p className="font-semibold mb-1">{migrateResult.success ? '✅ Migration hoàn thành!' : '❌ Migration thất bại'}</p>
            {migrateResult.success && migrateResult.results && (
              <ul className="list-disc list-inside space-y-0.5 text-xs mt-1">
                <li>Ảnh tìm thấy: <strong>{migrateResult.results.scanned}</strong></li>
                <li>Đã upload lên Cloudinary: <strong>{migrateResult.results.uploaded}</strong></li>
                <li>Bỏ qua (không có file): <strong>{migrateResult.results.skipped}</strong></li>
                <li>Lỗi: <strong>{migrateResult.results.failed}</strong></li>
                <li>Bản ghi DB đã cập nhật URL: <strong>{migrateResult.results.dbUpdated}</strong></li>
              </ul>
            )}
            {!migrateResult.success && <p className="text-xs mt-1">{migrateResult.message}</p>}
            {migrateResult.results?.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">Xem chi tiết lỗi ({migrateResult.results.errors.length})</summary>
                <ul className="mt-1 text-xs space-y-0.5 opacity-80">
                  {migrateResult.results.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        <button
          onClick={handleMigrateUploads}
          disabled={migrating || !migrateStatus?.cloudinaryConfigured || migrateStatus?.localImagesCount === 0}
          className={`btn-primary text-sm px-6 ${migrating ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {migrating ? '⏳ Đang migrate...' : '🚀 Bắt đầu Migrate ảnh lên Cloudinary'}
        </button>
      </div>
    </div>
  );
}
