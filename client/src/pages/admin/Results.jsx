import { useEffect, useState } from 'react';
import api from '../../api/client';
import * as XLSX from 'xlsx';

function EventList({ title, items, onAdd, onRemove, players, showOwnGoal = false }) {
  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-xs text-gray-700">{title}</h4>
        <button type="button" onClick={onAdd} className="text-primary text-xs font-semibold hover:underline">+ Thêm</button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5 items-center mb-1.5">
          <select
            className="input-field flex-1 text-xs py-1 px-1.5"
            value={item.player_id}
            onChange={(e) => onRemove(i, { ...item, player_id: Number(e.target.value) }, true)}
            required
          >
            <option value="">Chọn cầu thủ</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>
            ))}
          </select>
          <input
            type="number"
            className="input-field w-14 text-xs py-1 text-center"
            placeholder="Phút"
            min="1"
            value={item.minute || ''}
            onChange={(e) => onRemove(i, { ...item, minute: Number(e.target.value) }, true)}
            required
          />
          {showOwnGoal && (
            <label className="flex items-center gap-1 text-[11px] font-semibold text-red-600 border border-red-200 rounded px-1.5 py-0.5 bg-red-50/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!item.is_own_goal}
                onChange={(e) => onRemove(i, { ...item, is_own_goal: e.target.checked }, true)}
                className="w-3.5 h-3.5 accent-red-600"
              />
              OG
            </label>
          )}
          <button type="button" onClick={() => onRemove(i, null, false)} className="text-red-500 text-sm px-1.5 hover:text-red-700">✕</button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-[10px] text-gray-400 text-center py-2 italic">Chưa có sự kiện nào.</p>
      )}
    </div>
  );
}

