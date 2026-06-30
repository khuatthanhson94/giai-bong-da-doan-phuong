import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [form, setForm] = useState({
    round: 'Vòng bảng - Lượt 1',
    match_date: '',
    match_time: '08:00',
    venue: '',
    team_a_id: '',
    team_b_id: '',
    is_knockout: false,
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    api.get('/matches').then(setMatches);
    api.get('/groups').then(setGroups);
  };

  useEffect(() => {
    load();
    api.get('/teams').then(setTeams);
  }, []);

  const handleRoundChange = (val) => {
    const isKO = val ? !/bảng|lượt|group/i.test(val) : false;
    setForm({ ...form, round: val, is_knockout: isKO });
    if (isKO) {
      setSelectedGroupId('');
    }
  };

  const handleGroupChange = (groupIdStr) => {
    const groupId = groupIdStr ? Number(groupIdStr) : '';
    setSelectedGroupId(groupId);
    
    if (groupId) {
      // Count existing matches in this group to auto-suggest the next round/lượt
      const groupTeams = teams.filter(t => t.group_id === groupId);
      const groupMatches = matches.filter(m => m.group?.id === groupId);
      const matchesPerRound = Math.floor(groupTeams.length / 2) || 1;
      const estimatedRound = Math.floor(groupMatches.length / matchesPerRound) + 1;
      
      setForm(prev => ({
        ...prev,
        round: `Vòng bảng - Lượt ${estimatedRound}`,
        team_a_id: '',
        team_b_id: ''
      }));
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedGroupId) {
      alert('Vui lòng chọn bảng đấu trước khi tự động tạo lịch.');
      return;
    }
    try {
      await api.post('/matches/generate-group-schedule', { group_id: selectedGroupId });
      load();
      alert('Lịch thi đấu tự động tạo thành công.');
    } catch (err) {
      alert(err.message || 'Có lỗi khi tạo lịch tự động.');
    }
  };
  const handleEdit = (m) => {
    const isKO = m.round ? !/bảng|lượt|group/i.test(m.round) : false;
    const teamA = teams.find(t => t.id === m.team_a_id);
    
    setSelectedGroupId(isKO ? '' : (teamA?.group_id || ''));
    setForm({
      round: m.round || '',
      match_date: m.match_date || '',
      match_time: m.match_time || '08:00',
      venue: m.venue || '',
      team_a_id: String(m.team_a_id || ''),
      team_b_id: String(m.team_b_id || ''),
      is_knockout: isKO,
    });
    setEditId(m.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      round: 'Vòng bảng - Lượt 1',
      match_date: '',
      match_time: '08:00',
      venue: '',
      team_a_id: '',
      team_b_id: '',
      is_knockout: false,
    });
    setSelectedGroupId('');
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const teamA = teams.find(t => t.id === Number(form.team_a_id));
    const teamB = teams.find(t => t.id === Number(form.team_b_id));

    // Validation 1: At group stage, team A and team B must belong to the same group
    if (!form.is_knockout) {
      if (teamA && teamB) {
        if (!teamA.group_id || !teamB.group_id || teamA.group_id !== teamB.group_id) {
          alert(
            `Không thể tạo lịch thi đấu chéo bảng ở vòng bảng!\n` +
            `- Đội ${teamA.name}: ${teamA.group_name || 'Chưa phân bảng'}\n` +
            `- Đội ${teamB.name}: ${teamB.group_name || 'Chưa phân bảng'}\n` +
            `Hãy chọn hai đội cùng một bảng đấu, hoặc tích chọn "Là vòng đấu Knockout" nếu đây là vòng loại trực tiếp.`
          );
          return;
        }
      }
    }

    // Validation 2: Check if match already exists in database (ignore current match when editing)
    const matchExists = matches.some(m => 
      ((m.team_a_id === Number(form.team_a_id) && m.team_b_id === Number(form.team_b_id)) ||
       (m.team_a_id === Number(form.team_b_id) && m.team_b_id === Number(form.team_a_id))) &&
      m.id !== editId
    );

    if (matchExists) {
      const confirmMsg = `Cảnh báo: Trận đấu giữa ${teamA?.name} và ${teamB?.name} đã tồn tại trong lịch thi đấu!\nBạn có chắc chắn muốn tiếp tục tạo thêm trận đấu trùng lặp này?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    const data = {
      round: form.round,
      match_date: form.match_date,
      match_time: form.match_time,
      venue: form.venue,
      team_a_id: Number(form.team_a_id),
      team_b_id: Number(form.team_b_id),
    };

    try {
      if (editId) {
        await api.put(`/matches/${editId}`, data);
      } else {
        await api.post('/matches', data);
      }
      resetForm();
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi lưu lịch thi đấu.');
    }
  };

  // Filter dropdown options for Team A
  const filteredTeamsA = teams.filter(t => {
    if (t.id === Number(form.team_b_id)) return false;
    // If not knockout and a group is selected, only show teams in that group
    if (!form.is_knockout && selectedGroupId) {
      return t.group_id === selectedGroupId;
    }
    return true;
  });

  // Filter dropdown options for Team B
  const filteredTeamsB = teams.filter(t => {
    if (t.id === Number(form.team_a_id)) return false;
    // If not knockout and a group is selected, only show teams in that group
    if (!form.is_knockout && selectedGroupId) {
      return t.group_id === selectedGroupId;
    }
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Quản lý lịch thi đấu</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm">+ Tạo lịch</button>
        <button onClick={handleAutoGenerate} className="btn-secondary text-sm ml-2">Tự động tạo lịch</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 grid md:grid-cols-2 gap-4 bg-gray-50 border border-gray-100 animate-fade-in">
          <div className="md:col-span-2 border-b pb-2">
            <h3 className="font-bold text-gray-800 text-sm">{editId ? 'Chỉnh sửa lịch thi đấu' : 'Tạo lịch thi đấu mới'}</h3>
            <p className="text-xs text-gray-500">Thiết lập thông tin ngày giờ, địa điểm và các đội bóng thi đấu.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Kiểu vòng đấu</label>
            <div className="flex items-center h-10 border rounded bg-white px-3 gap-2">
              <input
                type="checkbox"
                id="is_knockout"
                checked={form.is_knockout}
                onChange={(e) => {
                  const val = e.target.checked;
                  setForm({ ...form, is_knockout: val });
                  if (val) setSelectedGroupId('');
                }}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="is_knockout" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                Là vòng đấu Knockout (cho phép đấu chéo bảng)
              </label>
            </div>
          </div>

          {!form.is_knockout && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Bảng đấu</label>
              <select
                className="input-field cursor-pointer"
                value={selectedGroupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                required={!form.is_knockout}
              >
                <option value="">-- Chọn Bảng đấu --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Vòng đấu / Lượt đấu</label>
            <input
              className="input-field"
              placeholder="ví dụ: Vòng bảng - Lượt 1"
              value={form.round}
              onChange={(e) => handleRoundChange(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Ngày thi đấu</label>
            <input className="input-field" type="date" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Giờ thi đấu</label>
            <input className="input-field" type="time" value={form.match_time} onChange={(e) => setForm({ ...form, match_time: e.target.value })} required />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Địa điểm (Sân thi đấu)</label>
            <input className="input-field" placeholder="Địa điểm (ví dụ: Sân bóng Phường)" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Đội A</label>
            <select
              className="input-field"
              value={form.team_a_id}
              onChange={(e) => setForm({ ...form, team_a_id: e.target.value })}
              required
              disabled={!form.is_knockout && !selectedGroupId}
            >
              <option value="">-- Chọn Đội A --</option>
              {filteredTeamsA.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Đội B</label>
            <select
              className="input-field"
              value={form.team_b_id}
              onChange={(e) => setForm({ ...form, team_b_id: e.target.value })}
              required
              disabled={!form.is_knockout && !selectedGroupId}
            >
              <option value="">-- Chọn Đội B --</option>
              {filteredTeamsB.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2 mt-2">
            <button type="submit" className="btn-primary text-sm px-5 py-2">Lưu lịch đấu</button>
            <button type="button" onClick={resetForm} className="btn-outline text-sm px-5 py-2">Hủy</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-styled">
          <thead>
            <tr>
              <th>Vòng</th>
              <th>Bảng</th>
              <th>Ngày</th>
              <th>Giờ</th>
              <th>Trận</th>
              <th>Sân</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold text-sm">{m.round}</td>
                <td className="text-sm font-medium text-gray-600">
                  {m.group?.name || m.group_name || <span className="text-gray-400 italic">Knockout</span>}
                </td>
                <td>{m.match_date}</td>
                <td>{m.match_time}</td>
                <td className="font-medium">
                  <span className="text-primary">{m.team_a?.name}</span> vs <span className="text-primary">{m.team_b?.name}</span>
                </td>
                <td>{m.venue}</td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {m.published ? 'Đã công bố' : m.status === 'finished' ? 'Đã kết quả' : 'Chưa đấu'}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleEdit(m)} className="text-primary text-sm mr-3 hover:underline">Sửa</button>
                  <button onClick={async () => { if (confirm('Bạn có chắc chắn muốn xóa lịch thi đấu này?')) { await api.delete(`/matches/${m.id}`); load(); } }} className="text-red-500 text-sm hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-gray-400 py-8 italic">Chưa có lịch thi đấu nào được tạo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
