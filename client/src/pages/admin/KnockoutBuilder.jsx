import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function KnockoutBuilder() {
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState([]);
  
  const [startingRound, setStartingRound] = useState('Quarter‑final');
  const [advancingCount, setAdvancingCount] = useState(2);
  const [startingMatches, setStartingMatches] = useState([]);
  const [nextRounds, setNextRounds] = useState([]);

  // Load essential data on mount
  useEffect(() => {
    Promise.all([
      api.get('/groups'),
      api.get('/teams'),
      api.get('/standings')
    ]).then(([g, t, s]) => {
      setGroups(g);
      setTeams(t);
      setStandings(s);
    }).catch((err) => {
      console.error('Lỗi khi tải dữ liệu cấu hình:', err);
    });
  }, []);

  const getGroupIdByIndex = (index) => {
    return groups[index]?.id || '';
  };

  // Generate default configuration
  const generateDefaults = (selectedRound, selectedAdvCount) => {
    if (groups.length === 0) return;

    const matches = [];
    const nRounds = [];

    if (selectedRound === 'Quarter‑final') {
      // 4 matches: QF1, QF2, QF3, QF4
      const ids = ['QF1', 'QF2', 'QF3', 'QF4'];
      
      const getGroupPair = (i) => {
        if (groups.length >= 4) {
          if (i === 0) return { homeGroup: 0, homeRank: 1, awayGroup: 2, awayRank: 2 }; // A1 vs C2
          if (i === 1) return { homeGroup: 1, homeRank: 1, awayGroup: 3, awayRank: 2 }; // B1 vs D2
          if (i === 2) return { homeGroup: 2, homeRank: 1, awayGroup: 0, awayRank: 2 }; // C1 vs A2
          if (i === 3) return { homeGroup: 3, homeRank: 1, awayGroup: 1, awayRank: 2 }; // D1 vs B2
        } else if (groups.length >= 2) {
          if (i === 0) return { homeGroup: 0, homeRank: 1, awayGroup: 1, awayRank: 2 }; // A1 vs B2
          if (i === 1) return { homeGroup: 1, homeRank: 1, awayGroup: 0, awayRank: 2 }; // B1 vs A2
          if (i === 2) return { homeGroup: 0, homeRank: 2, awayGroup: 1, awayRank: 1 }; // A2 vs B1
          if (i === 3) return { homeGroup: 1, homeRank: 2, awayGroup: 0, awayRank: 1 }; // B2 vs A1
        }
        return { homeGroup: 0, homeRank: 1, awayGroup: 0, awayRank: 1 };
      };

      for (let i = 0; i < 4; i++) {
        let homeSource = null;
        let awaySource = null;

        if (groups.length === 3) {
          if (i === 0) {
            homeSource = { type: 'rank', groupId: getGroupIdByIndex(0), rank: 1 };
            awaySource = { type: 'best_third', rank: 2 };
          } else if (i === 1) {
            homeSource = { type: 'rank', groupId: getGroupIdByIndex(1), rank: 1 };
            awaySource = { type: 'best_third', rank: 1 };
          } else if (i === 2) {
            homeSource = { type: 'rank', groupId: getGroupIdByIndex(2), rank: 1 };
            awaySource = { type: 'rank', groupId: getGroupIdByIndex(0), rank: 2 };
          } else if (i === 3) {
            homeSource = { type: 'rank', groupId: getGroupIdByIndex(1), rank: 2 };
            awaySource = { type: 'rank', groupId: getGroupIdByIndex(2), rank: 2 };
          }
        } else {
          const pair = getGroupPair(i);
          homeSource = { type: 'rank', groupId: getGroupIdByIndex(pair.homeGroup), rank: pair.homeRank };
          awaySource = { type: 'rank', groupId: getGroupIdByIndex(pair.awayGroup), rank: pair.awayRank };
        }

        matches.push({
          id: ids[i],
          home: homeSource,
          away: awaySource,
          venue: 'Sân bóng Phường',
          match_date: new Date().toISOString().split('T')[0],
          match_time: i === 0 || i === 1 ? '08:00' : '15:00',
        });
      }

      nRounds.push({
        round: 'Semi‑final',
        matches: [
          {
            id: 'SF1',
            home: { type: 'winner', matchId: 'QF1' },
            away: { type: 'winner', matchId: 'QF2' },
            venue: 'Sân bóng Phường',
            match_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            match_time: '08:00',
          },
          {
            id: 'SF2',
            home: { type: 'winner', matchId: 'QF3' },
            away: { type: 'winner', matchId: 'QF4' },
            venue: 'Sân bóng Phường',
            match_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            match_time: '15:00',
          }
        ]
      });

      nRounds.push({
        round: 'Final',
        matches: [
          {
            id: 'F',
            home: { type: 'winner', matchId: 'SF1' },
            away: { type: 'winner', matchId: 'SF2' },
            venue: 'Sân bóng Phường',
            match_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            match_time: '16:00',
          }
        ]
      });

    } else if (selectedRound === 'Semi‑final') {
      const ids = ['SF1', 'SF2'];
      const getGroupPair = (i) => {
        if (groups.length >= 2) {
          if (i === 0) return { homeGroup: 0, homeRank: 1, awayGroup: 1, awayRank: 2 }; // A1 vs B2
          if (i === 1) return { homeGroup: 1, homeRank: 1, awayGroup: 0, awayRank: 2 }; // B1 vs A2
        }
        return { homeGroup: 0, homeRank: 1, awayGroup: 0, awayRank: 1 };
      };

      for (let i = 0; i < 2; i++) {
        const pair = getGroupPair(i);
        matches.push({
          id: ids[i],
          home: { type: 'rank', groupId: getGroupIdByIndex(pair.homeGroup), rank: pair.homeRank },
          away: { type: 'rank', groupId: getGroupIdByIndex(pair.awayGroup), rank: pair.awayRank },
          venue: 'Sân bóng Phường',
          match_date: new Date().toISOString().split('T')[0],
          match_time: i === 0 ? '08:00' : '15:00',
        });
      }

      nRounds.push({
        round: 'Final',
        matches: [
          {
            id: 'F',
            home: { type: 'winner', matchId: 'SF1' },
            away: { type: 'winner', matchId: 'SF2' },
            venue: 'Sân bóng Phường',
            match_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            match_time: '16:00',
          }
        ]
      });

    } else if (selectedRound === 'Final') {
      matches.push({
        id: 'F',
        home: { type: 'rank', groupId: getGroupIdByIndex(0), rank: 1 },
        away: { type: 'rank', groupId: getGroupIdByIndex(1), rank: 1 },
        venue: 'Sân bóng Phường',
        match_date: new Date().toISOString().split('T')[0],
        match_time: '16:00',
      });
    }

    setStartingMatches(matches);
    setNextRounds(nRounds);
  };

  // Populate defaults when groups are loaded
  useEffect(() => {
    if (groups.length > 0 && startingMatches.length === 0) {
      generateDefaults(startingRound, advancingCount);
    }
  }, [groups]);

  const handleApplyDefaults = () => {
    generateDefaults(startingRound, advancingCount);
  };

  const updateMatchValue = (matchId, field, val) => {
    setStartingMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return { ...m, [field]: val };
      }
      return m;
    }));
  };

  const updateNextRoundMatchValue = (roundIdx, matchId, field, val) => {
    setNextRounds(prev => prev.map((r, idx) => {
      if (idx === roundIdx) {
        const updatedMatches = r.matches.map(m => {
          if (m.id === matchId) {
            return { ...m, [field]: val };
          }
          return m;
        });
        return { ...r, matches: updatedMatches };
      }
      return r;
    }));
  };

  const parseSourceString = (str) => {
    if (!str) return null;
    const [type, arg1, arg2] = str.split(':');
    if (type === 'team') return { type, teamId: Number(arg1) };
    if (type === 'rank') return { type, groupId: Number(arg1), rank: Number(arg2) };
    if (type === 'winner') return { type, matchId: arg1 };
    if (type === 'best_third') return { type, rank: Number(arg1) };
    return null;
  };

  const serializeSource = (source) => {
    if (!source) return '';
    if (source.type === 'team') return `team:${source.teamId}`;
    if (source.type === 'rank') return `rank:${source.groupId}:${source.rank}`;
    if (source.type === 'winner') return `winner:${source.matchId}`;
    if (source.type === 'best_third') return `best_third:${source.rank}`;
    return '';
  };

  const getTeamPreviewName = (source) => {
    if (!source) return 'Chưa chọn';
    if (source.type === 'team') {
      const team = teams.find(t => t.id === Number(source.teamId));
      return team ? team.name : 'Không tìm thấy đội';
    }
    if (source.type === 'rank') {
      const { groupId, rank } = source;
      const group = groups.find(g => g.id === Number(groupId));
      const groupName = group ? group.name : `Bảng ID ${groupId}`;
      const groupStandings = standings.filter(s => s.group_id === Number(groupId));
      const teamInfo = groupStandings[Number(rank) - 1];
      
      const rankName = rank === 1 ? 'Nhất' : rank === 2 ? 'Nhì' : rank === 3 ? 'Ba' : `${rank}`;
      const actualTeamText = teamInfo ? ` (${teamInfo.name})` : ' (Chưa xác định)';
      return `${rankName} ${groupName}${actualTeamText}`;
    }
    if (source.type === 'best_third') {
      const { rank } = source;
      const thirdTeams = [];
      groups.forEach(g => {
        const groupStandings = standings.filter(s => s.group_id === g.id);
        if (groupStandings.length >= 3 && groupStandings[2]) {
          thirdTeams.push(groupStandings[2]);
        }
      });
      thirdTeams.sort((x, y) => y.points - x.points || y.goal_diff - x.goal_diff || y.goals_for - x.goals_for);
      const teamInfo = thirdTeams[Number(rank) - 1];
      const actualTeamText = teamInfo ? ` (${teamInfo.name} - ${teamInfo.group_name})` : ' (Chưa xác định)';
      return `Đội thứ 3 xuất sắc nhất ${rank}${actualTeamText}`;
    }
    if (source.type === 'winner') {
      return `Thắng ${source.matchId}`;
    }
    return '';
  };

  const getMatchesForRound = (roundName) => {
    if (roundName === startingRound) {
      return startingMatches;
    }
    const foundRound = nextRounds.find(r => r.round === roundName);
    return foundRound ? foundRound.matches : [];
  };

  const renderDropdownOptions = (allowWinnersFromRound = null) => {
    const options = [];
    
    if (allowWinnersFromRound) {
      const prevMatches = getMatchesForRound(allowWinnersFromRound);
      prevMatches.forEach((m, idx) => {
        options.push(
          <option key={`winner:${m.id}`} value={`winner:${m.id}`}>
            🏆 Thắng trận {idx + 1} ({m.id})
          </option>
        );
      });
      options.push(<option key="divider-winner" disabled>----------------------------</option>);
    }

    groups.forEach(g => {
      for (let r = 1; r <= advancingCount; r++) {
        const rankText = r === 1 ? 'Nhất' : r === 2 ? 'Nhì' : r === 3 ? 'Ba' : `${r}`;
        const groupStandings = standings.filter(s => s.group_id === g.id);
        const teamInfo = groupStandings[r - 1];
        const teamLabel = teamInfo ? ` (${teamInfo.name})` : ' (Chưa xác định)';
        options.push(
          <option key={`rank:${g.id}:${r}`} value={`rank:${g.id}:${r}`}>
            ⚽ {rankText} {g.name}{teamLabel}
          </option>
        );
      }
    });

    if (groups.length === 3) {
      options.push(<option key="divider-third" disabled>----------------------------</option>);
      
      const thirdTeams = [];
      groups.forEach(g => {
        const groupStandings = standings.filter(s => s.group_id === g.id);
        if (groupStandings.length >= 3 && groupStandings[2]) {
          thirdTeams.push(groupStandings[2]);
        }
      });
      thirdTeams.sort((x, y) => y.points - x.points || y.goal_diff - x.goal_diff || y.goals_for - x.goals_for);

      const best3_1 = thirdTeams[0];
      const best3_1_Label = best3_1 ? ` (${best3_1.name} - ${best3_1.group_name})` : ' (Chưa xác định)';
      options.push(
        <option key="best_third:1" value="best_third:1">
          🥉 Đội thứ 3 xuất sắc nhất 1{best3_1_Label}
        </option>
      );

      const best3_2 = thirdTeams[1];
      const best3_2_Label = best3_2 ? ` (${best3_2.name} - ${best3_2.group_name})` : ' (Chưa xác định)';
      options.push(
        <option key="best_third:2" value="best_third:2">
          🥉 Đội thứ 3 xuất sắc nhất 2{best3_2_Label}
        </option>
      );
    }

    options.push(<option key="divider-teams" disabled>----------------------------</option>);

    teams.forEach(t => {
      options.push(
        <option key={`team:${t.id}`} value={`team:${t.id}`}>
          🛡️ {t.name}
        </option>
      );
    });

    return options;
  };

  const handleGenerate = async () => {
    // Validate that all matches have selections and home !== away
    const allMatches = [...startingMatches, ...nextRounds.flatMap(r => r.matches)];
    const hasUnselected = allMatches.some(m => !m.home || !m.away);
    if (hasUnselected) {
      alert('Vui lòng hoàn thành ghép cặp cho tất cả các trận đấu.');
      return;
    }

    const hasDuplicatePairings = startingMatches.some(m => {
      const homeStr = serializeSource(m.home);
      const awayStr = serializeSource(m.away);
      return homeStr === awayStr;
    });

    if (hasDuplicatePairings) {
      alert('Không được chọn hai đội đấu nhau là cùng một vị trí.');
      return;
    }

    const confirmMsg = 'Hệ thống sẽ lưu cấu hình nhánh đấu và khởi tạo lịch thi đấu các trận đấu ở vòng bắt đầu. Các trận đấu ở vòng bảng bị trùng lịch hoặc chưa đá ở vòng loại trực tiếp cũ sẽ bị thay thế. Bạn có chắc chắn muốn tạo?';
    if (!confirm(confirmMsg)) return;

    try {
      const config = {
        startingRound,
        advancingCount,
        startingMatches,
        nextRounds
      };
      const res = await api.post('/matches/generate-knockout', { config });
      alert(res.message || 'Khởi tạo vòng loại trực tiếp thành công!');
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi tạo vòng loại trực tiếp.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Hero Panel */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Admin Tool
          </span>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight">Thiết lập Vòng loại trực tiếp (Knockout)</h1>
          <p className="text-white/80 mt-1 max-w-2xl text-sm leading-relaxed">
            Thiết lập số đội đi tiếp, phân nhánh thi đấu và ghép cặp tự động dựa trên bảng xếp hạng vòng bảng. Các vòng sau sẽ tự động sinh trận khi có kết quả vòng trước.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
          <svg width="240" height="240" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>
          </svg>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="card p-6 border border-gray-100 bg-white">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
          Bước 1: Cấu hình chung & Quy tắc thăng hạng
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="form-label font-semibold">Vòng đấu bắt đầu</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { value: 'Quarter‑final', label: 'Tứ kết (8 đội)' },
                { value: 'Semi‑final', label: 'Bán kết (4 đội)' },
                { value: 'Final', label: 'Chung kết (2 đội)' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStartingRound(opt.value);
                    generateDefaults(opt.value, advancingCount);
                  }}
                  className={`px-3 py-3 rounded-lg border text-xs font-semibold transition-all duration-200 text-center ${
                    startingRound === opt.value
                      ? 'border-primary bg-blue-50 text-primary shadow-sm'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label font-semibold">Số đội lọt vào từ mỗi bảng</label>
            <select
              className="input-field mt-1"
              value={advancingCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAdvancingCount(val);
                generateDefaults(startingRound, val);
              }}
            >
              <option value={1}>Chỉ đội Nhất bảng (1)</option>
              <option value={2}>Đội Nhất và Nhì bảng (2)</option>
              <option value={3}>Đội Nhất, Nhì và Ba bảng (3)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyDefaults}
              className="w-full btn-outline py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              🔄 Đặt lại Nhánh mặc định
            </button>
          </div>
        </div>
      </div>

      {/* Starting Round Settings */}
      {startingMatches.length > 0 && (
        <div className="card p-6 border border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-youth inline-block"></span>
            Bước 2: Chi tiết Cặp đấu Vòng bắt đầu ({startingRound === 'Quarter‑final' ? 'Tứ kết' : startingRound === 'Semi‑final' ? 'Bán kết' : 'Chung kết'})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left border-b border-gray-100 text-gray-600 text-xs uppercase font-bold">
                  <th className="py-3 px-4">Trận</th>
                  <th className="py-3 px-4 w-5/12">Đội Nhà / Đội A</th>
                  <th className="py-3 px-4 text-center w-1/12">VS</th>
                  <th className="py-3 px-4 w-5/12">Đội Khách / Đội B</th>
                  <th className="py-3 px-4">Thông tin trận đấu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {startingMatches.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-700">{m.id}</td>
                    
                    <td className="py-4 px-4">
                      <select
                        className="input-field text-sm"
                        value={serializeSource(m.home)}
                        onChange={(e) => updateMatchValue(m.id, 'home', parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions()}
                      </select>
                      <div className="text-xs text-gray-500 mt-1 font-medium italic">
                        Hiện tại: {getTeamPreviewName(m.home)}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-extrabold text-gray-400">VS</td>

                    <td className="py-4 px-4">
                      <select
                        className="input-field text-sm"
                        value={serializeSource(m.away)}
                        onChange={(e) => updateMatchValue(m.id, 'away', parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions()}
                      </select>
                      <div className="text-xs text-gray-500 mt-1 font-medium italic">
                        Hiện tại: {getTeamPreviewName(m.away)}
                      </div>
                    </td>

                    <td className="py-4 px-4 space-y-1.5 min-w-[180px]">
                      <input
                        type="date"
                        className="input-field text-xs py-1 w-full"
                        value={m.match_date}
                        onChange={(e) => updateMatchValue(m.id, 'match_date', e.target.value)}
                        required
                      />
                      <input
                        type="time"
                        className="input-field text-xs py-1 w-full"
                        value={m.match_time}
                        onChange={(e) => updateMatchValue(m.id, 'match_time', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Sân đấu"
                        className="input-field text-xs py-1 w-full"
                        value={m.venue}
                        onChange={(e) => updateMatchValue(m.id, 'venue', e.target.value)}
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next Rounds (SF & F) Settings */}
      {nextRounds.map((roundObj, roundIdx) => (
        <div key={roundObj.round} className="card p-6 border border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
            Cấu hình nhánh đấu kế tiếp: {roundObj.round === 'Semi‑final' ? 'Bán kết' : 'Chung kết'}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left border-b border-gray-100 text-gray-600 text-xs uppercase font-bold">
                  <th className="py-3 px-4">Trận</th>
                  <th className="py-3 px-4 w-5/12">Nguồn Đội A</th>
                  <th className="py-3 px-4 text-center w-1/12">VS</th>
                  <th className="py-3 px-4 w-5/12">Nguồn Đội B</th>
                  <th className="py-3 px-4">Thông tin trận đấu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roundObj.matches.map((m) => (
                  <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-700">{m.id}</td>

                    <td className="py-4 px-4">
                      <select
                        className="input-field text-sm"
                        value={serializeSource(m.home)}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, 'home', parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions(
                          roundObj.round === 'Semi‑final' ? 'Quarter‑final' : 'Semi‑final'
                        )}
                      </select>
                      <div className="text-xs text-gray-500 mt-1 font-medium italic">
                        Xem trước: {getTeamPreviewName(m.home)}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-extrabold text-gray-400">VS</td>

                    <td className="py-4 px-4">
                      <select
                        className="input-field text-sm"
                        value={serializeSource(m.away)}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, 'away', parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions(
                          roundObj.round === 'Semi‑final' ? 'Quarter‑final' : 'Semi‑final'
                        )}
                      </select>
                      <div className="text-xs text-gray-500 mt-1 font-medium italic">
                        Xem trước: {getTeamPreviewName(m.away)}
                      </div>
                    </td>

                    <td className="py-4 px-4 space-y-1.5 min-w-[180px]">
                      <input
                        type="date"
                        className="input-field text-xs py-1 w-full"
                        value={m.match_date}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, 'match_date', e.target.value)}
                        required
                      />
                      <input
                        type="time"
                        className="input-field text-xs py-1 w-full"
                        value={m.match_time}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, 'match_time', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Sân đấu"
                        className="input-field text-xs py-1 w-full"
                        value={m.venue}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, 'venue', e.target.value)}
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Visual Interactive Tournament Bracket Diagram */}
      <div className="card p-6 border border-gray-100 bg-white">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
          Sơ đồ nhánh đấu trực quan (Tournament Bracket Diagram)
        </h2>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center p-4 bg-gray-50 rounded-xl overflow-x-auto">
          
          {/* Quarter-finals column */}
          {startingRound === 'Quarter‑final' && (
            <div className="flex flex-col justify-around gap-6 min-w-[240px]">
              <div className="text-center font-bold text-xs text-gray-400 uppercase tracking-wider border-b pb-1 mb-2">Tứ kết</div>
              {startingMatches.map((m, idx) => (
                <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative hover:border-primary transition-all">
                  <div className="text-[10px] font-bold text-primary mb-1">Trận Tứ kết {idx + 1} ({m.id})</div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-gray-50 flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.home).split(' (')[0]}</span>
                    {getTeamPreviewName(m.home).includes('(') && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.home).split(' (')[1].replace(')', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-gray-50 flex justify-between items-center mt-1">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.away).split(' (')[0]}</span>
                    {getTeamPreviewName(m.away).includes('(') && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.away).split(' (')[1].replace(')', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-2 flex justify-between">
                    <span>📅 {m.match_date || 'Chưa định ngày'}</span>
                    <span>🏟️ {m.venue || 'Sân Phường'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connectors column (only for styling/spacing) */}
          {startingRound === 'Quarter‑final' && (
            <div className="hidden lg:flex flex-col justify-around text-gray-300 font-extralight text-xl">
              <div>➔</div>
              <div>➔</div>
            </div>
          )}

          {/* Semi-finals column */}
          {(startingRound === 'Quarter‑final' || startingRound === 'Semi‑final') && (
            <div className="flex flex-col justify-around gap-6 min-w-[240px]">
              <div className="text-center font-bold text-xs text-gray-400 uppercase tracking-wider border-b pb-1 mb-2">Bán kết</div>
              {getMatchesForRound('Semi‑final').map((m, idx) => (
                <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative hover:border-indigo-500 transition-all">
                  <div className="text-[10px] font-bold text-indigo-600 mb-1">Trận Bán kết {idx + 1} ({m.id})</div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-gray-50 flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.home).split(' (')[0]}</span>
                    {getTeamPreviewName(m.home).includes('(') && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.home).split(' (')[1].replace(')', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-gray-50 flex justify-between items-center mt-1">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.away).split(' (')[0]}</span>
                    {getTeamPreviewName(m.away).includes('(') && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.away).split(' (')[1].replace(')', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-2 flex justify-between">
                    <span>📅 {m.match_date || 'Chưa định ngày'}</span>
                    <span>🏟️ {m.venue || 'Sân Phường'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connectors column (only for styling/spacing) */}
          {(startingRound === 'Quarter‑final' || startingRound === 'Semi‑final') && (
            <div className="hidden lg:flex flex-col justify-around text-gray-300 font-extralight text-xl">
              <div>➔</div>
            </div>
          )}

          {/* Finals column */}
          <div className="flex flex-col justify-around gap-6 min-w-[240px]">
            <div className="text-center font-bold text-xs text-gray-400 uppercase tracking-wider border-b pb-1 mb-2">Chung kết</div>
            {getMatchesForRound('Final').map((m) => (
              <div key={m.id} className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-300 rounded-lg p-3 shadow-md relative hover:shadow-lg transition-all ring-2 ring-yellow-400/20">
                <div className="text-[10px] font-bold text-yellow-700 mb-1">🏆 Trận Chung kết ({m.id})</div>
                <div className="text-xs font-semibold py-1 px-2 rounded bg-yellow-100/30 flex justify-between items-center">
                  <span className="truncate max-w-[150px]">{getTeamPreviewName(m.home).split(' (')[0]}</span>
                  {getTeamPreviewName(m.home).includes('(') && (
                    <span className="text-[9px] bg-yellow-200 text-yellow-800 px-1 py-0.2 rounded font-bold">
                      {getTeamPreviewName(m.home).split(' (')[1].replace(')', '')}
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold py-1 px-2 rounded bg-yellow-100/30 flex justify-between items-center mt-1">
                  <span className="truncate max-w-[150px]">{getTeamPreviewName(m.away).split(' (')[0]}</span>
                  {getTeamPreviewName(m.away).includes('(') && (
                    <span className="text-[9px] bg-yellow-200 text-yellow-800 px-1 py-0.2 rounded font-bold">
                      {getTeamPreviewName(m.away).split(' (')[1].replace(')', '')}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-gray-500 mt-2 flex justify-between">
                  <span>📅 {m.match_date || 'Chưa định ngày'}</span>
                  <span>🏟️ {m.venue || 'Sân Phường'}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Action Area */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={handleGenerate}
          className="btn-primary flex items-center gap-2 px-8 py-3 text-base shadow-lg hover:shadow-xl hover:scale-102 transition-all"
        >
          ⚙️ Khởi tạo vòng Knockout & Nhánh đấu
        </button>
      </div>
    </div>
  );
}
