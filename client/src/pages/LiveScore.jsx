import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import MatchCard, { Countdown } from '../components/MatchCard';
import { getFullUrl } from '../utils/url';
import { useTournament } from '../context/TournamentContext';

export default function LiveScore() {
  const { selectedTournamentId } = useTournament();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

  const fetchLiveScore = () => {
    const query = selectedTournamentId ? `?tournament_id=${selectedTournamentId}` : '';
    api.get(`/livescore${query}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi khi tải dữ liệu Livescore:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLiveScore();
  }, [selectedTournamentId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLiveScore, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTournamentId]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { liveMatches: dbLiveMatches = [], upcomingMatches = [], todayMatches = [], settings = {} } = data || {};
  
  // Sample demo match data for instant preview when no live matches are running
  const demoMatch = {
    id: 'demo-live-1',
    round: 'Bảng A - Lượt 3 (Đang diễn ra)',
    team_a_name: 'FC Thanh Niên Phường',
    team_b_name: 'FC Liên Quân Khối Phố',
    score_a: 3,
    score_b: 2,
    match_time: 'Phút 88\'',
    match_date: 'Hôm nay',
    venue: 'Sân vận động Trung tâm',
    status: 'live',
    notes: 'Trận đấu kịch tính với cú hat-trick của Nguyễn Văn A và bàn phản lưới nhà (OG) của Phạm Văn D!',
    team_a_id: 1,
    team_b_id: 2,
    goals: [
      { player_name: 'Nguyễn Văn A', team_id: 1, minute: 15, is_own_goal: 0 },
      { player_name: 'Nguyễn Văn A', team_id: 1, minute: 38, is_own_goal: 0 },
      { player_name: 'Trần Văn B', team_id: 2, minute: 45, is_own_goal: 0 },
      { player_name: 'Phạm Văn D', team_id: 1, minute: 58, is_own_goal: 1 }, // OG
      { player_name: 'Nguyễn Văn A', team_id: 1, minute: 88, is_own_goal: 0 }
    ],
    yellow_cards: [
      { player_name: 'Phạm Văn D', team_id: 1, minute: 30 },
      { player_name: 'Hoàng Văn E', team_id: 2, minute: 70 }
    ],
    red_cards: [
      { player_name: 'Hoàng Văn E', team_id: 2, minute: 82 }
    ]
  };

  const liveMatches = dbLiveMatches.length > 0 
    ? dbLiveMatches 
    : (showDemo ? [demoMatch] : []);

  const hasLive = liveMatches.length > 0;

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
      {/* Header & Auto Refresh Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-red-600 rounded-full animate-ping"></span>
            <h1 className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight flex items-center gap-2">
              🔴 TRỰC TIẾP LIVESCORE
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Cập nhật tỷ số, cầu thủ ghi bàn và diễn biến trận đấu theo thời gian thực</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              showDemo
                ? 'bg-purple-100 border-purple-300 text-purple-800'
                : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showDemo ? '⏹️ Tắt minh họa Demo' : '🧪 Xem minh họa trận Live mẫu'}
          </button>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              autoRefresh 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {autoRefresh ? 'Tự động (5s)' : 'Tự động: TẮT'}
          </button>
          
          <button
            onClick={fetchLiveScore}
            className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-primary hover:bg-blue-100 text-xs font-medium"
            title="Tải lại ngay"
          >
            🔄 Tải lại
          </button>
        </div>
      </div>

      {/* Livestream Embed Banner if available */}
      {settings.livestream_url && (
        <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border border-red-200 bg-black">
          <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">📹 LIVESTREAM TRỰC TIẾP</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">HD STREAM</span>
          </div>
          <div className="aspect-video w-full">
            <iframe
              src={settings.livestream_url.includes('embed') ? settings.livestream_url : `https://www.youtube.com/embed/${settings.livestream_url.split('v=')[1] || ''}`}
              title="Livestream"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* LIVE MATCHES SECTION */}
      {hasLive ? (
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg sm:text-xl font-bold text-red-600 flex items-center gap-2">
              <span>⚽</span> Các trận đấu đang diễn ra ({liveMatches.length})
            </h2>
            {showDemo && <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Đang hiển thị mẫu (Demo)</span>}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {liveMatches.map((m) => {
              const eventsA = getEventsForTeam(m, m.team_a_id);
              const eventsB = getEventsForTeam(m, m.team_b_id);

              return (
                <div key={m.id} className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-red-400 shadow-lg space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span className="text-primary truncate max-w-[200px]">{m.round}</span>
                    <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-full font-extrabold text-[10px] tracking-wider animate-pulse flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                    </span>
                  </div>

                  {/* Score Board */}
                  <div className="flex items-center justify-between gap-2 sm:gap-4 border-b pb-4">
                    <div className="flex-1 text-center">
                      {m.team_a_logo ? (
                        <img src={getFullUrl(m.team_a_logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100" />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-base sm:text-xl mb-1.5">
                          {m.team_a_name?.charAt(0)}
                        </div>
                      )}
                      <p className="font-extrabold text-xs sm:text-sm text-gray-800 break-words leading-tight">{m.team_a_name}</p>
                    </div>

                    <div className="text-center px-2 sm:px-4 flex-shrink-0">
                      <div className="text-2xl sm:text-4xl font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-inner font-mono tracking-tighter">
                        {m.score_a} - {m.score_b}
                      </div>
                      {m.penalty_a !== null && m.penalty_a !== undefined && m.penalty_b !== null && m.penalty_b !== undefined && (
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 px-2 py-0.5 rounded-md mt-1 inline-block shadow-xs">
                          (Pen {m.penalty_a} - {m.penalty_b})
                        </div>
                      )}
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 block mt-1.5">{m.match_time}</span>
                    </div>

                    <div className="flex-1 text-center">
                      {m.team_b_logo ? (
                        <img src={getFullUrl(m.team_b_logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-1.5 bg-gray-50 rounded-full p-1 border border-gray-100" />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-base sm:text-xl mb-1.5">
                          {m.team_b_name?.charAt(0)}
                        </div>
                      )}
                      <p className="font-extrabold text-xs sm:text-sm text-gray-800 break-words leading-tight">{m.team_b_name}</p>
                    </div>
                  </div>

                  {/* Goalscorers & Pitch Events Section (Responsive Grid for Mobile) */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1.5">⚽ CẦU THỦ GHI BÀN & DIỄN BIẾN</span>
                      <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">Gộp 1 dòng / cầu thủ</span>
                    </div>

                    {(eventsA.length > 0 || eventsB.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 bg-blue-50/40 p-3 sm:p-3.5 rounded-xl border border-blue-100">
                        {/* Team A Events */}
                        <div className="space-y-2 text-left sm:border-r sm:pr-3 border-gray-200 pb-2 sm:pb-0 border-b sm:border-b-0">
                          <div className="font-bold text-[11px] text-primary sm:hidden mb-1 flex items-center gap-1 border-b border-blue-100 pb-0.5">
                            <span>🛡️</span> {m.team_a_name}
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
                            <span>🛡️</span> {m.team_b_name}
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
                      <p className="text-xs text-gray-400 italic text-center py-2 bg-gray-50 rounded-lg">Chưa có bàn thắng hoặc thẻ phạt trong trận này</p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 flex justify-between pt-2 border-t">
                    <span className="truncate">🏟️ {m.venue}</span>
                    <span className="whitespace-nowrap ml-2">📅 {m.match_date}</span>
                  </div>

                  {m.notes && <div className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border break-words">{m.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* NO LIVE MATCH STATUS BANNER WITH DEMO TOGGLE */
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 sm:p-8 rounded-2xl text-center space-y-4 mb-12 shadow-sm">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow border border-blue-100">
            ⏰
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Hiện chưa có trận đấu nào đang diễn ra</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Khi có trận đấu bắt đầu, diễn biến và cầu thủ ghi bàn sẽ tự động cập nhật trực tiếp tại đây. Bạn có thể nhấn xem trận đấu mẫu bên dưới.
            </p>
          </div>
          <button
            onClick={() => setShowDemo(true)}
            className="btn-primary text-xs inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shadow"
          >
            🧪 Bật xem thử trận đấu mẫu (Demo Live)
          </button>
        </div>
      )}

      {/* UPCOMING MATCHES & TODAY MATCHES */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming match countdown */}
        {upcomingMatches.length > 0 && (
          <section className="card p-6">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 border-b pb-2">
              <span>⏳</span> Trận đấu tiếp theo
            </h2>
            <MatchCard match={upcomingMatches[0]} />
            <div className="mt-6">
              <Countdown targetDate={upcomingMatches[0].match_date} targetTime={upcomingMatches[0].match_time} />
            </div>
          </section>
        )}

        {/* Today matches */}
        {todayMatches.length > 0 && (
          <section className="card p-6">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 border-b pb-2">
              <span>📅</span> Trận đấu hôm nay
            </h2>
            <div className="space-y-3">
              {todayMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                  <div>
                    <span className="text-xs text-gray-500">{m.round}</span>
                    <p className="font-semibold text-sm">{m.team_a_name} vs {m.team_b_name}</p>
                  </div>
                  <div className="text-right">
                    {m.status === 'finished' ? (
                      <div>
                        <span className="font-bold text-primary text-base">{m.score_a} - {m.score_b}</span>
                        {m.penalty_a !== null && m.penalty_a !== undefined && m.penalty_b !== null && m.penalty_b !== undefined && (
                          <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-300">(Pen {m.penalty_a} - {m.penalty_b})</span>
                        )}
                      </div>
                    ) : m.status === 'live' ? (
                      <div>
                        <span className="font-bold text-red-600 text-base">{m.score_a} - {m.score_b}</span>
                        {m.penalty_a !== null && m.penalty_a !== undefined && m.penalty_b !== null && m.penalty_b !== undefined && (
                          <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-300">(Pen {m.penalty_a} - {m.penalty_b})</span>
                        )}
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded animate-pulse block mt-0.5">LIVE</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">{m.match_time}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-12 text-center">
        <Link to="/lich-thi-dau" className="btn-primary inline-flex items-center gap-2">
          📅 Xem toàn bộ Lịch thi đấu →
        </Link>
      </div>
    </div>
  );
}
