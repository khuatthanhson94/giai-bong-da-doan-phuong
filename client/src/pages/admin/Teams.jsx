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
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const fileInputRef = useRef(null);

  // Load teams on mount
  const load = () => {
    api.get('/teams').then((data) => {
      if (user?.role === 'team') {
        setTeams(data.filter((t) => t.id === Number(user.team_id)));
      } else {
        setTeams(data);
      }
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
    setForm({ name: '', jersey_color: '#0066CC', description: '', logo: '' });
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

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">
          {user?.role === 'team' ? 'Thông tin đội bóng' : 'Quản lý đội bóng'}
        </h1>
        <div className="flex flex-wrap gap-2">
          {user?.role !== 'team' && (
            <>
              <button type="button" onClick={downloadTemplate} className="btn-outline text-sm flex items-center gap-1 bg-gray-50 hover:bg-gray-100">
                📄 Mẫu Excel
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline text-sm flex items-center gap-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100">
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
          <button type="button" onClick={exportTeams} className="btn-outline text-sm flex items-center gap-1">
            📥 Xuất Excel
          </button>
          {user?.role !== 'team' && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setEditId(null);
                setForm({ name: '', jersey_color: '#0066CC', description: '', logo: '' });
                setLogoPreview('');
              }}
              className="btn-primary text-sm"
            >
              + Thêm đội
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
          <label className="form-label">Tên đội</label>
          <input
            className="input-field"
            placeholder="Tên đội"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={user?.role === 'team'}
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

          <label className="form-label">Giới thiệu</label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Giới thiệu"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="form-label">URL Logo</label>
          <input
            className="input-field"
            placeholder="URL Logo"
            value={form.logo}
            onChange={(e) => setForm({ ...form, logo: e.target.value })}
          />
          <input type="file" accept="image/*" onChange={handleLogoChange} className="mt-2" />
          {logoPreview && (
            <img src={getFullUrl(logoPreview)} alt="Logo preview" className="mt-2 w-24 h-24 object-contain" />
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm">
              {editId ? 'Cập nhật' : 'Thêm'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Teams table */}
      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
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
                <td className="font-medium">{t.name}</td>
                <td>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: t.jersey_color }} />
                </td>
                <td>{t.logo && <img src={getFullUrl(t.logo)} className="w-10 h-10 object-contain" alt="logo" />}</td>
                <td>{t.points || 0}</td>
                <td className="space-x-2">
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
    </div>
  );
}
