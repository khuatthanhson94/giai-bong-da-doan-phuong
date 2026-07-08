import { useEffect, useState, useRef } from 'react';
import api from '../../api/client';
import { getFullUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

/**
 * Admin interface for managing teams.
 * Provides a form for creating/updating a team and a table listing existing teams.
 * Uses the .form-label and .input-field utility classes for consistent styling.
 */
export default function AdminTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    name: '',
    jersey_color: '#0066CC',
    description: '',
    logo: '',
    coach: '',
    stadium: '',
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedTeamForPlayers, setSelectedTeamForPlayers] = useState(null);
  const fileInputRef = useRef(null);

  // Load teams on mount
  const load = () => {
    api.get('/teams').then((data) => {
      if (user?.role === 'team') {
        setTeams(data.filter((t) => t.id === Number(user.team_id)));
      } else {
        setTeams(data);
      }
      setSelectedIds([]);
    });
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const downloadTemplate = () => {
    const headers = ['Tên đội', 'Màu áo', 'Bảng đấu', 'Huấn luyện viên', 'Sân nhà', 'Giới thiệu'];
    const sampleRows = [
      ['Đội bóng Đoàn phường A', '#FF0000', 'Bảng A', 'Nguyễn Văn Hùng', 'Sân cỏ nhân tạo Phường', 'Đội bóng thanh niên khối phố 1'],
      ['Đội bóng Đoàn phường B', '#0000FF', 'Bảng A', 'Trần Văn Cường', 'Sân cỏ nhân tạo Phường', 'Đội bóng thanh niên khối phố 2'],
      ['Đội bóng Đoàn phường C', '#FFA500', 'Bảng B', 'Lê Văn Tuấn', 'Sân cỏ nhân tạo Phường', 'Đội bóng liên chi đoàn cơ quan']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mẫu Nhập Đội');
    XLSX.writeFile(wb, 'mau_nhap_doi_bong.xlsx');
  };

  const handleExcelImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('Không tìm thấy dữ liệu đội bóng trong tệp Excel.');
          return;
        }

        const mappedTeams = data.map((row) => ({
          name: row['Tên đội'] || row['Tên đội bóng'] || row['Name'] || '',
          jersey_color: row['Màu áo'] || row['Jersey Color'] || '#0066CC',
          description: row['Giới thiệu'] || row['Mô tả'] || row['Description'] || '',
          coach: row['Huấn luyện viên'] || row['Coach'] || '',
          stadium: row['Sân nhà'] || row['Stadium'] || '',
          group_name: row['Bảng đấu'] || row['Group'] || ''
        })).filter(t => t.name.toString().trim() !== '');

        if (mappedTeams.length === 0) {
          alert('Không tìm thấy bản ghi đội bóng hợp lệ (cần có cột "Tên đội").');
          return;
        }

        const confirmMsg = `Bạn có chắc chắn muốn nhập ${mappedTeams.length} đội bóng từ tệp Excel vào hệ thống?`;
        if (!confirm(confirmMsg)) return;

        await api.post('/teams/import', { teams: mappedTeams });
        alert(`Nhập dữ liệu thành công! Đã chèn ${mappedTeams.length} đội bóng.`);
        load();
      } catch (err) {
        console.error('Failed to parse and import Excel file:', err);
        alert('Lỗi nhập Excel: ' + (err.message || err));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportTeams = () => {
    const headers = ['Tên đội bóng', 'Màu áo', 'Điểm số', 'Giới thiệu'];
    const rows = teams.map((t) => [
      t.name,
      t.jersey_color,
      t.points || 0,
      t.description || ''
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đội bóng');
    XLSX.writeFile(wb, 'danh_sach_doi_bong.xlsx');
  };



  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Resize image to fit within 200x200 px before uploading
    const resizedBlob = await resizeImage(file, 200, 200);
    const res = await api.upload(resizedBlob);
    const url = res.url || `/uploads/${res.filename}`;
    setForm((prev) => ({ ...prev, logo: url }));
    setLogoPreview(url);
  };

  // Utility to resize image using canvas
  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const aspectRatio = width / height;
        if (width > maxWidth) {
          width = maxWidth;
          height = Math.round(width / aspectRatio);
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = Math.round(height * aspectRatio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), file.type);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api.put(`/teams/${editId}`, form);
    } else {
      await api.post('/teams', form);
    }
    // Reset form
    setForm({ name: '', jersey_color: '#0066CC', description: '', logo: '', coach: '', stadium: '' });
    setEditId(null);
    setShowForm(false);
    setLogoPreview('');
    load();
  };

  const handleEdit = (team) => {
    setForm({
      name: team.name,
      jersey_color: team.jersey_color,
      description: team.description,
      logo: team.logo || '',
      coach: team.coach || '',
      stadium: team.stadium || '',
    });
    setEditId(team.id);
    setShowForm(true);
    setLogoPreview(team.logo || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa đội này?')) return;
    try {
      await api.delete(`/teams/${id}`);
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa đội bóng.');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} đội bóng đã chọn? Hành động này sẽ xóa toàn bộ dữ liệu liên quan!`)) return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/teams/${id}`);
      }
      alert('Đã xóa các đội bóng được chọn.');
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa các đội bóng.');
    }
  };

  const handleGenerateAccounts = async () => {
    if (!confirm('Tự động tạo tài khoản đại diện cho các đội bóng chưa có tài khoản? Mật khẩu mặc định sẽ là admin123.')) return;
    try {
      const res = await api.post('/teams/generate-accounts');
      alert(res.message || 'Cấp tài khoản thành công!');
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi cấp tài khoản.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">
          {user?.role === 'team' ? 'Thông tin đội bóng' : 'Quản lý đội bóng'}
        </h1>
        <div className="flex flex-wrap justify-center sm:justify-end gap-2">
          {user?.role !== 'team' && (
            <>
              <button type="button" onClick={downloadTemplate} className="btn-outline text-sm flex items-center gap-1 bg-gray-50 hover:bg-gray-100 py-2 px-3">
                📄 Mẫu Excel
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline text-sm flex items-center gap-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100 py-2 px-3">
                📤 Nhập Excel
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelImport} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
            </>
          )}
          <button type="button" onClick={exportTeams} className="btn-outline text-sm flex items-center gap-1 py-2 px-3">
            📥 Xuất Excel
          </button>
          {user?.role !== 'team' && (
            <>
              <button type="button" onClick={handleGenerateAccounts} className="btn-outline text-sm flex items-center gap-1 py-2 px-3">
                🔑 Cấp tài khoản
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setEditId(null);
                  setForm({ name: '', jersey_color: '#0066CC', description: '', logo: '', coach: '', stadium: '' });
                  setLogoPreview('');
                }}
                className="btn-primary text-sm py-2 px-4"
              >
                + Thêm đội
              </button>
            </>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-6 bg-white shadow-lg rounded-2xl border border-gray-100">
          <h2 className="text-lg font-bold text-primary border-b pb-2">
            {editId ? '📝 Chỉnh sửa thông tin đội bóng' : '➕ Thêm đội bóng mới'}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Tên đội */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Tên đội <span className="text-red-500">*</span></label>
              <input
                className="input-field"
                placeholder="Nhập tên đội bóng"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={user?.role === 'team'}
              />
            </div>

            {/* Màu áo */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Màu áo chủ đạo</label>
              <div className="flex items-center gap-3">
                <input
                  className="w-12 h-10 p-0.5 rounded border border-gray-200 cursor-pointer"
                  type="color"
                  value={form.jersey_color}
                  onChange={(e) => setForm({ ...form, jersey_color: e.target.value })}
                />
                <div className="text-xs text-gray-500 font-mono uppercase bg-gray-100 px-2 py-1.5 rounded">
                  {form.jersey_color}
                </div>
              </div>
            </div>

            {/* Huấn luyện viên trưởng */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Huấn luyện viên trưởng</label>
              <input
                className="input-field"
                placeholder="Tên HLV trưởng (Không bắt buộc)"
                value={form.coach}
                onChange={(e) => setForm({ ...form, coach: e.target.value })}
              />
            </div>

            {/* Sân nhà */}
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Sân nhà</label>
              <input
                className="input-field"
                placeholder="Tên sân nhà (Không bắt buộc)"
                value={form.stadium}
                onChange={(e) => setForm({ ...form, stadium: e.target.value })}
              />
            </div>
          </div>

          {/* Giới thiệu */}
          <div className="space-y-1">
            <label className="form-label font-semibold text-gray-700">Giới thiệu đội bóng</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Mô tả sơ lược về lịch sử, thành tích hoặc mục tiêu đội bóng (Không bắt buộc)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Logo Upload Section */}
          <div className="grid md:grid-cols-2 gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="space-y-1">
              <label className="form-label font-semibold text-gray-700">Logo đội bóng</label>
              <input
                className="input-field bg-white"
                placeholder="Đường dẫn URL ảnh logo"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
              />
              <div className="mt-2">
                <span className="text-xs text-gray-400 block mb-1">Hoặc tải file ảnh lên trực tiếp:</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="text-xs text-gray-500" />
              </div>
            </div>
            
            <div className="flex items-center justify-center p-2">
              {logoPreview ? (
                <div className="text-center">
                  <img src={getFullUrl(logoPreview)} alt="Logo preview" className="w-24 h-24 object-contain rounded-lg border bg-white p-1 shadow-sm" />
                  <span className="text-[10px] text-gray-400 mt-1 block">Ảnh xem trước</span>
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

      {selectedIds.length > 0 && user?.role !== 'team' && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 animate-fade-in">
          <span className="text-sm font-semibold text-red-700">
            Đang chọn <span className="font-bold">{selectedIds.length}</span> đội bóng
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

      {/* Teams table */}
      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              {user?.role !== 'team' && (
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={teams.length > 0 && selectedIds.length === teams.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(teams.map(t => t.id));
                      else setSelectedIds([]);
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
              )}
              <th>Tên</th>
              <th>Màu áo</th>
              <th>Logo</th>
              <th>Điểm</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                {user?.role !== 'team' && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, t.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== t.id));
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </td>
                )}
                <td className="font-medium">{t.name}</td>
                <td>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: t.jersey_color }} />
                </td>
                <td>{t.logo && <img src={getFullUrl(t.logo)} className="w-10 h-10 object-contain" alt="logo" />}</td>
                <td>{t.points || 0}</td>
                <td className="space-x-2">
                  <button onClick={() => setSelectedTeamForPlayers(t)} className="text-emerald-600 text-sm hover:underline">
                    👥 Cầu thủ
                  </button>
                  <button onClick={() => handleEdit(t)} className="text-primary text-sm hover:underline">
                    Sửa
                  </button>
                  {user?.role !== 'team' && (
                    <button onClick={() => handleDelete(t.id)} className="text-red-500 text-sm hover:underline">
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTeamForPlayers && (
        <TeamPlayersModal
          team={selectedTeamForPlayers}
          onClose={() => setSelectedTeamForPlayers(null)}
        />
      )}
    </div>
  );
}

