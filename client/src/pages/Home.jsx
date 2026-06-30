import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import MatchCard, { Countdown } from '../components/MatchCard';
import StandingsTable from '../components/StandingsTable';
import { getFullUrl } from '../utils/url';

export default function Home() {
  const [data, setData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [activeHomeTab, setActiveHomeTab] = useState('group');

  // Fetch home data and teams list
  useEffect(() => {
    api.get('/home').then(setData).catch(console.error);
    api.get('/teams').then(setTeams).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { settings, latestMatch, upcomingMatches, news, standings, topScorers } = data || {};

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
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
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
                <div className="h-40 bg-gradient-to-br from-primary/20 to-youth/20 flex items-center justify-center">
                  {n.image ? (
                    <img src={getFullUrl(n.image)} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
      </div>
    </div>
  );
}
