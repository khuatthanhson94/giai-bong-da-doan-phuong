import { useEffect, useState } from 'react';
import api from '../../api/client';

const positions = ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'];

/**
 * Admin interface for managing players.
 * Provides a clean, readable form using .form-label and .input-field utilities.
 */
export default function AdminPlayers() {
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

  // Load initial data
  const loadPlayers = () => api.get('/players').then(setPlayers);
  const loadTeams = () => api.get('/teams').then(setTeams);
  useEffect(() => {
    loadPlayers();
    loadTeams();
  }, []);

  // Resolve image URLs for preview
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return `${window.location.origin}/uploads/${url}`;
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Quản lý cầu thủ</h1>
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
              team_id: '',
            });
            setPhotoPreview('');
          }}
          className="btn-primary text-sm"
        >
          + Thêm cầu thủ
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-2 gap-4">
          <label className="form-label">Đội</label>
          <select
            className="input-field"
            value={form.team_id}
            onChange={(e) => setForm({ ...form, team_id: e.target.value })}
            required
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
