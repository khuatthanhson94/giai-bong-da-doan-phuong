import { useState, useEffect } from 'react';
import api from '../../api/client';

const API_BASE = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '');

export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadBackups = () => {
    setLoading(true);
    api.get('/backup/list')
      .then(setBackups)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setError('');
    setSuccess('');
    try {
      await api.post('/backup/create');
      setSuccess('Đã tạo bản sao lưu thành công!');
      loadBackups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadDb = () => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE || window.location.origin}/api/backup/download?token=${token}`;
    
    // Open in a new tab or trigger direct download
    const link = document.createElement('a');
    link.href = url;
    // Add token header proxy via query params or simulate form trigger
    // Let's use window.open since we implemented Bearer auth, but wait: 
    // Express res.download works with Authorization header. To download, we can trigger direct download link:
    // If the browser opens it, we need to pass the token. Since headers can't be easily set for standard downloads,
    // let's fetch the file as blob, and trigger standard browser save! This is much more secure!
    setError('');
    setSuccess('');
    
    fetch(`${API_BASE || window.location.origin}/api/backup/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Không thể tải xuống tệp');
      return res.blob();
    })
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'tournament.db';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccess('Đã tải cơ sở dữ liệu về máy thành công!');
    })
    .catch(err => setError(err.message));
  };

  const handleUploadRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm('CẢNH BÁO: Việc phục hồi cơ sở dữ liệu sẽ ghi đè TOÀN BỘ dữ liệu hiện tại của hệ thống. Bạn có chắc chắn muốn tiếp tục?')) {
      e.target.value = null;
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE || window.location.origin}/api/backup/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi khôi phục');
      
      setSuccess('Khôi phục hệ thống thành công! Trang web sẽ tự động tải lại sau 2 giây.');
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleRestoreFile = async (filename) => {
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu "${filename}" không? Toàn bộ dữ liệu hiện tại sẽ bị ghi đè.`)) return;

    setError('');
    setSuccess('');
    try {
      await api.post('/backup/restore-file', { filename });
      setSuccess('Khôi phục cơ sở dữ liệu thành công! Trang web sẽ tự động tải lại sau 2 giây.');
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Sao lưu & Phục hồi cơ sở dữ liệu</h1>
        <p className="text-sm text-gray-500 mt-1">Đảm bảo an toàn dữ liệu của giải đấu bằng cách tạo bản sao lưu hoặc phục hồi từ điểm khôi phục.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm font-medium border border-green-200">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Actions card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Tải về & Nhập dữ liệu</h2>
            <p className="text-sm text-gray-500">Thao tác tải trực tiếp file `.db` hoặc tải lên file mới để khôi phục.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownloadDb}
              className="flex-1 bg-primary text-white py-3 rounded-lg text-sm font-semibold hover:bg-primary-dark cursor-pointer transition shadow-sm text-center"
            >
              📥 Tải xuống cơ sở dữ liệu (.db)
            </button>

            <label className="flex-1 bg-youth text-white py-3 rounded-lg text-sm font-semibold hover:bg-youth/90 cursor-pointer transition shadow-sm text-center">
              <span>📤 Tải lên file (.db) để khôi phục</span>
              <input
                type="file"
                accept=".db"
                onChange={handleUploadRestore}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {uploading && (
            <div className="text-center p-4 text-sm text-youth font-semibold animate-pulse">
              Đang tải lên và khôi phục cơ sở dữ liệu, vui lòng không tắt trình duyệt...
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-bold text-sm text-gray-700 mb-2">Sao lưu tức thời (Manual Backup)</h3>
            <p className="text-xs text-gray-500 mb-3">Tạo một điểm khôi phục nhanh ngay bây giờ để đề phòng trước khi thao tác các tác vụ quan trọng.</p>
            <button
              onClick={handleCreateBackup}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
            >
              ⚡ Tạo điểm khôi phục mới
            </button>
          </div>
        </div>

        {/* History backups card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Danh sách điểm khôi phục (Tối đa 5)</h2>
          
          {loading ? (
            <div className="text-center p-8 text-gray-500 text-sm">Đang tải lịch sử sao lưu...</div>
          ) : backups.length === 0 ? (
            <div className="text-center p-8 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed">Chưa có bản sao lưu tự động nào.</div>
          ) : (
            <div className="space-y-3">
              {backups.map((b) => (
                <div key={b.filename} className="p-4 bg-gray-50 rounded-lg border flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-800">{b.filename}</div>
                    <div className="text-gray-500">Dung lượng: {formatSize(b.size)} | Tạo lúc: {new Date(b.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</div>
                  </div>
                  <button
                    onClick={() => handleRestoreFile(b.filename)}
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded font-bold transition"
                  >
                    Khôi phục
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
