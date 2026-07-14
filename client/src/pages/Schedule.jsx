import { useEffect, useState } from 'react';
import api from '../api/client';
import MatchCard from '../components/MatchCard';

export default function Schedule() {
  const [matches, setMatches] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filters, setFilters] = useState({ round: '', date: '', team_id: '' });
  const [activeTab, setActiveTab] = useState('group'); // 'group' or 'knockout'

  useEffect(() => {
    Promise.all([
      api.get('/matches/rounds'),
      api.get('/teams'),
    ]).then(([r, t]) => { setRounds(r); setTeams(t); });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.round) params.set('round', filters.round);
    if (filters.date) params.set('date', filters.date);
    if (filters.team_id) params.set('team_id', filters.team_id);
    api.get(`/matches?${params}`).then(setMatches);
  }, [filters]);

  // Reset round filter when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, round: '' }));
  };

  // Filter matches based on active tab
  const displayedMatches = matches.filter((m) => {
    if (m.is_friendly) return activeTab === 'friendly';
    const isGroupRound = /bảng|lượt|group/i.test(m.round);
    if (activeTab === 'friendly') return false;
    return activeTab === 'group' ? isGroupRound : !isGroupRound;
  });

  // Filter dropdown rounds based on active tab
  const displayedRounds = rounds.filter((r) => {
    if (activeTab === 'friendly') return /giao hữu|friendly/i.test(r);
    const isGroupRound = /bảng|lượt|group/i.test(r);
    return activeTab === 'group' ? isGroupRound : (!isGroupRound && !/giao hữu|friendly/i.test(r));
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-primary">Lịch thi đấu</h1>
        
        {/* Stage Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => handleTabChange('group')}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'group'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ⚽ Vòng bảng
          </button>
          <button
            onClick={() => handleTabChange('knockout')}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'knockout'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🏆 Vòng Knockout
          </button>
          <button
            onClick={() => handleTabChange('friendly')}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'friendly'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🤝 Giao hữu
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="card p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500">Vòng đấu</label>
          <select
            className="input-field cursor-pointer"
            value={filters.round}
            onChange={(e) => setFilters({ ...filters, round: e.target.value })}
          >
            <option value="">Tất cả vòng</option>
            {displayedRounds.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500">Ngày thi đấu</label>
          <input
            type="date"
            className="input-field cursor-pointer"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500">Đội bóng</label>
          <select
            className="input-field cursor-pointer"
            value={filters.team_id}
            onChange={(e) => setFilters({ ...filters, team_id: e.target.value })}
          >
            <option value="">Tất cả đội</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex items-end self-end h-[42px] mt-auto">
          <button
            onClick={() => setFilters({ round: '', date: '', team_id: '' })}
            className="btn-outline text-xs py-2 h-[42px] flex items-center justify-center"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedMatches.map((m) => (
          <MatchCard key={m.id} match={m} showScore={m.status === 'finished'} />
        ))}
      </div>
      
      {displayedMatches.length === 0 && (
        <div className="card p-12 text-center text-gray-500 border border-dashed">
          <span className="text-4xl block mb-2">📅</span>
          <p className="font-medium">Không có trận đấu {activeTab === 'group' ? 'vòng bảng' : 'vòng knockout'} nào phù hợp</p>
        </div>
      )}
    </div>
  );
}
