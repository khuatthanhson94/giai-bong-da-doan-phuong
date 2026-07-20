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
  
  // Custom automatic schedule states
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoForm, setAutoForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    interval_days: '7',
  });

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

  const handleAutoGenerateClick = () => {
    if (!selectedGroupId) {
      alert('Vui lòng chọn một bảng đấu trước khi tự động tạo lịch.');
      return;
    }
    setAutoForm({
      start_date: new Date().toISOString().split('T')[0],
      interval_days: '7',
    });
    setShowAutoModal(true);
  };

  const handleAutoGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/matches/generate-group-schedule', {
        group_id: Number(selectedGroupId),
        start_date: autoForm.start_date,
        interval_days: Number(autoForm.interval_days),
      });
      setShowAutoModal(false);
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
        <button onClick={handleAutoGenerateClick} className="btn-primary text-sm">
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

      {showAutoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-fade-in text-left">
          <form onSubmit={handleAutoGenerateSubmit} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4">
              📅 Tự động tạo lịch vòng bảng
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Bảng đấu được chọn</label>
                <div className="input-field bg-gray-50 text-gray-700 font-semibold select-none">
                  {groups.find(g => g.id === Number(selectedGroupId))?.name || 'Chưa chọn'}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Ngày bắt đầu giải đấu</label>
                <input
                  type="date"
                  className="input-field"
                  value={autoForm.start_date}
                  onChange={(e) => setAutoForm({ ...autoForm, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Tần suất thi đấu</label>
                <select
                  className="input-field cursor-pointer"
                  value={autoForm.interval_days}
                  onChange={(e) => setAutoForm({ ...autoForm, interval_days: e.target.value })}
                  required
                >
                  <option value="1">Thi đấu liên tục (Hằng ngày)</option>
                  <option value="2">Nghỉ 1 ngày (Cách 1 ngày)</option>
                  <option value="7">Thi đấu hàng tuần (Cách 7 ngày)</option>
                </select>
              </div>

              <p className="text-[11px] text-red-500 leading-relaxed bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                ⚠️ Cảnh báo: Thao tác này sẽ tự động xóa tất cả các trận đấu CHƯA KẾT THÚC của bảng đấu được chọn để xếp lịch mới. Các trận đã có kết quả sẽ được giữ nguyên.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAutoModal(false)}
                className="btn-outline text-sm px-4 py-2"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn-primary text-sm px-5 py-2 shadow-md"
              >
                Tạo lịch đấu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
