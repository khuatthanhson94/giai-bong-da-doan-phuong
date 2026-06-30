import { useEffect, useState } from 'react';
import api from '../../api/client';

/**
 * Admin interface for managing the round‑robin (group stage) schedule.
 * Allows the admin to select a group, view existing matches for that group,
 * and generate a full round‑robin schedule automatically via the backend.
 * Uses the global .form-label and .input-field utilities defined in index.css.
 */
export default function AdminGroupSchedule() {
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Load groups on mount
  useEffect(() => {
    api.get('/groups').then(setGroups).catch(() => setGroups([]));
  }, []);

  // Load matches for the selected group
  const loadMatches = (groupId) => {
    if (!groupId) {
      setMatches([]);
      return;
    }
    api
      .get('/matches')
      .then((all) => {
        const filtered = all.filter((m) => m.group?.id === Number(groupId));
        setMatches(filtered);
      })
      .catch(() => setMatches([]));
  };

  const handleGroupChange = (e) => {
    const gid = e.target.value;
    setSelectedGroupId(gid);
    loadMatches(gid);
  };

  const handleAutoGenerate = async () => {
    if (!selectedGroupId) {
      alert('Vui lòng chọn một bảng đấu trước khi tự động tạo lịch.');
      return;
    }
    try {
      await api.post('/matches/generate-group-schedule', { group_id: Number(selectedGroupId) });
      loadMatches(selectedGroupId);
      alert('Lịch vòng bảng đã được tự động tạo thành công.');
    } catch (err) {
      alert(err.message || 'Có lỗi khi tạo lịch vòng bảng.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Quản lý lịch vòng bảng</h1>
        <button onClick={handleAutoGenerate} className="btn-primary text-sm">
          Tự động tạo lịch cho bảng
        </button>
      </div>

      <div className="mb-4">
        <label className="form-label">Chọn bảng đấu</label>
        <select
          className="input-field"
          value={selectedGroupId}
          onChange={handleGroupChange}
        >
          <option value="">-- Chọn bảng --</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              <th>Vòng</th>
              <th>Ngày</th>
              <th>Giờ</th>
              <th>Đội A</th>
              <th>Đội B</th>
              <th>Địa điểm</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold text-sm">{m.round}</td>
                <td>{m.match_date}</td>
                <td>{m.match_time}</td>
                <td className="text-primary">{m.team_a?.name}</td>
                <td className="text-primary">{m.team_b?.name}</td>
                <td>{m.venue}</td>
                <td>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {m.published ? 'Đã công bố' : m.status === 'finished' ? 'Đã kết quả' : 'Chưa đấu'}
                  </span>
                </td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-gray-400 py-8 italic">
                  Chưa có lịch nào cho bảng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
