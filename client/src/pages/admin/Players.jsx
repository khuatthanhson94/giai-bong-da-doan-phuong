import { useEffect, useState } from 'react';
import api from '../../api/client';
import { getFullUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

const positions = ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'];

/**
 * Admin interface for managing players.
 * Provides a clean, readable form using .form-label and .input-field utilities.
 */
export default function AdminPlayers() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    name: '',
    jersey_color: '#0066CC',
    description: '',
    photo: '',
    jersey_number: '',
    position: '',
    dob: '',
    team_id: '',
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [photoPreview, setPhotoPreview] = useState('');
  
  // CSV Import States
  const [importedPlayers, setImportedPlayers] = useState([]);
  const [importTeamId, setImportTeamId] = useState('');
  const [showImportSection, setShowImportSection] = useState(false);

  // Load initial data
  const loadPlayers = () => {
    const url = user?.role === 'team' ? `/players?teamId=${user.team_id}` : '/players';
    return api.get(url).then((data) => {
      if (user?.role === 'team') {
        setPlayers(data.filter((p) => p.team_id === Number(user.team_id)));
      } else {
        setPlayers(data);
      }
    });
  };
  
  const loadTeams = () => api.get('/teams').then((data) => {
    setTeams(data);
    if (user?.role === 'team') {
      setImportTeamId(String(user.team_id));
    }
  });

  useEffect(() => {
    if (user) {
      loadPlayers();
      loadTeams();
    }
  }, [user]);

  const exportPlayers = () => {
    const headers = ['Số áo', 'Họ tên', 'Ngày sinh', 'Vị trí', 'Đội bóng chủ quản', 'Giới thiệu'];
    const rows = players.map((p) => {
      const teamName = teams.find(t => t.id === p.team_id)?.name || '';
      return [
        p.jersey_number,
        p.name,
        p.dob || '',
        p.position,
        teamName,
        p.description || ''
      ];
    });
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách cầu thủ');
    XLSX.writeFile(wb, 'danh_sach_cau_thu.xlsx');
  };



  const downloadTemplate = () => {
    const headers = ['Số áo', 'Họ tên', 'Ngày sinh (YYYY-MM-DD)', 'Vị trí', 'Giới thiệu'];
    const rows = [
      [10, 'Nguyễn Văn A', '1995-05-12', 'Tiền đạo', 'Đội trưởng nhiệt huyết'],
      [1, 'Trần Văn B', '1997-09-20', 'Thủ môn', 'Phản xạ cực tốt']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_danh_sach_cau_thu.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length <= 1) {
          alert('File không có dữ liệu cầu thủ!');
          return;
        }
        
        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (cols && cols.length >= 2 && cols[1]) {
            parsed.push({
              jersey_number: Number(cols[0]) || 0,
              name: String(cols[1]).trim(),
              dob: cols[2] ? String(cols[2]).trim() : '',
              position: cols[3] ? String(cols[3]).trim() : 'Tiền vệ',
              description: cols[4] ? String(cols[4]).trim() : '',
            });
          }
        }
        setImportedPlayers(parsed);
      } catch (err) {
        alert('Lỗi đọc file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const handleConfirmImport = async () => {
    const targetTeamId = user?.role === 'team' ? user.team_id : importTeamId;
    if (!targetTeamId) {
      alert('Vui lòng chọn đội bóng!');
      return;
    }
    try {
      await api.post('/players/import', { team_id: Number(targetTeamId), players: importedPlayers });
      alert('Nhập danh sách cầu thủ thành công!');
      setImportedPlayers([]);
      setShowImportSection(false);
      loadPlayers();
    } catch (err) {
      alert(err.message || 'Lỗi khi nhập danh sách cầu thủ.');
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = await api.upload(file);
    const url = res.url || `/uploads/${res.filename}`;
    setForm((prev) => ({ ...prev, photo: url }));
    setPhotoPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      team_id: Number(form.team_id),
      jersey_number: Number(form.jersey_number),
    };
    if (editId) {
      await api.put(`/players/${editId}`, payload);
    } else {
      await api.post('/players', payload);
    }
    // Reset form
    setForm({
      name: '',
      jersey_color: '#0066CC',
      description: '',
      photo: '',
      jersey_number: '',
      position: '',
      dob: '',
      team_id: '',
    });
    setEditId(null);
    setShowForm(false);
    setPhotoPreview('');
    loadPlayers();
  };

  const handleEdit = (player) => {
    setForm({
      name: player.name,
      jersey_color: player.jersey_color,
      description: player.description,
      photo: player.photo || '',
      jersey_number: player.jersey_number,
      position: player.position,
      dob: player.dob,
      team_id: player.team_id || '',
    });
    setEditId(player.id);
    setShowForm(true);
    setPhotoPreview(player.photo || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa cầu thủ này?')) return;
    try {
      await api.delete(`/players/${id}`);
      loadPlayers();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa cầu thủ.');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} cầu thủ?`)) return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/players/${id}`);
      }
      setSelectedIds([]);
      loadPlayers();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa nhiều cầu thủ');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">Quản lý cầu thủ</h1>
        <div className="flex flex-wrap justify-center sm:justify-end gap-2">
          <button onClick={exportPlayers} className="btn-outline text-sm flex items-center gap-1 py-2 px-3">
            📥 Xuất Excel
          </button>
          <button
            onClick={() => setShowImportSection(!showImportSection)}
            className="btn-outline text-sm py-2 px-3"
          >
            {showImportSection ? 'Đóng Import' : 'Nhập từ file Excel'}
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditId(null);
              setForm({
                name: '',
                jersey_color: '#0066CC',
                description: '',
                photo: '',
                jersey_number: '',
                position: '',
                dob: '',
                team_id: user?.role === 'team' ? String(user.team_id) : '',
              });
              setPhotoPreview('');
            }}
            className="btn-primary text-sm py-2 px-4"
          >
            + Thêm cầu thủ
          </button>
        </div>
      </div>

      {/* CSV Import Section */}
      {showImportSection && (
        <div className="card p-6 mb-6 space-y-4">
          <h2 className="text-lg font-bold text-primary">Nhập cầu thủ hàng loạt từ file Excel/CSV</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <button onClick={downloadTemplate} className="btn-outline text-sm flex items-center gap-2">
                📥 Tải file mẫu Excel (.xlsx)
              </button>
            </div>
            <div>
              <label className="form-label mb-1">Chọn file Excel/CSV</label>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="block text-sm" />
            </div>
            {user?.role !== 'team' && (
              <div>
                <label className="form-label mb-1">Đội nhập vào</label>
                <select className="input-field py-1" value={importTeamId} onChange={(e) => setImportTeamId(e.target.value)}>
                  <option value="">Chọn đội...</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {importedPlayers.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Xem trước dữ liệu ({importedPlayers.length} cầu thủ):</h3>
              <div className="max-h-60 overflow-y-auto border rounded">
                <table className="table-styled text-xs">
                  <thead>
                    <tr>
                      <th>Số áo</th>
                      <th>Họ tên</th>
                      <th>Ngày sinh</th>
                      <th>Vị trí</th>
                      <th>Giới thiệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedPlayers.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.jersey_number}</td>
                        <td>{p.name}</td>
                        <td>{p.dob}</td>
                        <td>{p.position}</td>
                        <td>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button onClick={handleConfirmImport} className="btn-primary text-sm">
                  Lưu danh sách cầu thủ
                </button>
                <button onClick={() => setImportedPlayers([])} className="btn-outline text-sm">
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-2 gap-4">
          <label className="form-label">Đội</label>
          <select
            className="input-field"
            value={form.team_id}
            onChange={(e) => setForm({ ...form, team_id: e.target.value })}
            required
            disabled={user?.role === 'team'}
          >
            <option value="">Chọn đội</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <label className="form-label">Tên cầu thủ</label>
          <input
            className="input-field"
            placeholder="Tên cầu thủ"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <label className="form-label">Màu áo</label>
          <div className="flex items-center gap-2">
            <input
              className="input-field"
              type="color"
              value={form.jersey_color}
              onChange={(e) => setForm({ ...form, jersey_color: e.target.value })}
            />
            <div className="w-6 h-6 rounded border" style={{ backgroundColor: form.jersey_color }}></div>
          </div>

          <label className="form-label">Số áo</label>
          <input
            className="input-field"
            type="number"
            placeholder="Số áo"
            value={form.jersey_number}
            onChange={(e) => setForm({ ...form, jersey_number: e.target.value })}
            required
          />

          <label className="form-label">Vị trí</label>
          <select
            className="input-field"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          >
            <option value="">Chọn vị trí</option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <label className="form-label">Ngày sinh</label>
          <input
            className="input-field"
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
          />

          <label className="form-label">Giới thiệu</label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Giới thiệu"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="form-label">Ảnh</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="mt-2" />
          {photoPreview && (
            <img src={getFullUrl(photoPreview)} alt="Photo preview" className="mt-2 w-24 h-24 object-cover" />
          )}

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary text-sm">
              {editId ? 'Cập nhật' : 'Thêm'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <button onClick={handleBulkDelete} className="btn-outline text-sm mb-4">
          Xóa nhiều cầu thủ
        </button>
      )}

      {/* Players table */}
      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(players.map((p) => p.id));
                    else setSelectedIds([]);
                  }}
                />
              </th>
              <th>Ảnh</th>
              <th>Số áo</th>
              <th>Họ tên</th>
              <th>Đội</th>
              <th>Vị trí</th>
              <th>Bàn</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                      else setSelectedIds(selectedIds.filter((id) => id !== p.id));
                    }}
                  />
                </td>
                <td>
                  {p.photo ? (
                    <img src={getFullUrl(p.photo)} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">
                      {p.name?.charAt(0) || '?'}
                    </div>
                  )}
                </td>
                <td>{p.jersey_number}</td>
                <td>{p.name}</td>
                <td>{teams.find(t => t.id === p.team_id)?.name || ''}</td>
                <td>{p.position}</td>
                <td>{p.goals}</td>
                <td className="space-x-2">
                  <button onClick={() => handleEdit(p)} className="text-primary text-sm hover:underline">
                    Sửa
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 text-sm hover:underline">
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
