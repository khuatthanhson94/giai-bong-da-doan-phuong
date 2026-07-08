import { useState, useEffect } from 'react';
import api from '../api/client';

function EventList({ title, items, onAdd, onRemove, players, showOwnGoal = false }) {
  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-xs text-gray-700">{title}</h4>
        <button type="button" onClick={onAdd} className="text-primary text-xs font-semibold hover:underline">+ Thêm</button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1 items-center mb-1.5">
          <select
            className="input-field flex-1 text-xs py-1 px-1 min-w-[90px]"
            value={item.player_id}
            onChange={(e) => onRemove(i, { ...item, player_id: Number(e.target.value) }, true)}
            required
          >
            <option value="">Cầu thủ</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (#{p.jersey_number})</option>
            ))}
          </select>
          <input
            type="number"
            className="input-field w-11 text-xs py-1 px-0.5 text-center"
            placeholder="Phút"
            min="1"
            value={item.minute || ''}
            onChange={(e) => onRemove(i, { ...item, minute: Number(e.target.value) }, true)}
            required
          />
          {showOwnGoal && (
            <label className="flex items-center gap-0.5 text-[9px] sm:text-[11px] font-semibold text-red-600 border border-red-200 rounded px-1 py-0.5 bg-red-50/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!item.is_own_goal}
                onChange={(e) => onRemove(i, { ...item, is_own_goal: e.target.checked }, true)}
                className="w-3 h-3 accent-red-600"
              />
              OG
            </label>
          )}
          <button type="button" onClick={() => onRemove(i, null, false)} className="text-red-500 text-sm px-1 hover:text-red-700">✕</button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-[11px] text-gray-400 italic text-center py-1">Chưa ghi nhận sự kiện nào</p>
      )}
    </div>
  );
}

