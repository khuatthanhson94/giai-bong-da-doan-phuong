import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { getFullUrl } from '../utils/url';

export default function Results() {
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('group'); // 'group' or 'knockout'
  const detailRef = useRef(null);

  useEffect(() => {
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
          setTimeout(() => {
            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
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
    const filtered = matches.filter((m) => {
      const isGroup = /bảng|lượt|group/i.test(m.round);
      return tab === 'group' ? isGroup : !isGroup;
    });
    setSelected(filtered.length > 0 ? filtered[0] : null);
  };

  // Filter matches based on active tab
  const displayedMatches = matches.filter((m) => {
    const isGroupRound = /bảng|lượt|group/i.test(m.round);
    return activeTab === 'group' ? isGroupRound : !isGroupRound;
  });

  const getEventsForTeam = (m, teamId) => {
    const map = new Map();

    const addEvent = (key, type, icon, player_name, minute, suffix = '') => {
      const name = player_name || 'Vô danh';
      if (!map.has(key)) {
        map.set(key, {
          type,
          icon,
          player_name: name,
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

    if (m.goals) {
      m.goals.forEach(g => {
        const isNormalGoalForThisTeam = g.team_id === teamId && !g.is_own_goal;
        const isOwnGoalForOpponent = g.team_id !== teamId && g.is_own_goal;
        const isOwnGoalByThisTeam = g.team_id === teamId && g.is_own_goal;

        if (isNormalGoalForThisTeam) {
          addEvent(`goal:${g.player_name}`, 'goal', '⚽', g.player_name, g.minute);
        } else if (isOwnGoalForOpponent || isOwnGoalByThisTeam) {
          addEvent(`og:${g.player_name}`, 'goal', '⚽', g.player_name, g.minute, ' (OG - Phản lưới)');
        }
      });
    }

    if (m.yellow_cards) {
      m.yellow_cards.forEach(y => {
        if (y.team_id === teamId) {
          addEvent(`yellow:${y.player_name}`, 'yellow', '🟨', y.player_name, y.minute);
        }
      });
    }

    if (m.red_cards) {
      m.red_cards.forEach(r => {
        if (r.team_id === teamId) {
          addEvent(`red:${r.player_name}`, 'red', '🟥', r.player_name, r.minute);
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
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary flex items-center gap-2">
            <span>🏆</span> KẾT QUẢ TRẬN ĐẤU
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Danh sách kết quả các trận đấu đã kết thúc, cầu thủ ghi bàn và biên bản trận đấu</p>
        </div>
        
        {/* Stage Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => handleTabChange('group')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'group'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ⚽ Vòng bảng
          </button>
          <button
            onClick={() => handleTabChange('knockout')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'knockout'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🏆 Vòng Knockout
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Matches List (LiveScore Style Finished Cards) */}
        <div className="space-y-6">
          {displayedMatches.map((m) => {
            const eventsA = getEventsForTeam(m, m.team_a_id);
            const eventsB = getEventsForTeam(m, m.team_b_id);
            const isSelected = selected?.id === m.id;

            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelected(m);
                  window.history.replaceState(null, '', `?match_id=${m.id}`);
                  setTimeout(() => {
                    if (window.innerWidth < 1024) {
                      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 80);
                }}
                className={`bg-white p-4 sm:p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'border-primary ring-2 ring-primary/20 bg-blue-50/20' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-3">
                  <span className="text-primary truncate max-w-[220px]">{m.round}</span>
                  <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    Đã kết thúc
                  </span>
                </div>

                {/* Scoreboard row */}
                <div className="flex items-center justify-between gap-2 sm:gap-4 border-b pb-4">
                  <div className="flex-1 text-center">
                    {m.team_a_logo || m.team_a?.logo ? (
                      <img src={getFullUrl(m.team_a_logo || m.team_a?.logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-base sm:text-xl mb-1.5">
                        {(m.team_a_name || m.team_a?.name)?.charAt(0)}
                      </div>
                    )}
                    <p className="font-extrabold text-xs sm:text-sm text-gray-800 break-words leading-tight">{m.team_a_name || m.team_a?.name}</p>
                  </div>

                  <div className="text-center px-2 sm:px-4 flex-shrink-0">
                    <div className="text-2xl sm:text-4xl font-black text-primary bg-blue-50 border border-blue-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-inner font-mono tracking-tighter">
                      {m.score_a} - {m.score_b}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 block mt-1.5">FT (90')</span>
                  </div>

                  <div className="flex-1 text-center">
                    {m.team_b_logo || m.team_b?.logo ? (
                      <img src={getFullUrl(m.team_b_logo || m.team_b?.logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-base sm:text-xl mb-1.5">
                        {(m.team_b_name || m.team_b?.name)?.charAt(0)}
                      </div>
                    )}
                    <p className="font-extrabold text-xs sm:text-sm text-gray-800 break-words leading-tight">{m.team_b_name || m.team_b?.name}</p>
                  </div>
                </div>

                {/* Goalscorers & Pitch Events Section (LiveScore Style) */}
                <div className="space-y-2 mt-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1.5">⚽ CẦU THỦ GHI BÀN & DIỄN BIẾN</span>
                    <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">Gộp 1 dòng / cầu thủ</span>
                  </div>

                  {(eventsA.length > 0 || eventsB.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 bg-blue-50/40 p-3 sm:p-3.5 rounded-xl border border-blue-100">
                      {/* Team A Events */}
                      <div className="space-y-2 text-left sm:border-r sm:pr-3 border-gray-200 pb-2 sm:pb-0 border-b sm:border-b-0">
                        <div className="font-bold text-[11px] text-primary sm:hidden mb-1 flex items-center gap-1 border-b border-blue-100 pb-0.5">
                          <span>🛡️</span> {m.team_a_name || m.team_a?.name}
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
                      <div className="space-y-2 text-left sm:text-right sm:pl-3 pt-1 sm:pt-0">
                        <div className="font-bold text-[11px] text-primary sm:hidden mb-1 flex items-center gap-1 border-b border-blue-100 pb-0.5">
                          <span>🛡️</span> {m.team_b_name || m.team_b?.name}
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
                    <p className="text-xs text-gray-400 italic text-center py-2 bg-gray-50 rounded-lg">Không có bàn thắng hoặc thẻ phạt trong trận này</p>
                  )}
                </div>

                <div className="text-xs text-gray-500 flex justify-between items-center pt-3 border-t mt-3">
                  <span className="truncate">🏟️ {m.venue}</span>
                  <span className="text-primary font-bold hover:underline flex-shrink-0 ml-2">Xem chi tiết đầy đủ →</span>
                </div>
              </div>
            );
          })}
          {displayedMatches.length === 0 && (
            <div className="card p-8 text-center text-gray-400 italic border border-dashed">
              Chưa có kết quả trận đấu {activeTab === 'group' ? 'vòng bảng' : 'vòng knockout'} nào được công bố.
            </div>
          )}
        </div>

        {/* Selected Match Detail Panel */}
        {selected && (
          <div ref={detailRef} className="card p-6 animate-slide-up sticky top-20 border border-gray-200 bg-white shadow-xl scroll-mt-24 rounded-2xl">
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
              {selected.round}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-center sm:text-left w-full sm:w-auto">{selected.team_a_name || selected.team_a?.name}</span>
              <span className="text-primary bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-200 flex-shrink-0 text-2xl font-black font-mono">
                {selected.score_a} - {selected.score_b}
              </span>
              <span className="text-center sm:text-right w-full sm:w-auto">{selected.team_b_name || selected.team_b?.name}</span>
            </h2>
            <p className="text-sm text-gray-500 mb-6 flex flex-wrap items-center gap-2 justify-center sm:justify-start border-b pb-4">
              <span>🏟️ {selected.venue}</span>
              <span>•</span>
              <span>📅 {selected.match_date} {selected.match_time}</span>
            </p>

            {selected.goals?.length > 0 && (() => {
              const map = new Map();
              selected.goals.forEach(g => {
                const key = `${g.player_name}_${g.team_name}_${g.is_own_goal ? 'og' : 'normal'}`;
                if (!map.has(key)) {
                  map.set(key, {
                    player_name: g.player_name,
                    team_name: g.team_name,
                    is_own_goal: g.is_own_goal,
                    minutes: [],
                    minMinute: Number(g.minute) || 0
                  });
                }
                const item = map.get(key);
                item.minutes.push(Number(g.minute) || 0);
                if ((Number(g.minute) || 0) < item.minMinute) {
                  item.minMinute = Number(g.minute) || 0;
                }
              });
              const groupedGoals = Array.from(map.values()).map(item => {
                item.minutes.sort((a, b) => a - b);
                return item;
              }).sort((a, b) => a.minMinute - b.minMinute);

              return (
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border">
                  <h3 className="font-bold text-youth mb-3 flex items-center gap-2">
                    <span>⚽</span> Bàn thắng
                  </h3>
                  <div className="space-y-2">
                    {groupedGoals.map((g, idx) => (
                      <div key={idx} className="text-sm text-gray-700 flex justify-between bg-white px-3 py-1.5 rounded border border-gray-100">
                        <span>
                          🏃‍♂️ {g.player_name} ({g.team_name})
                          {g.is_own_goal ? <span className="text-red-500 font-bold text-xs ml-1">(Phản lưới - OG)</span> : null}
                        </span>
                        <span className="font-bold text-primary">
                          {g.minutes.map(m => `${m}'`).join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4 mb-6">
              {selected.yellow_cards?.length > 0 && (() => {
                const map = new Map();
                selected.yellow_cards.forEach(y => {
                  const key = y.player_name;
                  if (!map.has(key)) {
                    map.set(key, { player_name: y.player_name, minutes: [], minMinute: Number(y.minute) || 0 });
                  }
                  const item = map.get(key);
                  item.minutes.push(Number(y.minute) || 0);
                  if ((Number(y.minute) || 0) < item.minMinute) item.minMinute = Number(y.minute) || 0;
                });
                const groupedYellows = Array.from(map.values()).map(i => { i.minutes.sort((a,b)=>a-b); return i; }).sort((a,b)=>a.minMinute-b.minMinute);

                return (
                  <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                    <h3 className="font-bold text-yellow-600 mb-2 flex items-center gap-1.5 text-xs sm:text-sm">
                      <span>🟨</span> Thẻ vàng
                    </h3>
                    <div className="space-y-1">
                      {groupedYellows.map((y, idx) => (
                        <p key={idx} className="text-xs text-gray-600 font-medium">{y.minutes.map(m => `${m}'`).join(', ')} - {y.player_name}</p>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {selected.red_cards?.length > 0 && (() => {
                const map = new Map();
                selected.red_cards.forEach(r => {
                  const key = r.player_name;
                  if (!map.has(key)) {
                    map.set(key, { player_name: r.player_name, minutes: [], minMinute: Number(r.minute) || 0 });
                  }
                  const item = map.get(key);
                  item.minutes.push(Number(r.minute) || 0);
                  if ((Number(r.minute) || 0) < item.minMinute) item.minMinute = Number(r.minute) || 0;
                });
                const groupedReds = Array.from(map.values()).map(i => { i.minutes.sort((a,b)=>a-b); return i; }).sort((a,b)=>a.minMinute-b.minMinute);

                return (
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                    <h3 className="font-bold text-red-600 mb-2 flex items-center gap-1.5 text-xs sm:text-sm">
                      <span>🟥</span> Thẻ đỏ
                    </h3>
                    <div className="space-y-1">
                      {groupedReds.map((r, idx) => (
                        <p key={idx} className="text-xs text-gray-600 font-medium">{r.minutes.map(m => `${m}'`).join(', ')} - {r.player_name}</p>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {selected.motm && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50 flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <h3 className="font-bold text-yellow-800 text-sm">Cầu thủ xuất sắc nhất trận</h3>
                  <p className="text-sm font-bold text-gray-800">{selected.motm.name} #{selected.motm.jersey_number}</p>
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-800 text-sm mb-2">Biên bản trận đấu</h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border italic">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
