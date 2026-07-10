import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
 
export default function Results() {
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('group'); // 'group' or 'knockout'
  const detailRef = useRef(null);

  useEffect(() => {
    api.get('/matches?status=finished&published=1').then((res) => {
      setMatches(res);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-primary">Kết quả trận đấu</h1>
        
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
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {displayedMatches.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelected(m);
                setTimeout(() => {
                  if (window.innerWidth < 1024) {
                    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 80);
              }}
              className={`card w-full p-4 text-left transition hover:bg-blue-50/50 ${
                selected?.id === m.id ? 'ring-2 ring-primary bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">
                    {m.group?.name || m.group_name ? `${m.group?.name || m.group_name} - ${m.round}` : m.round} • {m.match_date}
                  </p>
                  <p className="font-semibold text-gray-800">{m.team_a?.name} vs {m.team_b?.name}</p>
                </div>
                <div className="text-2xl font-bold text-primary px-4">
                  {m.score_a} - {m.score_b}
                </div>
              </div>
            </button>
          ))}
          {displayedMatches.length === 0 && (
            <div className="card p-8 text-center text-gray-400 italic border border-dashed">
              Chưa có kết quả trận đấu {activeTab === 'group' ? 'vòng bảng' : 'vòng knockout'} nào được công bố.
            </div>
          )}
        </div>

        {selected && (
          <div ref={detailRef} className="card p-6 animate-slide-up sticky top-20 border border-gray-100 bg-white shadow-lg scroll-mt-24">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              {selected.round}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-center sm:text-left w-full sm:w-auto">{selected.team_a?.name}</span>
              <span className="text-primary bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100 flex-shrink-0 text-xl font-bold">
                {selected.score_a} - {selected.score_b}
              </span>
              <span className="text-center sm:text-right w-full sm:w-auto">{selected.team_b?.name}</span>
            </h2>
            <p className="text-sm text-gray-500 mb-6 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <span>🏟️ {selected.venue}</span>
              <span>•</span>
              <span>📅 {selected.match_date} {selected.match_time}</span>
            </p>

            {selected.goals?.length > 0 && (
              <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                <h3 className="font-bold text-youth mb-3 flex items-center gap-2">
                  <span>⚽</span> Bàn thắng
                </h3>
                <div className="space-y-2">
                  {selected.goals.map((g) => (
                    <div key={g.id} className="text-sm text-gray-700 flex justify-between bg-white px-3 py-1.5 rounded border border-gray-100">
                      <span>🏃‍♂️ {g.player_name} ({g.team_name})</span>
                      <span className="font-semibold text-primary">{g.minute}'</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              {selected.yellow_cards?.length > 0 && (
                <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100/30">
                  <h3 className="font-bold text-yellow-600 mb-2 flex items-center gap-1.5">
                    <span>🟨</span> Thẻ vàng
                  </h3>
                  <div className="space-y-1">
                    {selected.yellow_cards.map((y) => (
                      <p key={y.id} className="text-xs text-gray-600">{y.minute}' - {y.player_name}</p>
                    ))}
                  </div>
                </div>
              )}

              {selected.red_cards?.length > 0 && (
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/30">
                  <h3 className="font-bold text-red-600 mb-2 flex items-center gap-1.5">
                    <span>🟥</span> Thẻ đỏ
                  </h3>
                  <div className="space-y-1">
                    {selected.red_cards.map((r) => (
                      <p key={r.id} className="text-xs text-gray-600">{r.minute}' - {r.player_name}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selected.motm && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50 flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <h3 className="font-bold text-yellow-800 text-sm">Cầu thủ xuất sắc nhất trận</h3>
                  <p className="text-sm font-semibold text-gray-700">{selected.motm.name} #{selected.motm.jersey_number}</p>
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
