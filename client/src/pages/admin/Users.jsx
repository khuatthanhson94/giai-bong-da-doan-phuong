import { useEffect, useState } from 'react';
import api from '../../api/client';
import * as XLSX from 'xlsx';

const roles = [
  { value: 'super_admin', label: 'Super Admin - Toàn quyền' },
  { value: 'admin', label: 'Admin - Quản lý giải đấu' },
  { value: 'editor', label: 'Biên tập viên - Chỉ đăng tin' },
  { value: 'scorekeeper', label: 'Cán bộ nhập kết quả' },
  { value: 'team', label: 'Đại diện đội bóng' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'admin', team_id: '' });
  const [selectedIds, setSelectedIds] = useState([]);

  const loadUsers = () => api.get('/auth/users').then((data) => {
    setUsers(data);
    setSelectedIds([]);
  });
  const loadTeams = () => api.get('/teams').then(setTeams);

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} tài khoản đã chọn?`)) return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/auth/users/${id}`);
      }
      alert('Đã xóa thành công các tài khoản được chọn.');
      loadUsers();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa các tài khoản.');
    }
  };

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      username: form.username,
      password: form.password,
      role: form.role,
      team_id: form.role === 'team' && form.team_id ? Number(form.team_id) : null,
    };
    await api.post('/auth/users', payload);
    setForm({ username: '', password: '', role: 'admin', team_id: '' });
    loadUsers();
  };

  const handleResetPassword = async (id) => {
    if (!confirm('Đặt lại mật khẩu tài khoản này về mặc định (admin123)?')) return;
    try {
      await api.post(`/auth/users/${id}/reset-password`);
      alert('Đã reset mật khẩu thành công về admin123!');
    } catch (err) {
      alert(err.message || 'Lỗi khi đặt lại mật khẩu');
    }
  };

  const exportUsers = () => {
    const headers = ['Username', 'Phân quyền', 'Gán cho đội', 'Ngày tạo'];
    const rows = users.map((u) => {
      const roleLabel = roles.find((r) => r.value === u.role)?.label || u.role;
      const teamName = u.team_id ? (teams.find(t => t.id === u.team_id)?.name || `ID: ${u.team_id}`) : '-';
      return [u.username, roleLabel, teamName, new Date(u.created_at).toLocaleDateString('vi-VN')];
    });
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách tài khoản');
    XLSX.writeFile(wb, 'danh_sach_tai_khoan.xlsx');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">Quản lý tài khoản</h1>
        <button onClick={exportUsers} className="btn-outline text-sm flex items-center justify-center gap-1 py-2 px-3 self-center sm:self-auto">
          📥 Xuất Excel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-3 gap-4">
        <input className="input-field" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, team_id: e.target.value === 'team' ? (teams[0]?.id || '') : '' })}>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        {form.role === 'team' && (
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Gán cho đội bóng</label>
            <select className="input-field" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} required>
              <option value="">Chọn đội bóng...</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <button type="submit" className="btn-primary text-sm md:col-span-3">Thêm tài khoản</button>
      </form>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 animate-fade-in">
          <span className="text-sm font-semibold text-red-700">
            Đang chọn <span className="font-bold">{selectedIds.length}</span> tài khoản
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

      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedIds.length === users.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(users.map(u => u.id));
                    else setSelectedIds([]);
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
              </th>
              <th>Username</th>
              <th>Phân quyền</th>
              <th>Gán cho đội</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const teamName = u.team_id ? (teams.find(t => t.id === u.team_id)?.name || `ID: ${u.team_id}`) : '-';
              return (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, u.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== u.id));
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td>{u.username}</td>
                  <td>{roles.find((r) => r.value === u.role)?.label || u.role}</td>
                  <td>{teamName}</td>
                  <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="space-x-4">
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      className="text-primary text-sm hover:underline"
                    >
                      Reset mật khẩu
                    </button>
                    <button
                      onClick={async () => { if (confirm('Xóa?')) { await api.delete(`/auth/users/${u.id}`); loadUsers(); } }}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
