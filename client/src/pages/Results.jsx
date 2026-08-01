import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { getFullUrl } from '../utils/url';

export default function Results() {
  const [matches, setMatches] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filters, setFilters] = useState({ round: '', team_id: '' });
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('group'); // 'group' or 'knockout'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const detailRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/matches/rounds'),
      api.get('/teams'),
    ]).then(([r, t]) => {
      setRounds(r || []);
      setTeams(t || []);
    });

    api.get('/matches?status=finished&published=1').then((res) => {
      setMatches(res);
      const searchParams = new URLSearchParams(window.location.search);
      const matchIdParam = searchParams.get('match_id');
      if (matchIdParam) {
        const found = res.find(m => String(m.id) === String(matchIdParam));
        if (found) {
          const isGroup = /bảng|lượt|group/i.test(found.round);
          setActiveTab(isGroup ? 'group' : 'knockout');
          setSelected(found);
          setIsModalOpen(true);
          return;
        }
      }
      // Select the first match by default if available
      const groupMatches = res.filter(m => /bảng|lượt|group/i.test(m.round));
      if (groupMatches.length > 0) {
        setSelected(groupMatches[0]);
      } else if (res.length > 0) {
        setSelected(res[0]);
      }
    });
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, round: '' }));
    const filtered = matches.filter((m) => {
      const isGroup = /bảng|lượt|group/i.test(m.round);
      return tab === 'group' ? isGroup : !isGroup;
    });
    setSelected(filtered.length > 0 ? filtered[0] : null);
  };

  // Filter dropdown rounds based on active tab
  const displayedRounds = rounds.filter((r) => {
    const isGroupRound = /bảng|lượt|group/i.test(r);
    return activeTab === 'group' ? isGroupRound : !isGroupRound;
  });

  // Filter matches based on active tab & selected filters
  const displayedMatches = matches.filter((m) => {
    const isGroupRound = /bảng|lượt|group/i.test(m.round);
    const tabMatch = activeTab === 'group' ? isGroupRound : !isGroupRound;
    if (!tabMatch) return false;

    if (filters.round && m.round !== filters.round) return false;
    if (filters.team_id) {
      const targetIdStr = String(filters.team_id);
      const teamAStr = String(m.team_a_id || m.team_a?.id);
      const teamBStr = String(m.team_b_id || m.team_b?.id);
      if (teamAStr !== targetIdStr && teamBStr !== targetIdStr) return false;
    }
    return true;
  });

  const getEventsForTeam = (m, targetTeamId) => {
    if (!m || !targetTeamId) return [];
    const map = new Map();
    const targetIdStr = String(targetTeamId);
    const teamAIdStr = String(m.team_a_id);
    const teamBIdStr = String(m.team_b_id);

    const addEvent = (key, type, icon, player_name, jersey_number, team_name, minute, suffix = '') => {
      const name = player_name || 'Cầu thủ';
      const jerseyStr = jersey_number ? ` #${jersey_number}` : '';
      const fullName = `${name}${jerseyStr}`;
      
      if (!map.has(key)) {
        map.set(key, {
          type,
          icon,
          player_name: fullName,
          team_name,
          minutes: [],
          suffix,
          minMinute: Number(minute) || 0
        });
      }
      const item = map.get(key);
      item.minutes.push(Number(minute) || 0);
      if ((Number(minute) || 0) < item.minMinute) {
        item.minMinute = Number(minute) || 0;
      }
    };

    const resolveTeamIdStr = (item) => {
      if (item.team_id) return String(item.team_id);
      if (item.team_name) {
        const teamAName = m.team_a_name || m.team_a?.name;
        const teamBName = m.team_b_name || m.team_b?.name;
        if (teamAName && item.team_name === teamAName) return teamAIdStr;
        if (teamBName && item.team_name === teamBName) return teamBIdStr;
      }
      return null;
    };

    if (m.goals) {
      m.goals.forEach((g, idx) => {
        const resolvedTeamIdStr = resolveTeamIdStr(g);
        const isOwnGoal = Boolean(g.is_own_goal);

        if (!isOwnGoal) {
          const isForTarget = resolvedTeamIdStr ? (resolvedTeamIdStr === targetIdStr) : (targetIdStr === teamAIdStr);
          if (isForTarget) {
            addEvent(`goal:${g.player_name}_${g.player_id || idx}`, 'goal', '⚽', g.player_name, g.jersey_number, g.team_name, g.minute);
          }
        } else {
          const isForTarget = resolvedTeamIdStr ? (resolvedTeamIdStr !== targetIdStr) : (targetIdStr === teamBIdStr);
          if (isForTarget) {
            addEvent(`og:${g.player_name}_${g.player_id || idx}`, 'goal', '⚽', g.player_name, g.jersey_number, g.team_name, g.minute, ' (OG - Phản lưới)');
          }
        }
      });
    }

    if (m.yellow_cards) {
      m.yellow_cards.forEach((y, idx) => {
        const resolvedTeamIdStr = resolveTeamIdStr(y) || targetIdStr;
        if (resolvedTeamIdStr === targetIdStr) {
          addEvent(`yellow:${y.player_name}_${y.player_id || idx}`, 'yellow', '🟨', y.player_name, y.jersey_number, y.team_name, y.minute);
        }
      });
    }

    if (m.red_cards) {
      m.red_cards.forEach((r, idx) => {
        const resolvedTeamIdStr = resolveTeamIdStr(r) || targetIdStr;
        if (resolvedTeamIdStr === targetIdStr) {
          addEvent(`red:${r.player_name}_${r.player_id || idx}`, 'red', '🟥', r.player_name, r.jersey_number, r.team_name, r.minute);
        }
      });
    }

    const list = Array.from(map.values()).map(item => {
      item.minutes.sort((a, b) => a - b);
      item.minutesStr = item.minutes.map(min => `${min}'`).join(', ');
      return item;
    });

    return list.sort((a, b) => a.minMinute - b.minMinute);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-primary flex items-center gap-2">
            <span>🏆</span> KẾT QUẢ TRẬN ĐẤU
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Danh sách kết quả các trận đấu đã kết thúc. Bấm vào trận đấu để xem chi tiết cầu thủ ghi bàn và biên bản</p>
        </div>
        
        {/* Stage Tabs (Responsive for Mobile) */}
        <div className="flex w-full sm:w-auto bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => handleTabChange('group')}
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'group'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ⚽ Vòng bảng
          </button>
          <button
            onClick={() => handleTabChange('knockout')}
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'knockout'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🏆 Vòng Knockout
          </button>
        </div>
      </div>

      {/* Filter panel (Round and Team Selectors) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-3 sm:gap-4 items-center">
        <div className="flex flex-col gap-1 min-w-[160px] flex-1 sm:flex-none">
          <label className="text-[11px] sm:text-xs font-extrabold text-gray-600 flex items-center gap-1">
            <span>🎯</span> Vòng đấu
          </label>
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            value={filters.round}
            onChange={(e) => setFilters({ ...filters, round: e.target.value })}
          >
            <option value="">Tất cả các vòng</option>
            {displayedRounds.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[160px] flex-1 sm:flex-none">
          <label className="text-[11px] sm:text-xs font-extrabold text-gray-600 flex items-center gap-1">
            <span>🛡️</span> Đội bóng
          </label>
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            value={filters.team_id}
            onChange={(e) => setFilters({ ...filters, team_id: e.target.value })}
          >
            <option value="">Tất cả các đội</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {(filters.round || filters.team_id) && (
          <button
            onClick={() => setFilters({ round: '', team_id: '' })}
            className="self-end px-3.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-extrabold text-xs transition-all flex items-center gap-1 border border-red-200"
          >
            <span>✕</span> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Matches Grid - Condensed Schedule Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {displayedMatches.map((m) => {
          const isSelected = selected?.id === m.id;

          return (
            <div
              key={m.id}
              onClick={() => {
                setSelected(m);
                setIsModalOpen(true);
                window.history.replaceState(null, '', `?match_id=${m.id}`);
              }}
              className={`bg-white p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg hover:border-primary group flex flex-col justify-between ${
                isSelected ? 'border-primary ring-2 ring-primary/20 bg-blue-50/20' : 'border-gray-200'
              }`}
            >
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-3">
                  <span className="text-primary truncate max-w-[160px] sm:max-w-[180px] font-extrabold">{m.round}</span>
                  <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold text-[10px] sm:text-[11px] whitespace-nowrap">
                    Đã kết thúc
                  </span>
                </div>

                {/* Scoreboard row with min-w-0 for mobile wrap */}
                <div className="flex items-center justify-between gap-2 border-b pb-4">
                  <div className="flex-1 text-center min-w-0">
                    {m.team_a_logo || m.team_a?.logo ? (
                      <img src={getFullUrl(m.team_a_logo || m.team_a?.logo)} alt="" className="w-10 h-10 sm:w-14 sm:h-14 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100 group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-xs sm:text-lg mb-1.5 shadow-sm">
                        {(m.team_a_name || m.team_a?.name)?.charAt(0)}
                      </div>
                    )}
                    <p className="font-extrabold text-[11px] sm:text-sm text-gray-800 break-words leading-tight">{m.team_a_name || m.team_a?.name}</p>
                  </div>

                  <div className="text-center px-1 sm:px-2 flex-shrink-0">
                    <div className="text-xl sm:text-3xl font-black text-primary bg-blue-50 border border-blue-200 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl shadow-inner font-mono tracking-tighter">
                      {m.score_a ?? 0} - {m.score_b ?? 0}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 block mt-1">FT (90')</span>
                  </div>

                  <div className="flex-1 text-center min-w-0">
                    {m.team_b_logo || m.team_b?.logo ? (
                      <img src={getFullUrl(m.team_b_logo || m.team_b?.logo)} alt="" className="w-10 h-10 sm:w-14 sm:h-14 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100 group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-xs sm:text-lg mb-1.5 shadow-sm">
                        {(m.team_b_name || m.team_b?.name)?.charAt(0)}
                      </div>
                    )}
                    <p className="font-extrabold text-[11px] sm:text-sm text-gray-800 break-words leading-tight">{m.team_b_name || m.team_b?.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 text-[11px] sm:text-xs text-gray-500 flex justify-between items-center border-t">
                <span className="truncate">📅 {m.match_date} • 🏟️ {m.venue || 'Chưa xếp sân'}</span>
                <span className="text-primary font-bold group-hover:underline flex-shrink-0 ml-2">Xem chi tiết →</span>
              </div>
            </div>
          );
        })}
      </div>

      {displayedMatches.length === 0 && (
        <div className="card p-8 sm:p-12 text-center text-gray-400 italic border border-dashed">
          <span className="text-3xl sm:text-4xl block mb-2">🏆</span>
          <p className="font-medium text-xs sm:text-sm">Chưa có kết quả trận đấu {activeTab === 'group' ? 'vòng bảng' : 'vòng knockout'} nào được công bố.</p>
        </div>
      )}

      {/* Modal Detail Pop-up for Mobile & Desktop View */}
      {isModalOpen && selected && (() => {
        const eventsA = getEventsForTeam(selected, selected.team_a_id);
        const eventsB = getEventsForTeam(selected, selected.team_b_id);

        return (
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-6 relative my-auto"
            >
              {/* Close button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-base sm:text-lg transition z-10"
              >
                ✕
              </button>

              <div className="flex justify-between items-center text-xs font-bold text-gray-500 border-b pb-3 pr-8">
                <span className="text-primary font-bold text-xs sm:text-sm truncate max-w-[200px]">{selected.round}</span>
                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold text-[10px] sm:text-xs whitespace-nowrap">
                  Đã kết thúc
                </span>
              </div>

              {/* Scoreboard row with Logos (Responsive Mobile) */}
              <div className="flex items-center justify-between gap-2 sm:gap-4 border-b pb-4 sm:pb-5">
                <div className="flex-1 text-center min-w-0">
                  {selected.team_a_logo || selected.team_a?.logo ? (
                    <img src={getFullUrl(selected.team_a_logo || selected.team_a?.logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-sm sm:text-xl mb-1.5 shadow-sm">
                      {(selected.team_a_name || selected.team_a?.name)?.charAt(0)}
                    </div>
                  )}
                  <p className="font-extrabold text-xs sm:text-base text-gray-800 break-words leading-tight">{selected.team_a_name || selected.team_a?.name}</p>
                </div>

                <div className="text-center px-1 sm:px-4 flex-shrink-0">
                  <div className="text-2xl sm:text-4xl font-black text-primary bg-blue-50 border border-blue-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-inner font-mono tracking-tighter">
                    {selected.score_a ?? 0} - {selected.score_b ?? 0}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-gray-400 block mt-1.5">FT (90')</span>
                </div>

                <div className="flex-1 text-center min-w-0">
                  {selected.team_b_logo || selected.team_b?.logo ? (
                    <img src={getFullUrl(selected.team_b_logo || selected.team_b?.logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-sm sm:text-xl mb-1.5 shadow-sm">
                      {(selected.team_b_name || selected.team_b?.name)?.charAt(0)}
                    </div>
                  )}
                  <p className="font-extrabold text-xs sm:text-base text-gray-800 break-words leading-tight">{selected.team_b_name || selected.team_b?.name}</p>
                </div>
              </div>

              {/* Match info row */}
              <div className="text-[11px] sm:text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-2.5 sm:p-3 rounded-xl border">
                <span>🏟️ Sân: <strong className="text-gray-700">{selected.venue || 'Chưa cập nhật'}</strong></span>
                <span>📅 Ngày: <strong className="text-gray-700">{selected.match_date} {selected.match_time}</strong></span>
              </div>

              {/* LiveScore Style Event Summary Box */}
              <div className="space-y-2">
                <div className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5">⚽ CẦU THỦ GHI BÀN & DIỄN BIẾN</span>
                  <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">Gộp 1 dòng / cầu thủ</span>
                </div>

                {(eventsA.length > 0 || eventsB.length > 0) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-700 bg-blue-50/40 p-2.5 sm:p-3.5 rounded-xl border border-blue-100">
                    {/* Team A Events */}
                    <div className="space-y-1.5 text-left sm:border-r sm:pr-3 border-gray-200 pb-2 sm:pb-0 border-b sm:border-b-0">
                      <div className="font-bold text-[10px] sm:text-[11px] text-primary sm:hidden mb-1 flex items-center gap-1 border-b border-blue-100 pb-0.5">
                        <span>🛡️</span> {selected.team_a_name || selected.team_a?.name}
                      </div>
                      {eventsA.map((evt, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-1 font-medium leading-relaxed break-words">
                          <span className="flex-shrink-0">{evt.icon}</span>
                          <span className="font-bold text-gray-900">{evt.player_name}</span>
                          <span className="text-primary font-black whitespace-nowrap">({evt.minutesStr})</span>
                          {evt.suffix && (
                            <span className="text-red-600 font-bold text-[10px] bg-red-100 px-1.5 py-0.5 rounded border border-red-200 whitespace-nowrap">
                              {evt.suffix}
                            </span>
                          )}
                        </div>
                      ))}
                      {eventsA.length === 0 && <span className="text-[11px] text-gray-400 italic">Chưa có sự kiện</span>}
                    </div>

                    {/* Team B Events */}
                    <div className="space-y-1.5 text-left sm:text-right sm:pl-3 pt-1 sm:pt-0">
                      <div className="font-bold text-[10px] sm:text-[11px] text-primary sm:hidden mb-1 flex items-center gap-1 border-b border-blue-100 pb-0.5">
                        <span>🛡️</span> {selected.team_b_name || selected.team_b?.name}
                      </div>
                      {eventsB.map((evt, idx) => (
                        <div key={idx} className="flex flex-wrap items-center sm:justify-end gap-1 font-medium leading-relaxed break-words">
                          <span className="sm:hidden flex-shrink-0">{evt.icon}</span>
                          {evt.suffix && (
                            <span className="text-red-600 font-bold text-[10px] bg-red-100 px-1.5 py-0.5 rounded border border-red-200 whitespace-nowrap">
                              {evt.suffix}
                            </span>
                          )}
                          <span className="text-primary font-black whitespace-nowrap">({evt.minutesStr})</span>
                          <span className="font-bold text-gray-900">{evt.player_name}</span>
                          <span className="hidden sm:inline-block flex-shrink-0">{evt.icon}</span>
                        </div>
                      ))}
                      {eventsB.length === 0 && <span className="text-[11px] text-gray-400 italic">Chưa có sự kiện</span>}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-2.5 bg-gray-50 rounded-lg border">Không có bàn thắng hoặc thẻ phạt trong trận này</p>
                )}
              </div>

              {/* Detailed Cards Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {selected.yellow_cards?.length > 0 && (() => {
                  const map = new Map();
                  selected.yellow_cards.forEach(y => {
                    const key = `${y.player_name}_${y.jersey_number || ''}_${y.team_name || ''}`;
                    if (!map.has(key)) {
                      map.set(key, { player_name: y.player_name, jersey_number: y.jersey_number, team_name: y.team_name, minutes: [], minMinute: Number(y.minute) || 0 });
                    }
                    const item = map.get(key);
                    item.minutes.push(Number(y.minute) || 0);
                    if ((Number(y.minute) || 0) < item.minMinute) item.minMinute = Number(y.minute) || 0;
                  });
                  const groupedYellows = Array.from(map.values()).map(i => { i.minutes.sort((a,b)=>a-b); return i; }).sort((a,b)=>a.minMinute-b.minMinute);

                  return (
                    <div className="bg-yellow-50/50 p-3 sm:p-4 rounded-xl border border-yellow-100">
                      <h3 className="font-bold text-yellow-600 mb-2 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>🟨</span> THẺ VÀNG
                      </h3>
                      <div className="space-y-1.5">
                        {groupedYellows.map((y, idx) => (
                          <div key={idx} className="text-xs text-gray-700 font-medium flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-primary">{y.minutes.map(m => `${m}'`).join(', ')}</span> - 
                            <span className="font-bold text-gray-900">{y.player_name}</span>
                            {y.jersey_number ? <span className="text-yellow-700 font-bold bg-yellow-100 px-1 py-0.5 rounded text-[10px]">#{y.jersey_number}</span> : null}
                            {y.team_name ? <span className="text-gray-500 text-[11px]">({y.team_name})</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {selected.red_cards?.length > 0 && (() => {
                  const map = new Map();
                  selected.red_cards.forEach(r => {
                    const key = `${r.player_name}_${r.jersey_number || ''}_${r.team_name || ''}`;
                    if (!map.has(key)) {
                      map.set(key, { player_name: r.player_name, jersey_number: r.jersey_number, team_name: r.team_name, minutes: [], minMinute: Number(r.minute) || 0 });
                    }
                    const item = map.get(key);
                    item.minutes.push(Number(r.minute) || 0);
                    if ((Number(r.minute) || 0) < item.minMinute) item.minMinute = Number(r.minute) || 0;
                  });
                  const groupedReds = Array.from(map.values()).map(i => { i.minutes.sort((a,b)=>a-b); return i; }).sort((a,b)=>a.minMinute-b.minMinute);

                  return (
                    <div className="bg-red-50/50 p-3 sm:p-4 rounded-xl border border-red-100">
                      <h3 className="font-bold text-red-600 mb-2 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>🟥</span> THẺ ĐỎ
                      </h3>
                      <div className="space-y-1.5">
                        {groupedReds.map((r, idx) => (
                          <div key={idx} className="text-xs text-gray-700 font-medium flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-primary">{r.minutes.map(m => `${m}'`).join(', ')}</span> - 
                            <span className="font-bold text-gray-900">{r.player_name}</span>
                            {r.jersey_number ? <span className="text-red-700 font-bold bg-red-100 px-1 py-0.5 rounded text-[10px]">#{r.jersey_number}</span> : null}
                            {r.team_name ? <span className="text-gray-500 text-[11px]">({r.team_name})</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MOTM Player */}
              {selected.motm && (
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/60 shadow-sm flex items-center gap-3">
                  <span className="text-xl sm:text-2xl">⭐</span>
                  <div>
                    <h3 className="font-bold text-yellow-800 text-xs sm:text-sm">Cầu thủ xuất sắc nhất trận (MOTM)</h3>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                      <span>{selected.motm.name}</span>
                      {selected.motm.jersey_number ? <span className="text-primary font-black bg-blue-100 px-1.5 py-0.5 rounded text-xs">#{selected.motm.jersey_number}</span> : null}
                      {selected.motm.team_name ? <span className="text-gray-600 font-semibold text-xs">({selected.motm.team_name})</span> : null}
                    </p>
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="border-t pt-3 sm:pt-4">
                  <h3 className="font-bold text-gray-800 text-xs sm:text-sm mb-1.5">Biên bản trận đấu</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50 p-2.5 sm:p-3 rounded-lg border italic">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
