import { useEffect, useState } from 'react';
import api from '../../api/client';

const roles = [
  { value: 'super_admin', label: 'Super Admin - Toàn quyền' },
  { value: 'admin', label: 'Admin - Quản lý giải đấu' },
  { value: 'editor', label: 'Biên tập viên - Chỉ đăng tin' },
  { value: 'scorekeeper', label: 'Cán bộ nhập kết quả' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'admin' });

  const load = () => api.get('/auth/users').then(setUsers);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/auth/users', form);
    setForm({ username: '', password: '', role: 'admin' });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Quản lý tài khoản</h1>

      <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-3 gap-4">
        <input className="input-field" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm md:col-span-3">Thêm tài khoản</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead><tr><th>Username</th><th>Phân quyền</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{roles.find((r) => r.value === u.role)?.label || u.role}</td>
                <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button
                    onClick={async () => { if (confirm('Xóa?')) { await api.delete(`/auth/users/${u.id}`); load(); } }}
                    className="text-red-500 text-sm"
                  >
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
