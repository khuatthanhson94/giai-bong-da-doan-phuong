import { useEffect, useState } from 'react';
import api from '../../api/client';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import ResultEditorModal from '../../components/ResultEditorModal';

export default function AdminMatches() {
  const { user } = useAuth();
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
    is_friendly: false,
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMatchIdForResults, setSelectedMatchIdForResults] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = () => {
    api.get('/matches').then((data) => {
      setMatches(data);
      setSelectedIds([]);
    });
    api.get('/groups').then(setGroups);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} trận đấu đã chọn?`)) return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/matches/${id}`);
      }
      alert('Đã xóa thành công các trận đấu được chọn.');
      load();
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi xóa các trận đấu.');
    }
  };

  useEffect(() => {
    load();
    api.get('/teams').then(setTeams);
  }, []);

  const exportMatches = () => {
    const headers = ['Vòng/Lượt', 'Bảng đấu', 'Ngày thi đấu', 'Giờ thi đấu', 'Đội A', 'Đội B', 'Địa điểm (Sân)', 'Trạng thái'];
    const rows = matches.map((m) => {
      const groupName = m.group?.name || m.group_name || 'Knockout';
      const statusText = m.published ? 'Đã công bố' : m.status === 'finished' ? 'Đã kết quả' : 'Chưa đấu';
      return [
        m.round,
        groupName,
        m.match_date,
        m.match_time,
        m.team_a?.name || '',
        m.team_b?.name || '',
        m.venue,
        statusText
      ];
    });
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch thi đấu');
    XLSX.writeFile(wb, 'lich_thi_dau.xlsx');
  };

  const handleRoundChange = (val) => {
    if (form.is_friendly) {
      setForm({ ...form, round: val });
      return;
    }
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
    
    setSelectedGroupId((isKO || m.is_friendly) ? '' : (teamA?.group_id || ''));
    setForm({
      round: m.round || '',
      match_date: m.match_date || '',
      match_time: m.match_time || '08:00',
      venue: m.venue || '',
      team_a_id: String(m.team_a_id || ''),
      team_b_id: String(m.team_b_id || ''),
      is_knockout: isKO,
      is_friendly: !!m.is_friendly,
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
      is_friendly: false,
    });
    setSelectedGroupId('');
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
 
    const teamA = teams.find(t => t.id === Number(form.team_a_id));
    const teamB = teams.find(t => t.id === Number(form.team_b_id));
 
    // Validation 1: At group stage, team A and team B must belong to the same group (skip for friendly matches)
    if (!form.is_knockout && !form.is_friendly) {
      if (teamA && teamB) {
        if (!teamA.group_id || !teamB.group_id || teamA.group_id !== teamB.group_id) {
          alert(
            `Không thể tạo lịch thi đấu chéo bảng ở vòng bảng!\n` +
            `- Đội ${teamA.name}: ${teamA.group_name || 'Chưa phân bảng'}\n` +
            `- Đội ${teamB.name}: ${teamB.group_name || 'Chưa phân bảng'}\n` +
            `Hãy chọn hai đội cùng một bảng đấu, hoặc tích chọn "Là vòng đấu Knockout" hoặc "Trận giao hữu".`
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
      is_friendly: form.is_friendly ? 1 : 0,
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
    // If not knockout, not friendly and a group is selected, only show teams in that group
    if (!form.is_knockout && !form.is_friendly && selectedGroupId) {
      return t.group_id === selectedGroupId;
    }
    return true;
  });
 
  // Filter dropdown options for Team B
  const filteredTeamsB = teams.filter(t => {
    if (t.id === Number(form.team_a_id)) return false;
    // If not knockout, not friendly and a group is selected, only show teams in that group
    if (!form.is_knockout && !form.is_friendly && selectedGroupId) {
      return t.group_id === selectedGroupId;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">Quản lý lịch thi đấu</h1>
        <div className="flex flex-wrap justify-center sm:justify-end gap-2">
          <button onClick={exportMatches} className="btn-outline text-sm flex items-center gap-1 py-2 px-3">
            📥 Xuất Excel
          </button>
          {user?.role !== 'scorekeeper' && (
            <>
              <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm py-2 px-4">+ Tạo lịch</button>
              <button onClick={handleAutoGenerate} className="btn-secondary text-sm py-2 px-4">Tự động tạo lịch</button>
            </>
          )}
        </div>
      </div>

      {/* Form Popup Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-fade-in text-left">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 select-none">
              <h3 className="font-extrabold text-gray-800 text-base">
                {editId ? '📝 Chỉnh sửa lịch thi đấu' : '➕ Tạo lịch thi đấu mới'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto grid md:grid-cols-2 gap-4 flex-1">

              {!form.is_friendly && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Kiểu vòng đấu</label>
                  <div className="flex items-center h-10 border rounded bg-white px-3 gap-2">
                    <input
                      type="checkbox"
                      id="is_knockout"
                      checked={form.is_knockout}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setForm(prev => ({
                          ...prev,
                          is_knockout: val,
                          is_friendly: val ? false : prev.is_friendly,
                          round: val 
                            ? (prev.round.toLowerCase().includes('bảng') || prev.round.toLowerCase().includes('lượt') || !prev.round ? 'Knockout' : prev.round) 
                            : 'Vòng bảng - Lượt 1'
                        }));
                        if (val) setSelectedGroupId('');
                      }}
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="is_knockout" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                      Là vòng đấu Knockout (cho phép đấu chéo bảng)
                    </label>
                  </div>
                </div>
              )}

              {!form.is_knockout && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Trận giao hữu</label>
                  <div className="flex items-center h-10 border rounded bg-white px-3 gap-2">
                    <input
                      type="checkbox"
                      id="is_friendly"
                      checked={form.is_friendly}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setForm(prev => ({
                          ...prev,
                          is_friendly: val,
                          is_knockout: val ? false : prev.is_knockout,
                          round: val 
                            ? (prev.round.toLowerCase().includes('bảng') || prev.round.toLowerCase().includes('lượt') || !prev.round ? 'Giao hữu' : prev.round)
                            : prev.round
                        }));
                        if (val) setSelectedGroupId('');
                      }}
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="is_friendly" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                      Là trận đấu giao hữu (không tính điểm xếp hạng)
                    </label>
                  </div>
                </div>
              )}
 
              {!form.is_knockout && !form.is_friendly && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-600">Bảng đấu</label>
                  <select
                    className="input-field cursor-pointer"
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    required={!form.is_knockout && !form.is_friendly}
                  >
                    <option value="">-- Chọn Bảng đấu --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">{form.is_friendly ? 'Tên trận đấu / Mô tả' : 'Vòng đấu / Lượt đấu'}</label>
            <input
              className="input-field"
              placeholder={form.is_friendly ? "ví dụ: Giao hữu Việt Nam - Thái Lan" : "ví dụ: Vòng bảng - Lượt 1"}
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
              disabled={!form.is_knockout && !form.is_friendly && !selectedGroupId}
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
              disabled={!form.is_knockout && !form.is_friendly && !selectedGroupId}
            >
              <option value="">-- Chọn Đội B --</option>
              {filteredTeamsB.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-55 select-none md:col-span-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm px-5 py-2">
                Hủy bỏ
              </button>
              <button type="submit" className="btn-primary text-sm px-6 py-2 shadow-md">
                Lưu lịch đấu
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedIds.length > 0 && user?.role !== 'scorekeeper' && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 animate-fade-in">
          <span className="text-sm font-semibold text-red-700">
            Đang chọn <span className="font-bold">{selectedIds.length}</span> trận đấu
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
              {user?.role !== 'scorekeeper' && (
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={matches.length > 0 && selectedIds.length === matches.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(matches.map(m => m.id));
                      else setSelectedIds([]);
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
              )}
              <th>Vòng</th>
              <th className="w-16 text-center">STT</th>
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
            {matches.map((m, idx) => (
              <tr key={m.id}>
                {user?.role !== 'scorekeeper' && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, m.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== m.id));
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </td>
                )}
                <td className="text-center text-gray-500 font-medium">{idx + 1}</td>
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
                  <div className="flex flex-wrap gap-2">
                    {user?.role !== 'scorekeeper' && (
                      <>
                        <button onClick={() => handleEdit(m)} className="text-primary text-sm hover:underline">Sửa</button>
                        <button onClick={async () => { if (confirm('Bạn có chắc chắn muốn xóa lịch thi đấu này?')) { await api.delete(`/matches/${m.id}`); load(); } }} className="text-red-500 text-sm hover:underline">Xóa</button>
                      </>
                    )}
                    <button onClick={() => setSelectedMatchIdForResults(m.id)} className="text-youth-dark text-sm font-semibold hover:underline">
                      Nhập kết quả
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={user?.role !== 'scorekeeper' ? "10" : "9"} className="text-center text-gray-400 py-8 italic">Chưa có lịch thi đấu nào được tạo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedMatchIdForResults && (
        <ResultEditorModal
          matchId={selectedMatchIdForResults}
          onClose={() => setSelectedMatchIdForResults(null)}
          onSaved={() => {
            load();
            setSelectedMatchIdForResults(null);
          }}
        />
      )}
    </div>
  );
}
