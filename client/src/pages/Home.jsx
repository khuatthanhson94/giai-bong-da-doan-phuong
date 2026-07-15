import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import MatchCard, { Countdown } from '../components/MatchCard';
import StandingsTable from '../components/StandingsTable';
import { getFullUrl } from '../utils/url';

export default function Home() {
  const [data, setData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [activeHomeTab, setActiveHomeTab] = useState('group');

  const loadHomeData = () => {
    api.get('/home').then(setData).catch(console.error);
  };

  // Fetch home data, teams list and sponsors
  useEffect(() => {
    loadHomeData();
    api.get('/teams').then(setTeams).catch(console.error);
    api.get('/sponsors').then(setSponsors).catch(console.error);
  }, []);

  // Poll home data every 5 seconds if there are active live matches
  useEffect(() => {
    const hasLiveMatch = data?.liveMatches && data.liveMatches.length > 0;
    if (!hasLiveMatch) return;

    const interval = setInterval(() => {
      loadHomeData();
    }, 5000);

    return () => clearInterval(interval);
  }, [data?.liveMatches]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { settings, latestMatch, liveMatches, upcomingMatches, news, standings, topScorers } = data || {};

  return (
    <div>
      {/* Banner */}
      <section className="relative text-white overflow-hidden bg-primary-dark">
        {/* Banner image or fallback gradient */}
        {settings?.banner_url ? (
          <img
            src={getFullUrl(settings.banner_url)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark via-youth opacity-100 z-0" />
        )}
        <div className="absolute inset-0 bg-black/45 z-10" />

        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-20 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden bg-white p-2 flex items-center justify-center border-4 border-white/20 shadow-xl flex-shrink-0 animate-scale-in">
              {settings?.logo_url ? (
                <img src={getFullUrl(settings.logo_url)} alt="Logo" className="w-full h-full object-contain rounded-full" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-3xl font-bold text-white rounded-full">
                  ĐP
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <p className="text-youth-light font-medium mb-2 tracking-wide uppercase text-sm">
                Đoàn Thanh niên Cộng sản Hồ Chí Minh
              </p>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                {settings?.tournament_name}
              </h1>
              <p className="text-xl text-blue-100 italic">"{settings?.slogan}"</p>
              <div className="flex flex-wrap gap-3 mt-8 justify-center md:justify-start">
                <Link to="/lich-thi-dau" className="btn-secondary">Xem lịch thi đấu</Link>
                <Link to="/ket-qua" className="bg-white/20 hover:bg-white/30 text-white px-6 py-2.5 rounded-lg font-medium transition">Xem kết quả</Link>
                <Link to="/bang-xep-hang" className="bg-white/20 hover:bg-white/30 text-white px-6 py-2.5 rounded-lg font-medium transition">Bảng xếp hạng</Link>
                <Link to="/admin" className="bg-youth hover:bg-youth/90 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-1">🔐 Đăng nhập quản trị</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        {/* Live Matches Panel */}
        {liveMatches && liveMatches.length > 0 && (
          <section className="bg-red-50 border-2 border-red-500/30 p-6 md:p-8 rounded-2xl animate-pulse space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
              <h2 className="text-xl font-black text-red-600 tracking-wider">🔴 TRẬN ĐẤU ĐANG DIỄN RA (LIVE)</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {liveMatches.map((m) => {
                const getEventsForTeam = (teamId) => {
                  const list = [];
                  
                  // Goals
                  if (m.goals) {
                    m.goals.forEach(g => {
                      const isNormalGoalForThisTeam = g.team_id === teamId && !g.is_own_goal;
                      const isOwnGoalForOpponent = g.team_id !== teamId && g.is_own_goal;
                      if (isNormalGoalForThisTeam || isOwnGoalForOpponent) {
                        list.push({
                          type: 'goal',
                          icon: '⚽',
                          player_name: g.player_name,
                          minute: g.minute,
                          suffix: g.is_own_goal ? ' (OG)' : '',
                        });
                      }
                    });
                  }

                  // Yellow Cards
                  if (m.yellow_cards) {
                    m.yellow_cards.forEach(y => {
                      if (y.team_id === teamId) {
                        list.push({
                          type: 'yellow',
                          icon: '🟨',
                          player_name: y.player_name,
                          minute: y.minute,
                          suffix: '',
                        });
                      }
                    });
                  }

                  // Red Cards
                  if (m.red_cards) {
                    m.red_cards.forEach(r => {
                      if (r.team_id === teamId) {
                        list.push({
                          type: 'red',
                          icon: '🟥',
                          player_name: r.player_name,
                          minute: r.minute,
                          suffix: '',
                        });
                      }
                    });
                  }

                  // Sort chronologically by minute
                  return list.sort((a, b) => Number(a.minute) - Number(b.minute));
                };

                const eventsA = getEventsForTeam(m.team_a_id);
                const eventsB = getEventsForTeam(m.team_b_id);

                return (
                  <div key={m.id} className="bg-white p-5 rounded-xl border border-red-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                      <span>{m.round}</span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-black tracking-wide">LIVE</span>
                    </div>
                    
                    {/* Scoreboard row */}
                    <div className="flex items-center justify-between gap-2 sm:gap-4 border-b pb-4">
                      {/* Team A */}
                      <div className="flex-1 flex flex-col items-center text-center w-1/3">
                        {m.team_a_logo ? (
                          <img src={getFullUrl(m.team_a_logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain mb-2 bg-gray-50 rounded-full p-1 border border-gray-100" />
                        ) : (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-lg mb-2">
                            {m.team_a_name?.charAt(0)}
                          </div>
                        )}
                        <span className="font-extrabold text-gray-800 text-xs sm:text-sm line-clamp-2 h-8 sm:h-10 leading-snug">
                          {m.team_a_name}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="flex flex-col items-center justify-center px-2 sm:px-4 min-w-[70px] sm:min-w-[100px] text-center">
                        <div className="text-2xl sm:text-4xl font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl shadow-inner font-mono tracking-tighter">
                          {m.score_a} - {m.score_b}
                        </div>
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full mt-2 animate-pulse tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> LIVE
                        </span>
                      </div>

                      {/* Team B */}
                      <div className="flex-1 flex flex-col items-center text-center w-1/3">
                        {m.team_b_logo ? (
                          <img src={getFullUrl(m.team_b_logo)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain mb-2 bg-gray-50 rounded-full p-1 border border-gray-100" />
                        ) : (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-youth flex items-center justify-center text-white font-bold text-lg mb-2">
                            {m.team_b_name?.charAt(0)}
                          </div>
                        )}
                        <span className="font-extrabold text-gray-800 text-xs sm:text-sm line-clamp-2 h-8 sm:h-10 leading-snug">
                          {m.team_b_name}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Event list */}
                    {(eventsA.length > 0 || eventsB.length > 0) && (
                      <div className="grid grid-cols-2 gap-4 text-[11px] sm:text-xs text-gray-600 pt-1">
                        {/* Team A events */}
                        <div className="space-y-1 text-left border-r pr-2 border-gray-100">
                          {eventsA.map((evt, idx) => (
                            <div key={idx} className="flex items-center gap-1 font-medium truncate">
                              <span className="text-[10px] sm:text-xs">{evt.icon}</span>
                              <span>{evt.player_name}</span>
                              <span className="text-gray-400">({evt.minute}')</span>
                              {evt.suffix && <span className="text-red-500 font-bold text-[9px] bg-red-50 px-1 rounded">{evt.suffix}</span>}
                            </div>
                          ))}
                        </div>

                        {/* Team B events */}
                        <div className="space-y-1 text-right pl-2">
                          {eventsB.map((evt, idx) => (
                            <div key={idx} className="flex items-center justify-end gap-1 font-medium truncate">
                              {evt.suffix && <span className="text-red-500 font-bold text-[9px] bg-red-50 px-1 rounded">{evt.suffix}</span>}
                              <span className="text-gray-400">({evt.minute}')</span>
                              <span>{evt.player_name}</span>
                              <span className="text-[10px] sm:text-xs">{evt.icon}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.notes && <div className="text-[10px] sm:text-xs text-gray-400 italic text-center pt-2 border-t border-dashed mt-2">{m.notes}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Upcoming match countdown */}
        {upcomingMatches?.[0] && (
          <section className="card p-6 md:p-8 text-center animate-slide-up">
            <h2 className="section-title justify-center">Trận đấu sắp diễn ra</h2>
            <MatchCard match={upcomingMatches[0]} />
            <div className="mt-6">
              <Countdown targetDate={upcomingMatches[0].match_date} targetTime={upcomingMatches[0].match_time} />
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Latest result */}
          {latestMatch && (
            <section>
              <h2 className="section-title">Kết quả gần nhất</h2>
              <MatchCard match={latestMatch} showScore />
            </section>
          )}

          {/* Top scorers */}
          <section>
            <h2 className="section-title">Vua phá lưới</h2>
            <div className="card divide-y">
              {topScorers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-blue-50 transition">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-orange-300' : 'bg-gray-100'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.team_name}</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{p.goals}</span>
                </div>
              ))}
              {topScorers.length === 0 && <p className="p-4 text-gray-500">Chưa có dữ liệu</p>}
            </div>
          </section>
        </div>

        {/* Standings preview */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">Bảng xếp hạng</h2>
            <Link to="/bang-xep-hang" className="text-primary hover:underline text-sm font-medium">Xem đầy đủ →</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(
              standings.reduce((acc, team) => {
                const groupName = team.group_name || 'Đội chưa phân bảng';
                if (!acc[groupName]) acc[groupName] = [];
                acc[groupName].push(team);
                return acc;
              }, {})
            )
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([groupName, groupTeams]) => (
                <div key={groupName} className="card p-4">
                  <h3 className="font-bold text-primary mb-3 text-sm">{groupName}</h3>
                  <StandingsTable standings={groupTeams.slice(0, 5)} compact />
                </div>
              ))}
          </div>
        </section>

        {/* Upcoming matches */}
        {upcomingMatches?.length > 1 && (() => {
          const upcomingMatchesToFilter = upcomingMatches.slice(1);
          const groupUpcoming = upcomingMatchesToFilter.filter(m => /bảng|lượt|group/i.test(m.round));
          const knockoutUpcoming = upcomingMatchesToFilter.filter(m => !/bảng|lượt|group/i.test(m.round));
          const displayedMatches = activeHomeTab === 'group' ? groupUpcoming : knockoutUpcoming;

          return (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
                <h2 className="section-title mb-0">Lịch thi đấu sắp tới</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveHomeTab('group')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeHomeTab === 'group'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Vòng bảng
                  </button>
                  <button
                    onClick={() => setActiveHomeTab('knockout')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeHomeTab === 'knockout'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Vòng Knockout
                  </button>
                </div>
              </div>
              
              {displayedMatches.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Không có trận đấu {activeHomeTab === 'group' ? 'vòng bảng' : 'vòng knockout'} nào sắp diễn ra.
                </p>
              )}
            </section>
          );
        })()}

        {/* News */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">Tin tức mới nhất</h2>
            <Link to="/tin-tuc" className="text-primary hover:underline text-sm font-medium">Xem tất cả →</Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {news.map((n) => (
              <Link key={n.id} to={`/tin-tuc/${n.id}`} className="card group">
                <div className="h-40 bg-gradient-to-br from-primary/20 to-youth/20 flex items-center justify-center overflow-hidden">
                  {n.image || settings?.logo_url ? (
                    <img src={getFullUrl(n.image || settings.logo_url)} alt={n.title} className="w-full h-full object-contain bg-gray-50/30 group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-4xl">⚽</span>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs text-youth font-medium">{n.category}</span>
                  <h3 className="font-semibold mt-1 group-hover:text-primary transition line-clamp-2">{n.title}</h3>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Sponsors Section */}
        {sponsors?.length > 0 && (
          <section className="border-t pt-12 mt-16 bg-gradient-to-b from-transparent to-gray-50/50 -mx-4 px-4 pb-12 rounded-t-[32px]">
            <div className="max-w-6xl mx-auto text-center space-y-10">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">NHÀ TÀI TRỢ & ĐỒNG HÀNH</h2>
                <div className="h-1.5 w-16 bg-primary mx-auto rounded-full"></div>
                <p className="text-xs text-gray-400 font-medium">Sự đồng hành tạo nên thành công của giải đấu</p>
              </div>

              {/* Diamond Tier */}
              {sponsors.some(s => s.tier === 'diamond') && (
                <div className="space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-cyan-50 text-cyan-700 border border-cyan-200">
                    💎 Nhà Tài Trợ Kim Cương
                  </span>
                  <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
                    {sponsors.filter(s => s.tier === 'diamond').map(s => (
                      <a
                        key={s.id}
                        href={s.link || undefined}
                        target={s.link ? "_blank" : undefined}
                        rel={s.link ? "noopener noreferrer" : undefined}
                        className="bg-white p-6 rounded-2xl border border-cyan-100 shadow-sm hover:shadow-cyan-200/50 hover:shadow-lg hover:-translate-y-1 transition duration-300 w-72 sm:w-80 min-h-[180px] flex flex-col items-center justify-center group"
                      >
                        <div className="h-28 w-full flex items-center justify-center p-2">
                          <img src={s.logo ? getFullUrl(s.logo) : getFullUrl(settings?.logo_url)} alt={s.name} className="max-h-full max-w-full object-contain filter group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <span className="text-sm font-extrabold text-cyan-900 mt-3 line-clamp-2 w-full px-1 text-center group-hover:text-primary transition-colors leading-tight">
                          {s.short_name || s.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Gold & Silver Tiers in Grid/Flex */}
              {(sponsors.some(s => s.tier === 'gold') || sponsors.some(s => s.tier === 'silver')) && (
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Gold Tier */}
                  {sponsors.some(s => s.tier === 'gold') && (
                    <div className="space-y-4">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-yellow-50 text-yellow-700 border border-yellow-200">
                        🥇 Nhà Tài Trợ Vàng
                      </span>
                      <div className="flex flex-wrap justify-center gap-4">
                        {sponsors.filter(s => s.tier === 'gold').map(s => (
                          <a
                            key={s.id}
                            href={s.link || undefined}
                            target={s.link ? "_blank" : undefined}
                            rel={s.link ? "noopener noreferrer" : undefined}
                            className="bg-white p-5 rounded-2xl border border-yellow-100 shadow-sm hover:shadow-yellow-150/50 hover:shadow-lg hover:-translate-y-1 transition duration-300 w-56 sm:w-60 min-h-[150px] flex flex-col items-center justify-center group"
                          >
                            <div className="h-20 w-full flex items-center justify-center p-1">
                              <img src={s.logo ? getFullUrl(s.logo) : getFullUrl(settings?.logo_url)} alt={s.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <span className="text-xs font-extrabold text-yellow-900 mt-2 line-clamp-2 w-full px-1 text-center group-hover:text-primary transition-colors leading-tight">
                              {s.short_name || s.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Silver Tier */}
                  {sponsors.some(s => s.tier === 'silver') && (
                    <div className="space-y-4">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-gray-100 text-gray-700 border border-gray-300">
                        🥈 Nhà Tài Trợ Bạc
                      </span>
                      <div className="flex flex-wrap justify-center gap-4">
                        {sponsors.filter(s => s.tier === 'silver').map(s => (
                          <a
                            key={s.id}
                            href={s.link || undefined}
                            target={s.link ? "_blank" : undefined}
                            rel={s.link ? "noopener noreferrer" : undefined}
                            className="bg-white p-5 rounded-2xl border border-gray-250 shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300 w-56 sm:w-60 min-h-[150px] flex flex-col items-center justify-center group"
                          >
                            <div className="h-20 w-full flex items-center justify-center p-1">
                              <img src={s.logo ? getFullUrl(s.logo) : getFullUrl(settings?.logo_url)} alt={s.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <span className="text-xs font-extrabold text-gray-800 mt-2 line-clamp-2 w-full px-1 text-center group-hover:text-primary transition-colors leading-tight">
                              {s.short_name || s.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bronze & General Tiers */}
              {(sponsors.some(s => s.tier === 'bronze') || sponsors.some(s => s.tier === 'general')) && (
                <div className="space-y-6 max-w-4xl mx-auto pt-4 border-t border-dashed border-gray-200">
                  {/* Bronze Tier */}
                  {sponsors.some(s => s.tier === 'bronze') && (
                    <div className="space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-amber-50 text-amber-800 border border-amber-200">
                        🥉 Nhà Tài Trợ Đồng
                      </span>
                      <div className="flex flex-wrap justify-center gap-4">
                        {sponsors.filter(s => s.tier === 'bronze').map(s => (
                          <a
                            key={s.id}
                            href={s.link || undefined}
                            target={s.link ? "_blank" : undefined}
                            rel={s.link ? "noopener noreferrer" : undefined}
                            className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-300 w-44 sm:w-48 min-h-[120px] flex flex-col items-center justify-center group"
                          >
                            <div className="h-16 w-full flex items-center justify-center">
                              <img src={s.logo ? getFullUrl(s.logo) : getFullUrl(settings?.logo_url)} alt={s.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <span className="text-xs font-bold text-amber-800 mt-2 line-clamp-2 w-full px-1 text-center group-hover:text-primary transition-colors leading-tight">
                              {s.short_name || s.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General / Companion Tier */}
                  {sponsors.some(s => s.tier === 'general') && (
                    <div className="space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-gray-50 text-gray-500 border border-gray-200">
                        🤝 Đơn vị Đồng Hành
                      </span>
                      <div className="flex flex-wrap justify-center gap-3">
                        {sponsors.filter(s => s.tier === 'general').map(s => (
                          <a
                            key={s.id}
                            href={s.link || undefined}
                            target={s.link ? "_blank" : undefined}
                            rel={s.link ? "noopener noreferrer" : undefined}
                            className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-300 w-36 sm:w-40 min-h-[105px] flex flex-col items-center justify-center group"
                          >
                            <div className="h-12 w-full flex items-center justify-center">
                              <img src={s.logo ? getFullUrl(s.logo) : getFullUrl(settings?.logo_url)} alt={s.name} className="max-h-full max-w-full object-contain opacity-80 group-hover:opacity-100 transition duration-300" />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-600 mt-1.5 line-clamp-2 w-full px-0.5 text-center group-hover:text-primary transition-colors leading-tight">
                              {s.short_name || s.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