export default function ResultEditorModal({ matchId, onClose, onSaved }) {
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
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
  });

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setMessage('');
    
    Promise.all([
      api.get(`/matches/${matchId}`),
      api.get('/players')
    ]).then(([m, allPlayers]) => {
      setMatch(m);
      setPlayers(allPlayers);

      const teamAPlayers = allPlayers.filter((p) => p.team_id === m.team_a_id);
      const teamBPlayers = allPlayers.filter((p) => p.team_id === m.team_b_id);

      const goalsA = m.goals?.filter(g => teamAPlayers.some(p => p.id === g.player_id)).map(g => ({ player_id: g.player_id, minute: g.minute, is_own_goal: !!g.is_own_goal })) || [];
      const goalsB = m.goals?.filter(g => teamBPlayers.some(p => p.id === g.player_id)).map(g => ({ player_id: g.player_id, minute: g.minute, is_own_goal: !!g.is_own_goal })) || [];

      const yellowA = m.yellow_cards?.filter(y => teamAPlayers.some(p => p.id === y.player_id)).map(y => ({ player_id: y.player_id, minute: y.minute })) || [];
      const yellowB = m.yellow_cards?.filter(y => teamBPlayers.some(p => p.id === y.player_id)).map(y => ({ player_id: y.player_id, minute: y.minute })) || [];

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
      setLoading(false);
    }).catch(err => {
      setMessage('Lỗi khi tải dữ liệu: ' + err.message);
      setLoading(false);
    });
  }, [matchId]);

  const teamAPlayers = match ? players.filter((p) => p.team_id === match.team_a_id) : [];
  const teamBPlayers = match ? players.filter((p) => p.team_id === match.team_b_id) : [];
  const matchPlayers = match
    ? players.filter((p) => p.team_id === match.team_a_id || p.team_id === match.team_b_id)
    : [];

  const updateList = (field, index, value, isUpdate) => {
    setForm((prev) => {
      const list = [...prev[field]];
      if (isUpdate) list[index] = value;
      else list.splice(index, 1);
      
      const newForm = { ...prev, [field]: list };
      
      if (field === 'goals_a' || field === 'goals_b') {
        const normalGoalsA = newForm.goals_a.filter(g => g.player_id && !g.is_own_goal).length;
        const ownGoalsB = newForm.goals_b.filter(g => g.player_id && g.is_own_goal).length;
        newForm.score_a = normalGoalsA + ownGoalsB;

        const normalGoalsB = newForm.goals_b.filter(g => g.player_id && !g.is_own_goal).length;
        const ownGoalsA = newForm.goals_a.filter(g => g.player_id && g.is_own_goal).length;
        newForm.score_b = normalGoalsB + ownGoalsA;
      }
      
      return newForm;
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
      await api.post(`/matches/${matchId}/result`, getMergedForm());
      setMessage('✅ Đã lưu kết quả (chưa công bố)');
      if (onSaved) onSaved();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handlePublish = async () => {
    setMessage('');
    try {
      await api.post(`/matches/${matchId}/result`, getMergedForm());
      await api.post(`/matches/${matchId}/publish`);
      setMessage('✅ Đã công bố kết quả thành công!');
      if (onSaved) onSaved();
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full text-center">
          <p className="text-gray-600 font-medium">Đang tải thông tin trận đấu...</p>
        </div>
      </div>
    );
  }

  if (!match) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in my-8">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg">
            Nhập kết quả: {match.team_a?.name} vs {match.team_b?.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl p-1">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="text-center bg-gray-50 p-2 rounded-lg text-xs font-semibold text-gray-600">
            {match.round} — {match.venue} — {match.match_date} lúc {match.match_time}
          </div>

          {/* Score inputs */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-4">
            <div className="text-center flex-1 max-w-[140px]">
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 truncate">{match.team_a?.name}</p>
              <input
                type="number"
                min="0"
                className="input-field w-20 sm:w-24 text-center text-2xl sm:text-3xl font-bold text-primary bg-gray-50 focus:ring-primary mx-auto"
                value={form.score_a}
                onChange={(e) => setForm({ ...form, score_a: Number(e.target.value) })}
              />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-gray-400 mt-6 flex-shrink-0">VS</span>
            <div className="text-center flex-1 max-w-[140px]">
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 truncate">{match.team_b?.name}</p>
              <input
                type="number"
                min="0"
                className="input-field w-20 sm:w-24 text-center text-2xl sm:text-3xl font-bold text-primary bg-gray-50 focus:ring-primary mx-auto"
                value={form.score_b}
                onChange={(e) => setForm({ ...form, score_b: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Event list - Divided into Two Columns (Team A vs Team B) */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team A Columns */}
            <div className="space-y-4 p-3 border border-blue-100 rounded-xl bg-blue-50/10">
              <h4 className="font-bold text-sm text-primary border-b pb-2 flex justify-between items-center">
                <span className="truncate max-w-[150px]">{match.team_a?.name}</span>
                <span className="text-[10px] font-normal text-gray-500 bg-blue-50 px-2 py-0.5 rounded flex-shrink-0">Đội chủ nhà</span>
              </h4>
              
              <EventList
                title="⚽ Bàn thắng"
                items={form.goals_a}
                players={teamAPlayers}
                showOwnGoal={true}
                onAdd={() => setForm(prev => ({ ...prev, goals_a: [...prev.goals_a, { player_id: '', minute: '', is_own_goal: false }] }))}
                onRemove={(i, v, isUpdate) => updateList('goals_a', i, v, isUpdate)}
              />
              <EventList
                title="🟨 Thẻ vàng"
                items={form.yellow_cards_a}
                players={teamAPlayers}
                onAdd={() => setForm(prev => ({ ...prev, yellow_cards_a: [...prev.yellow_cards_a, { player_id: '', minute: '' }] }))}
                onRemove={(i, v, isUpdate) => updateList('yellow_cards_a', i, v, isUpdate)}
              />
              <EventList
                title="🟥 Thẻ đỏ"
                items={form.red_cards_a}
                players={teamAPlayers}
                onAdd={() => setForm(prev => ({ ...prev, red_cards_a: [...prev.red_cards_a, { player_id: '', minute: '' }] }))}
                onRemove={(i, v, isUpdate) => updateList('red_cards_a', i, v, isUpdate)}
              />
            </div>

            {/* Team B Columns */}
            <div className="space-y-4 p-3 border border-orange-100 rounded-xl bg-orange-50/10">
              <h4 className="font-bold text-sm text-orange-600 border-b pb-2 flex justify-between items-center">
                <span className="truncate max-w-[150px]">{match.team_b?.name}</span>
                <span className="text-[10px] font-normal text-gray-500 bg-orange-50 px-2 py-0.5 rounded flex-shrink-0">Đội khách</span>
              </h4>

              <EventList
                title="⚽ Bàn thắng"
                items={form.goals_b}
                players={teamBPlayers}
                showOwnGoal={true}
                onAdd={() => setForm(prev => ({ ...prev, goals_b: [...prev.goals_b, { player_id: '', minute: '', is_own_goal: false }] }))}
                onRemove={(i, v, isUpdate) => updateList('goals_b', i, v, isUpdate)}
              />
              <EventList
                title="🟨 Thẻ vàng"
                items={form.yellow_cards_b}
                players={teamBPlayers}
                onAdd={() => setForm(prev => ({ ...prev, yellow_cards_b: [...prev.yellow_cards_b, { player_id: '', minute: '' }] }))}
                onRemove={(i, v, isUpdate) => updateList('yellow_cards_b', i, v, isUpdate)}
              />
              <EventList
                title="🟥 Thẻ đỏ"
                items={form.red_cards_b}
                players={teamBPlayers}
                onAdd={() => setForm(prev => ({ ...prev, red_cards_b: [...prev.red_cards_b, { player_id: '', minute: '' }] }))}
                onRemove={(i, v, isUpdate) => updateList('red_cards_b', i, v, isUpdate)}
              />
            </div>
          </div>

          {/* Other details */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-150">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">⭐ Cầu thủ xuất sắc nhất trận (MOTM)</label>
              <select
                className="input-field w-full max-w-full"
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
                className="input-field w-full max-w-full"
                rows={2}
                value={form.notes}
                placeholder="Ghi chú diễn biến trận đấu, chấn thương, sự cố nếu có..."
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-end bg-gray-55 rounded-b-2xl">
          <button onClick={onClose} className="btn-outline text-sm px-6 py-2 w-full sm:w-auto order-3 sm:order-1">
            Đóng
          </button>
          <button onClick={handleSave} className="btn-outline text-sm px-6 py-2 w-full sm:w-auto order-2 sm:order-2 bg-white">
            Lưu nháp
          </button>
          <button onClick={handlePublish} className="btn-secondary text-sm px-6 py-2 w-full sm:w-auto order-1 sm:order-3">
            Công bố kết quả
          </button>
        </div>
      </div>
    </div>
  );
}