function TeamPlayersModal({ team, onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [form, setForm] = useState({
    name: '',
    jersey_number: '',
    position: 'Tiền vệ',
    dob: '',
    photo: '',
    description: ''
  });

  const positions = ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'];

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/players?teamId=${team.id}`);
      setPlayers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [team.id]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await api.upload(file);
      const url = res.url || `/uploads/${res.filename}`;
      setForm((prev) => ({ ...prev, photo: url }));
      setPhotoPreview(url);
    } catch (err) {
      alert('Lỗi tải ảnh: ' + (err.message || err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      team_id: Number(team.id),
      jersey_number: Number(form.jersey_number),
      jersey_color: team.jersey_color || '#0066CC'
    };

    try {
      if (editId) {
        await api.put(`/players/${editId}`, payload);
      } else {
        await api.post('/players', payload);
      }
      
      // Reset form
      setForm({
        name: '',
        jersey_number: '',
        position: 'Tiền vệ',
        dob: '',
        photo: '',
        description: ''
      });
      setEditId(null);
      setPhotoPreview('');
      loadPlayers();
    } catch (err) {
      alert('Lỗi lưu thông tin: ' + (err.message || err));
    }
  };

  const handleEdit = (p) => {
    setForm({
      name: p.name,
      jersey_number: p.jersey_number,
      position: p.position || 'Tiền vệ',
      dob: p.dob || '',
      photo: p.photo || '',
      description: p.description || ''
    });
    setEditId(p.id);
    setPhotoPreview(p.photo || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cầu thủ này?')) return;
    try {
      await api.delete(`/players/${id}`);
      loadPlayers();
    } catch (err) {
      alert('Lỗi xóa cầu thủ: ' + (err.message || err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span>👥 Cầu thủ đội: {team.name}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý danh sách cầu thủ thuộc biên chế đội bóng</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-5 gap-6">
          {/* List Section */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Danh sách cầu thủ</h3>
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Đang tải danh sách...</div>
            ) : players.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                Chưa có cầu thủ nào trong danh sách. Hãy thêm cầu thủ bên phải.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-semibold text-gray-600">Số áo</th>
                      <th className="p-3 font-semibold text-gray-600">Ảnh</th>
                      <th className="p-3 font-semibold text-gray-600">Họ tên</th>
                      <th className="p-3 font-semibold text-gray-600">Vị trí</th>
                      <th className="p-3 font-semibold text-gray-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-3 font-mono font-bold text-gray-700">#{p.jersey_number}</td>
                        <td className="p-3">
                          <img
                            src={p.photo ? getFullUrl(p.photo) : 'https://placehold.co/100?text=Player'}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover border bg-gray-50"
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-900">{p.name}</td>
                        <td className="p-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                            {p.position}
                          </span>
                        </td>
                        <td className="p-3 space-x-2">
                          <button onClick={() => handleEdit(p)} className="text-blue-500 hover:underline">
                            Sửa
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline">
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

          {/* Form Section */}
          <div className="md:col-span-2 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 self-start">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              {editId ? '📝 Sửa cầu thủ' : '➕ Thêm cầu thủ mới'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label text-xs font-semibold text-gray-600 mb-1">Họ tên cầu thủ <span className="text-red-500">*</span></label>
                <input
                  className="input-field bg-white"
                  placeholder="Nhập tên cầu thủ"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs font-semibold text-gray-600 mb-1">Số áo <span className="text-red-500">*</span></label>
                  <input
                    className="input-field bg-white"
                    type="number"
                    placeholder="Số áo"
                    value={form.jersey_number}
                    onChange={(e) => setForm({ ...form, jersey_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label text-xs font-semibold text-gray-600 mb-1">Vị trí</label>
                  <select
                    className="input-field bg-white"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  >
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-gray-600 mb-1">Ngày sinh</label>
                <input
                  className="input-field bg-white"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-gray-600 mb-1">Giới thiệu</label>
                <textarea
                  className="input-field bg-white"
                  rows={2}
                  placeholder="Mô tả sơ lược về cầu thủ"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-gray-600 mb-1">Ảnh đại diện</label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs text-gray-500" />
                {photoPreview && (
                  <div className="mt-2">
                    <img src={getFullUrl(photoPreview)} alt="Preview" className="w-16 h-16 object-cover rounded-lg border bg-white" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary text-xs py-2 px-4 flex-1">
                  {editId ? 'Cập nhật' : 'Lưu lại'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setForm({ name: '', jersey_number: '', position: 'Tiền vệ', dob: '', photo: '', description: '' });
                      setPhotoPreview('');
                    }}
                    className="btn-outline text-xs py-2 px-4"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
