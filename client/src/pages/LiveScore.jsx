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

  const { liveMatches = [], upcomingMatches = [], todayMatches = [], settings = {} } = data || {};
  const hasLive = liveMatches.length > 0;

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
        if (isNormalGoalForThisTeam) {
          addEvent(`goal:${g.player_name}`, 'goal', '⚽', g.player_name, g.minute);
        } else if (isOwnGoalForOpponent) {
          addEvent(`og:${g.player_name}`, 'goal', '⚽', g.player_name, g.minute, ' (OG)');
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
      {/* Header & Auto Refresh Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
            <h1 className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight flex items-center gap-2">
              🔴 TRỰC TIẾP LIVESCORE
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Cập nhật tỷ số, diễn biến và kết quả các trận đấu bóng đá theo thời gian thực</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
              autoRefresh 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {autoRefresh ? 'Tự động cập nhật (5s)' : 'Tự động cập nhật: TẮT'}
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
        <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border border-red-200 bg-black">
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
          <h2 className="text-xl font-bold text-red-600 flex items-center gap-2 border-b pb-2">
            <span>⚽</span> Các trận đấu đang đá ({liveMatches.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {liveMatches.map((m) => {
              const eventsA = getEventsForTeam(m, m.team_a_id);
              const eventsB = getEventsForTeam(m, m.team_b_id);

              return (
                <div key={m.id} className="bg-white p-6 rounded-2xl border-2 border-red-400 shadow-md space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span className="text-primary">{m.round}</span>
                    <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-full font-extrabold text-[10px] tracking-wider animate-pulse">
                      🔴 LIVE
                    </span>
                  </div>

                  {/* Score Board */}
                  <div className="flex items-center justify-between gap-4 border-b pb-4">
                    <div className="flex-1 text-center">
                      {m.team_a_logo ? (
                        <img src={getFullUrl(m.team_a_logo)} alt="" className="w-16 h-16 mx-auto object-contain mb-2 bg-gray-50 rounded-full p-1 border border-gray-100" />
                      ) : (
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-xl mb-2">
                          {m.team_a_name?.charAt(0)}
                        </div>
                      )}
                      <p className="font-extrabold text-sm text-gray-800 line-clamp-2">{m.team_a_name}</p>
                    </div>

                    <div className="text-center px-4">
                      <div className="text-3xl sm:text-4xl font-black text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-2xl shadow-inner font-mono">
                        {m.score_a} - {m.score_b}
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 block mt-2">{m.match_time}</span>
                    </div>

                    <div className="flex-1 text-center">
                      {m.team_b_logo ? (
                        <img src={getFullUrl(m.team_b_logo)} alt="" className="w-16 h-16 mx-auto object-contain mb-2 bg-gray-50 rounded-full p-1 border border-gray-100" />
                      ) : (
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-xl mb-2">
                          {m.team_b_name?.charAt(0)}
                        </div>
                      )}
                      <p className="font-extrabold text-sm text-gray-800 line-clamp-2">{m.team_b_name}</p>
                    </div>
                  </div>

                  {/* Goal & Event list grouped on 1 line per player */}
                  {(eventsA.length > 0 || eventsB.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {/* Team A */}
                      <div className="space-y-1 text-left border-r pr-2 border-gray-200">
                        {eventsA.map((evt, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 font-medium">
                            <span>{evt.icon}</span>
                            <span className="font-semibold text-gray-800">{evt.player_name}</span>
                            <span className="text-primary font-bold">({evt.minutesStr})</span>
                            {evt.suffix && <span className="text-red-600 font-bold text-[10px] bg-red-100 px-1 rounded">{evt.suffix}</span>}
                          </div>
                        ))}
                      </div>

                      {/* Team B */}
                      <div className="space-y-1 text-right pl-2">
                        {eventsB.map((evt, idx) => (
                          <div key={idx} className="flex items-center justify-end gap-1.5 font-medium">
                            {evt.suffix && <span className="text-red-600 font-bold text-[10px] bg-red-100 px-1 rounded">{evt.suffix}</span>}
                            <span className="text-primary font-bold">({evt.minutesStr})</span>
                            <span className="font-semibold text-gray-800">{evt.player_name}</span>
                            <span>{evt.icon}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 flex justify-between pt-1 border-t">
                    <span>🏟️ {m.venue}</span>
                    <span>📅 {m.match_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* NO LIVE MATCH STATUS BANNER */
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-8 rounded-2xl text-center space-y-4 mb-12 shadow-sm">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto shadow border border-blue-100">
            ⏰
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Hiện chưa có trận đấu nào đang diễn ra</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Khi trận đấu bắt đầu, kết quả và diễn biến bàn thắng sẽ được tự động cập nhật trực tiếp tại màn hình này.
            </p>
          </div>
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
                      <span className="font-bold text-primary text-base">{m.score_a} - {m.score_b}</span>
                    ) : m.status === 'live' ? (
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded animate-pulse">LIVE</span>
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