export default function AdminResults() {
  const [matches, setMatches] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [form, setForm] = useState({
    score_a: 0,
    score_b: 0,
    goals_a: [],
    goals_b: [],
    yellow_cards_a: [],
    yellow_cards_b: [],
    red_cards_a: [],
    red_cards_b: [],
    motm_player_id: '',
    notes: '',
    group_id: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/matches').then(setMatches);
    api.get('/players').then(setPlayers); api.get('/groups').then(setGroups);
  }, []);

  const exportResults = () => {
    const finishedMatches = matches.filter(m => m.status === 'finished' || m.score_a !== null);
    const headers = ['Vòng/Lượt', 'Bảng đấu', 'Ngày thi đấu', 'Giờ thi đấu', 'Đội A', 'Tỷ số A', 'Tỷ số B', 'Đội B', 'Địa điểm', 'Trạng thái'];
    const rows = finishedMatches.map((m) => {
      const groupName = m.group?.name || m.group_name || 'Knockout';
      const statusText = m.published ? 'Đã công bố' : 'Lưu nháp';
      return [
        m.round,
        groupName,
        m.match_date,
        m.match_time,
        m.team_a?.name || '',
        m.score_a,
        m.score_b,
        m.team_b?.name || '',
        m.venue,
        statusText
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kết quả trận đấu');
    XLSX.writeFile(wb, 'ket_qua_tran_dau.xlsx');
  };

  useEffect(() => {
    if (!selectedId || players.length === 0) return;
    api.get(`/matches/${selectedId}`).then((m) => {
      setMatch(m);

      const teamAPlayers = players.filter((p) => p.team_id === m.team_a_id);
      const teamBPlayers = players.filter((p) => p.team_id === m.team_b_id);

      // Distribute goals by checking team membership of goalscorers
      const goalsA = m.goals?.filter(g => teamAPlayers.some(p => p.id === g.player_id)).map(g => ({ player_id: g.player_id, minute: g.minute, is_own_goal: !!g.is_own_goal })) || [];
      const goalsB = m.goals?.filter(g => teamBPlayers.some(p => p.id === g.player_id)).map(g => ({ player_id: g.player_id, minute: g.minute, is_own_goal: !!g.is_own_goal })) || [];

      // Distribute yellow cards
      const yellowA = m.yellow_cards?.filter(y => teamAPlayers.some(p => p.id === y.player_id)).map(y => ({ player_id: y.player_id, minute: y.minute })) || [];
      const yellowB = m.yellow_cards?.filter(y => teamBPlayers.some(p => p.id === y.player_id)).map(y => ({ player_id: y.player_id, minute: y.minute })) || [];

      // Distribute red cards
      const redA = m.red_cards?.filter(r => teamAPlayers.some(p => p.id === r.player_id)).map(r => ({ player_id: r.player_id, minute: r.minute })) || [];
      const redB = m.red_cards?.filter(r => teamBPlayers.some(p => p.id === r.player_id)).map(r => ({ player_id: r.player_id, minute: r.minute })) || [];

      setForm({
        score_a: m.score_a ?? 0,
        score_b: m.score_b ?? 0,
        goals_a: goalsA,
        goals_b: goalsB,
        yellow_cards_a: yellowA,
        yellow_cards_b: yellowB,
        red_cards_a: redA,
        red_cards_b: redB,
        motm_player_id: m.motm_player_id || '',
        notes: m.notes || '',
      });
    });
  }, [selectedId, players]);

  // Effect to automatically calculate Score A and Score B based on entered goals and own goals
  useEffect(() => {
    if (!match) return;

    // Score A = Normal goals by A + Own goals by B
    const normalGoalsA = form.goals_a.filter(g => g.player_id && !g.is_own_goal).length;
    const ownGoalsB = form.goals_b.filter(g => g.player_id && g.is_own_goal).length;
    const computedScoreA = normalGoalsA + ownGoalsB;

    // Score B = Normal goals by B + Own goals by A
    const normalGoalsB = form.goals_b.filter(g => g.player_id && !g.is_own_goal).length;
    const ownGoalsA = form.goals_a.filter(g => g.player_id && g.is_own_goal).length;
    const computedScoreB = normalGoalsB + ownGoalsA;

    setForm(prev => {
      if (prev.score_a === computedScoreA && prev.score_b === computedScoreB) return prev;
      return {
        ...prev,
        score_a: computedScoreA,
        score_b: computedScoreB
      };
    });
  }, [form.goals_a, form.goals_b, match]);

  const teamAPlayers = match ? players.filter((p) => p.team_id === match.team_a_id) : [];
  const teamBPlayers = match ? players.filter((p) => p.team_id === match.team_b_id) : [];
  const matchPlayers = match
    ? players.filter((p) => p.team_id === match.team_a_id || p.team_id === match.team_b_id)
    : players;

  const updateList = (field, index, value, isUpdate) => {
    setForm((prev) => {
      const list = [...prev[field]];
      if (isUpdate) list[index] = value;
      else list.splice(index, 1);
      return { ...prev, [field]: list };
    });
  };

  const getMergedForm = () => {
    return {
      score_a: form.score_a,
      score_b: form.score_b,
      goals: [
        ...form.goals_a.map(g => ({ player_id: g.player_id, minute: g.minute, is_own_goal: g.is_own_goal ? 1 : 0 })),
        ...form.goals_b.map(g => ({ player_id: g.player_id, minute: g.minute, is_own_goal: g.is_own_goal ? 1 : 0 }))
      ],
      yellow_cards: [...form.yellow_cards_a, ...form.yellow_cards_b],
      red_cards: [...form.red_cards_a, ...form.red_cards_b],
      motm_player_id: form.motm_player_id ? Number(form.motm_player_id) : null,
      notes: form.notes,
    };
  };

  const handleSave = async () => {
    setMessage('');
    try {
      await api.post(`/matches/${selectedId}/result`, getMergedForm());
      setMessage('Đã lưu kết quả (chưa công bố)');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handlePublish = async () => {
    setMessage('');
    try {
      await api.post(`/matches/${selectedId}/result`, getMergedForm());
      await api.post(`/matches/${selectedId}/publish`);
      setMessage('✅ Đã công bố! Bảng xếp hạng và thống kê điểm số, danh sách ghi bàn đã được cập nhật.');
      api.get('/matches').then(setMatches);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-primary">Nhập kết quả trận đấu</h1>
        <button onClick={exportResults} className="btn-outline text-sm flex items-center gap-1">
          📥 Xuất Excel
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">Nhập tỷ số và chi tiết sự kiện cho trận đấu. Sau khi "Công bố", hệ thống sẽ tự động cập nhật Bảng xếp hạng và Danh sách vua phá lưới.</p>
      <div className="flex items-center gap-4 mb-6">
  <select className="input-field" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
    <option value="">-- Tất cả bảng --</option>
    {groups.map((g) => (
      <option key={g.id} value={g.id}> {g.name} </option>
    ))}
  </select>
  <select className="input-field max-w-lg" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
    <option value="">Chọn trận đấu</option>
    {matches.filter((m) => !groupFilter || (m.group && m.group.id === Number(groupFilter))).map((m) => (
      <option key={m.id} value={m.id}>
        {m.match_date} — {m.group?.name ? `[Bảng ${m.group.name}] ` : ''}{m.team_a?.name} vs {m.team_b?.name} {m.published ? '(Đã công bố)' : ''}
      </option>
    ))}
  </select>
</div>

      {match && (
        <div className="space-y-6 animate-fade-in">
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4 text-center text-primary border-b pb-2">
              {match.round} — {match.venue}
            </h3>

            {/* Score inputs */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 mb-2">{match.team_a?.name}</p>
                <input
                  type="number"
                  min="0"
                  className="input-field w-24 text-center text-3xl font-bold text-primary bg-gray-50 focus:ring-primary"
                  value={form.score_a}
                  onChange={(e) => setForm({ ...form, score_a: Number(e.target.value) })}
                />
              </div>
              <span className="text-3xl font-bold text-gray-400 mt-6">VS</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 mb-2">{match.team_b?.name}</p>
                <input
                  type="number"
                  min="0"
                  className="input-field w-24 text-center text-3xl font-bold text-primary bg-gray-50 focus:ring-primary"
                  value={form.score_b}
                  onChange={(e) => setForm({ ...form, score_b: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Event list - Divided into Two Columns (Team A vs Team B) */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Team A Columns */}
              <div className="space-y-4 p-4 border border-blue-100 rounded-xl bg-blue-50/10">
                <h4 className="font-bold text-sm text-primary border-b pb-2 flex justify-between items-center">
                  <span>{match.team_a?.name}</span>
                  <span className="text-xs font-normal text-gray-500 bg-blue-50 px-2 py-0.5 rounded">Đội chủ nhà</span>
                </h4>
                
                <EventList
                  title="⚽ Bàn thắng"
                  items={form.goals_a}
                  players={teamAPlayers}
                  showOwnGoal={true}
                  onAdd={() => setForm({ ...form, goals_a: [...form.goals_a, { player_id: '', minute: '', is_own_goal: false }] })}
                  onRemove={(i, v, isUpdate) => updateList('goals_a', i, v, isUpdate)}
                />
                <EventList
                  title="🟨 Thẻ vàng"
                  items={form.yellow_cards_a}
                  players={teamAPlayers}
                  onAdd={() => setForm({ ...form, yellow_cards_a: [...form.yellow_cards_a, { player_id: '', minute: '' }] })}
                  onRemove={(i, v, isUpdate) => updateList('yellow_cards_a', i, v, isUpdate)}
                />
                <EventList
                  title="🟥 Thẻ đỏ"
                  items={form.red_cards_a}
                  players={teamAPlayers}
                  onAdd={() => setForm({ ...form, red_cards_a: [...form.red_cards_a, { player_id: '', minute: '' }] })}
                  onRemove={(i, v, isUpdate) => updateList('red_cards_a', i, v, isUpdate)}
                />
              </div>

              {/* Team B Columns */}
              <div className="space-y-4 p-4 border border-orange-100 rounded-xl bg-orange-50/10">
                <h4 className="font-bold text-sm text-orange-600 border-b pb-2 flex justify-between items-center">
                  <span>{match.team_b?.name}</span>
                  <span className="text-xs font-normal text-gray-500 bg-orange-50 px-2 py-0.5 rounded">Đội khách</span>
                </h4>
                
                <EventList
                  title="⚽ Bàn thắng"
                  items={form.goals_b}
                  players={teamBPlayers}
                  showOwnGoal={true}
                  onAdd={() => setForm({ ...form, goals_b: [...form.goals_b, { player_id: '', minute: '', is_own_goal: false }] })}
                  onRemove={(i, v, isUpdate) => updateList('goals_b', i, v, isUpdate)}
                />
                <EventList
                  title="🟨 Thẻ vàng"
                  items={form.yellow_cards_b}
                  players={teamBPlayers}
                  onAdd={() => setForm({ ...form, yellow_cards_b: [...form.yellow_cards_b, { player_id: '', minute: '' }] })}
                  onRemove={(i, v, isUpdate) => updateList('yellow_cards_b', i, v, isUpdate)}
                />
                <EventList
                  title="🟥 Thẻ đỏ"
                  items={form.red_cards_b}
                  players={teamBPlayers}
                  onAdd={() => setForm({ ...form, red_cards_b: [...form.red_cards_b, { player_id: '', minute: '' }] })}
                  onRemove={(i, v, isUpdate) => updateList('red_cards_b', i, v, isUpdate)}
                />
              </div>
            </div>

            {/* Other details */}
            <div className="grid md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-gray-150">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">⭐ Cầu thủ xuất sắc nhất trận (MOTM)</label>
                <select
                  className="input-field"
                  value={form.motm_player_id}
                  onChange={(e) => setForm({ ...form, motm_player_id: e.target.value })}
                >
                  <option value="">Chọn cầu thủ...</option>
                  {matchPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.jersey_number}) - {p.team_id === match.team_a_id ? match.team_a?.name : match.team_b?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú / Biên bản trận đấu</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={form.notes}
                  placeholder="Ghi chú diễn biến trận đấu, chấn thương, sự cố nếu có..."
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={handleSave} className="btn-outline text-sm px-6 py-2">
                Lưu nháp
              </button>
              <button onClick={handlePublish} className="btn-secondary text-sm px-6 py-2">
                Công bố kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
