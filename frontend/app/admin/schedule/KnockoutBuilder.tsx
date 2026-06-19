"use client";

import { useEffect, useState } from "react";
import { tournamentApi, matchApi, publicApi } from "@/lib/api";
import { Standing, Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface Tournament {
  id: number;
  name: string;
  is_published: boolean;
  status: string;
  groups?: Group[];
  teams?: Team[];
}

interface Group {
  id: number;
  name: string;
  code: string;
  teams?: Team[];
}

interface BracketSource {
  type: "team" | "rank" | "winner";
  teamId?: number;
  groupId?: number;
  rank?: number;
  matchId?: string;
}

interface BracketMatch {
  id: string;
  home: BracketSource | null;
  away: BracketSource | null;
  venue: string;
  match_date: string;
  match_time: string;
  notes?: string;
}

interface NextRound {
  round: string;
  matches: BracketMatch[];
}

export default function KnockoutBuilder() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);

  const [startingRound, setStartingRound] = useState<string>("Quarter‑final");
  const [advancingCount, setAdvancingCount] = useState<number>(2);
  const [startingMatches, setStartingMatches] = useState<BracketMatch[]>([]);
  const [nextRounds, setNextRounds] = useState<NextRound[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load tournaments on mount
  useEffect(() => {
    setLoading(true);
    publicApi.getHome()
      .then((homeData) => {
        const activeId = homeData.activeTournament?.id;
        tournamentApi.list()
          .then((list) => {
            setTournaments(list);
            if (activeId && list.some((t: Tournament) => t.id === activeId)) {
              setSelectedTournamentId(String(activeId));
            } else if (list.length > 0) {
              setSelectedTournamentId(String(list[0].id));
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        tournamentApi.list()
          .then((list) => {
            setTournaments(list);
            if (list.length > 0) {
              setSelectedTournamentId(String(list[0].id));
            }
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch groups, teams, standings when selected tournament changes
  useEffect(() => {
    if (!selectedTournamentId) {
      setGroups([]);
      setTeams([]);
      setStandings([]);
      return;
    }

    setLoading(true);
    Promise.all([
      tournamentApi.get(Number(selectedTournamentId)),
      publicApi.getStandings(Number(selectedTournamentId))
    ])
      .then(([tourn, stds]) => {
        setGroups(tourn.groups || []);
        setTeams(tourn.teams || []);
        setStandings(stds || []);
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu cấu hình:", err);
      })
      .finally(() => setLoading(false));
  }, [selectedTournamentId]);

  const getGroupIdByIndex = (index: number) => {
    return groups[index]?.id || "";
  };

  // Generate default configuration
  const generateDefaults = (selectedRound: string, selectedAdvCount: number) => {
    if (groups.length === 0) return;

    const matches: BracketMatch[] = [];
    const nRounds: NextRound[] = [];

    const todayStr = new Date().toISOString().split("T")[0];

    if (selectedRound === "Quarter‑final") {
      const ids = ["QF1", "QF2", "QF3", "QF4"];
      
      const getGroupPair = (i: number) => {
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
        const pair = getGroupPair(i);
        matches.push({
          id: ids[i],
          home: { type: "rank", groupId: Number(getGroupIdByIndex(pair.homeGroup)), rank: pair.homeRank },
          away: { type: "rank", groupId: Number(getGroupIdByIndex(pair.awayGroup)), rank: pair.awayRank },
          venue: "Sân bóng Phường",
          match_date: todayStr,
          match_time: i === 0 || i === 1 ? "08:00" : "15:00",
        });
      }

      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      nRounds.push({
        round: "Semi‑final",
        matches: [
          {
            id: "SF1",
            home: { type: "winner", matchId: "QF1" },
            away: { type: "winner", matchId: "QF2" },
            venue: "Sân bóng Phường",
            match_date: nextWeek,
            match_time: "08:00",
          },
          {
            id: "SF2",
            home: { type: "winner", matchId: "QF3" },
            away: { type: "winner", matchId: "QF4" },
            venue: "Sân bóng Phường",
            match_date: nextWeek,
            match_time: "15:00",
          }
        ]
      });

      const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      nRounds.push({
        round: "Final",
        matches: [
          {
            id: "F",
            home: { type: "winner", matchId: "SF1" },
            away: { type: "winner", matchId: "SF2" },
            venue: "Sân bóng Phường",
            match_date: twoWeeks,
            match_time: "16:00",
          }
        ]
      });

    } else if (selectedRound === "Semi‑final") {
      const ids = ["SF1", "SF2"];
      const getGroupPair = (i: number) => {
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
          home: { type: "rank", groupId: Number(getGroupIdByIndex(pair.homeGroup)), rank: pair.homeRank },
          away: { type: "rank", groupId: Number(getGroupIdByIndex(pair.awayGroup)), rank: pair.awayRank },
          venue: "Sân bóng Phường",
          match_date: todayStr,
          match_time: i === 0 ? "08:00" : "15:00",
        });
      }

      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      nRounds.push({
        round: "Final",
        matches: [
          {
            id: "F",
            home: { type: "winner", matchId: "SF1" },
            away: { type: "winner", matchId: "SF2" },
            venue: "Sân bóng Phường",
            match_date: nextWeek,
            match_time: "16:00",
          }
        ]
      });

    } else if (selectedRound === "Final") {
      matches.push({
        id: "F",
        home: { type: "rank", groupId: Number(getGroupIdByIndex(0)), rank: 1 },
        away: { type: "rank", groupId: Number(getGroupIdByIndex(1)), rank: 1 },
        venue: "Sân bóng Phường",
        match_date: todayStr,
        match_time: "16:00",
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

  const updateMatchValue = (matchId: string, field: keyof BracketMatch, val: any) => {
    setStartingMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return { ...m, [field]: val };
      }
      return m;
    }));
  };

  const updateNextRoundMatchValue = (roundIdx: number, matchId: string, field: keyof BracketMatch, val: any) => {
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

  const parseSourceString = (str: string): BracketSource | null => {
    if (!str) return null;
    const [type, arg1, arg2] = str.split(":");
    if (type === "team") return { type: "team", teamId: Number(arg1) };
    if (type === "rank") return { type: "rank", groupId: Number(arg1), rank: Number(arg2) };
    if (type === "winner") return { type: "winner", matchId: arg1 };
    return null;
  };

  const serializeSource = (source: BracketSource | null): string => {
    if (!source) return "";
    if (source.type === "team") return `team:${source.teamId}`;
    if (source.type === "rank") return `rank:${source.groupId}:${source.rank}`;
    if (source.type === "winner") return `winner:${source.matchId}`;
    return "";
  };

  const getTeamPreviewName = (source: BracketSource | null): string => {
    if (!source) return "Chưa chọn";
    if (source.type === "team") {
      const team = teams.find(t => t.id === Number(source.teamId));
      return team ? team.name : "Không tìm thấy đội";
    }
    if (source.type === "rank") {
      const { groupId, rank } = source;
      const group = groups.find(g => g.id === Number(groupId));
      const groupName = group ? group.name : `Bảng ID ${groupId}`;
      const groupStandings = standings.filter(s => (s as any).tournament_group_id === Number(groupId));
      const teamInfo = groupStandings[Number(rank) - 1];
      
      const rankName = rank === 1 ? "Nhất" : rank === 2 ? "Nhì" : rank === 3 ? "Ba" : `${rank}`;
      const actualTeamText = teamInfo ? ` (${teamInfo.name})` : " (Chưa xác định)";
      return `${rankName} ${groupName}${actualTeamText}`;
    }
    if (source.type === "winner") {
      return `Thắng ${source.matchId}`;
    }
    return "";
  };

  const getMatchesForRound = (roundName: string): BracketMatch[] => {
    if (roundName === startingRound) {
      return startingMatches;
    }
    const foundRound = nextRounds.find(r => r.round === roundName);
    return foundRound ? foundRound.matches : [];
  };

  const renderDropdownOptions = (allowWinnersFromRound: string | null = null) => {
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
        const rankText = r === 1 ? "Nhất" : r === 2 ? "Nhì" : r === 3 ? "Ba" : `${r}`;
        const groupStandings = standings.filter(s => (s as any).tournament_group_id === g.id);
        const teamInfo = groupStandings[r - 1];
        const teamLabel = teamInfo ? ` (${teamInfo.name})` : " (Chưa xác định)";
        options.push(
          <option key={`rank:${g.id}:${r}`} value={`rank:${g.id}:${r}`}>
            ⚽ {rankText} {g.name}{teamLabel}
          </option>
        );
      }
    });

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
    const allMatches = [...startingMatches, ...nextRounds.flatMap(r => r.matches)];
    const hasUnselected = allMatches.some(m => !m.home || !m.away);
    if (hasUnselected) {
      alert("Vui lòng hoàn thành ghép cặp cho tất cả các trận đấu.");
      return;
    }

    const hasDuplicatePairings = startingMatches.some(m => {
      const homeStr = serializeSource(m.home);
      const awayStr = serializeSource(m.away);
      return homeStr === awayStr;
    });

    if (hasDuplicatePairings) {
      alert("Không được chọn hai đội đấu nhau là cùng một vị trí.");
      return;
    }

    const confirmMsg = "Hệ thống sẽ lưu cấu hình nhánh đấu và khởi tạo lịch thi đấu các trận đấu ở vòng bắt đầu. Các trận đấu vòng loại trực tiếp cũ của những vòng này chưa hoàn thành sẽ bị thay thế. Bạn có chắc chắn muốn tạo?";
    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const config = {
        startingRound,
        advancingCount,
        startingMatches,
        nextRounds
      };
      const res = await matchApi.generateKnockout({
        ...config,
        // Include tournament_id
        tournament_id: Number(selectedTournamentId)
      });
      alert(res.message || "Khởi tạo vòng loại trực tiếp thành công!");
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Có lỗi xảy ra khi tạo vòng loại trực tiếp.");
    } finally {
      setSubmitting(false);
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

      {/* Select Tournament */}
      <div className="bg-card border p-6 rounded-xl shadow-sm">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chọn giải đấu cấu hình</label>
        <select
          className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Chọn giải đấu --</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.status === "active" ? "(Đang diễn ra)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Configuration Card */}
      <div className="bg-card border p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
          Bước 1: Cấu hình chung & Quy tắc thăng hạng
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vòng đấu bắt đầu</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { value: "Quarter‑final", label: "Tứ kết (8 đội)" },
                { value: "Semi‑final", label: "Bán kết (4 đội)" },
                { value: "Final", label: "Chung kết (2 đội)" }
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
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Số đội lọt vào từ mỗi bảng</label>
            <select
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
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
            <Button
              variant="outline"
              onClick={handleApplyDefaults}
              className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              🔄 Đặt lại Nhánh mặc định
            </Button>
          </div>
        </div>
      </div>

      {/* Starting Round Settings */}
      {startingMatches.length > 0 && (
        <div className="bg-card border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            Bước 2: Chi tiết Cặp đấu Vòng bắt đầu ({startingRound === "Quarter‑final" ? "Tứ kết" : startingRound === "Semi‑final" ? "Bán kết" : "Chung kết"})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 text-left border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Trận</th>
                  <th className="py-3 px-4 w-5/12">Đội Nhà / Đội A</th>
                  <th className="py-3 px-4 text-center w-1/12">VS</th>
                  <th className="py-3 px-4 w-5/12">Đội Khách / Đội B</th>
                  <th className="py-3 px-4">Thông tin trận đấu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {startingMatches.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-primary/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-foreground">{m.id}</td>
                    
                    <td className="py-4 px-4">
                      <select
                        className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={serializeSource(m.home)}
                        onChange={(e) => updateMatchValue(m.id, "home", parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions()}
                      </select>
                      <div className="text-xs text-muted-foreground mt-1 font-medium italic">
                        Hiện tại: {getTeamPreviewName(m.home)}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-extrabold text-muted-foreground">VS</td>

                    <td className="py-4 px-4">
                      <select
                        className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={serializeSource(m.away)}
                        onChange={(e) => updateMatchValue(m.id, "away", parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions()}
                      </select>
                      <div className="text-xs text-muted-foreground mt-1 font-medium italic">
                        Hiện tại: {getTeamPreviewName(m.away)}
                      </div>
                    </td>

                    <td className="py-4 px-4 space-y-2">
                      <input
                        type="date"
                        className="flex h-8 w-full rounded-md border border-border bg-card px-3 text-xs focus-visible:outline-none focus-visible:ring-2"
                        value={m.match_date}
                        onChange={(e) => updateMatchValue(m.id, "match_date", e.target.value)}
                        required
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="time"
                          className="flex h-8 w-full rounded-md border border-border bg-card px-2 text-xs focus-visible:outline-none"
                          value={m.match_time}
                          onChange={(e) => updateMatchValue(m.id, "match_time", e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Sân đấu"
                          className="flex h-8 w-full rounded-md border border-border bg-card px-2 text-xs focus-visible:outline-none"
                          value={m.venue}
                          onChange={(e) => updateMatchValue(m.id, "venue", e.target.value)}
                          required
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next Rounds Settings */}
      {nextRounds.map((roundObj, roundIdx) => (
        <div key={roundObj.round} className="bg-card border p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
            Cấu hình nhánh đấu kế tiếp: {roundObj.round === "Semi‑final" ? "Bán kết" : "Chung kết"}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 text-left border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Trận</th>
                  <th className="py-3 px-4 w-5/12">Nguồn Đội A</th>
                  <th className="py-3 px-4 text-center w-1/12">VS</th>
                  <th className="py-3 px-4 w-5/12">Nguồn Đội B</th>
                  <th className="py-3 px-4">Thông tin trận đấu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roundObj.matches.map((m) => (
                  <tr key={m.id} className="hover:bg-indigo-500/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-foreground">{m.id}</td>

                    <td className="py-4 px-4">
                      <select
                        className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={serializeSource(m.home)}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, "home", parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions(
                          roundObj.round === "Semi‑final" ? "Quarter‑final" : "Semi‑final"
                        )}
                      </select>
                      <div className="text-xs text-muted-foreground mt-1 font-medium italic">
                        Xem trước: {getTeamPreviewName(m.home)}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-extrabold text-muted-foreground">VS</td>

                    <td className="py-4 px-4">
                      <select
                        className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={serializeSource(m.away)}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, "away", parseSourceString(e.target.value))}
                      >
                        <option value="">-- Chọn nguồn đội --</option>
                        {renderDropdownOptions(
                          roundObj.round === "Semi‑final" ? "Quarter‑final" : "Semi‑final"
                        )}
                      </select>
                      <div className="text-xs text-muted-foreground mt-1 font-medium italic">
                        Xem trước: {getTeamPreviewName(m.away)}
                      </div>
                    </td>

                    <td className="py-4 px-4 space-y-2">
                      <input
                        type="date"
                        className="flex h-8 w-full rounded-md border border-border bg-card px-3 text-xs focus-visible:outline-none"
                        value={m.match_date}
                        onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, "match_date", e.target.value)}
                        required
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="time"
                          className="flex h-8 w-full rounded-md border border-border bg-card px-2 text-xs focus-visible:outline-none"
                          value={m.match_time}
                          onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, "match_time", e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Sân đấu"
                          className="flex h-8 w-full rounded-md border border-border bg-card px-2 text-xs focus-visible:outline-none"
                          value={m.venue}
                          onChange={(e) => updateNextRoundMatchValue(roundIdx, m.id, "venue", e.target.value)}
                          required
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Visual Bracket Diagram */}
      <div className="bg-card border p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
          Sơ đồ nhánh đấu trực quan (Tournament Bracket Diagram)
        </h2>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center p-4 bg-muted/30 rounded-xl overflow-x-auto">
          
          {/* Quarter-finals column */}
          {startingRound === "Quarter‑final" && (
            <div className="flex flex-col justify-around gap-6 min-w-[240px]">
              <div className="text-center font-bold text-xs text-muted-foreground uppercase tracking-wider border-b pb-1 mb-2">Tứ kết</div>
              {startingMatches.map((m, idx) => (
                <div key={m.id} className="bg-card border rounded-lg p-3 shadow-sm relative hover:border-primary transition-all">
                  <div className="text-[10px] font-bold text-primary mb-1">Trận Tứ kết {idx + 1} ({m.id})</div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-muted/50 flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.home).split(" (")[0]}</span>
                    {getTeamPreviewName(m.home).includes("(") && (
                      <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.home).split(" (")[1].replace(")", "")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-muted/50 flex justify-between items-center mt-1">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.away).split(" (")[0]}</span>
                    {getTeamPreviewName(m.away).includes("(") && (
                      <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.away).split(" (")[1].replace(")", "")}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-2 flex justify-between">
                    <span>📅 {m.match_date || "Chưa định ngày"}</span>
                    <span>🏟️ {m.venue || "Sân Phường"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connectors */}
          {startingRound === "Quarter‑final" && (
            <div className="hidden lg:flex flex-col justify-around text-muted-foreground/30 font-extralight text-xl">
              <div>➔</div>
              <div>➔</div>
            </div>
          )}

          {/* Semi-finals column */}
          {(startingRound === "Quarter‑final" || startingRound === "Semi‑final") && (
            <div className="flex flex-col justify-around gap-6 min-w-[240px]">
              <div className="text-center font-bold text-xs text-muted-foreground uppercase tracking-wider border-b pb-1 mb-2">Bán kết</div>
              {getMatchesForRound("Semi‑final").map((m, idx) => (
                <div key={m.id} className="bg-card border rounded-lg p-3 shadow-sm relative hover:border-indigo-500 transition-all">
                  <div className="text-[10px] font-bold text-indigo-600 mb-1">Trận Bán kết {idx + 1} ({m.id})</div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-muted/50 flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.home).split(" (")[0]}</span>
                    {getTeamPreviewName(m.home).includes("(") && (
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.home).split(" (")[1].replace(")", "")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold py-1 px-2 rounded bg-muted/50 flex justify-between items-center mt-1">
                    <span className="truncate max-w-[150px]">{getTeamPreviewName(m.away).split(" (")[0]}</span>
                    {getTeamPreviewName(m.away).includes("(") && (
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 px-1 py-0.2 rounded font-bold">
                        {getTeamPreviewName(m.away).split(" (")[1].replace(")", "")}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-2 flex justify-between">
                    <span>📅 {m.match_date || "Chưa định ngày"}</span>
                    <span>🏟️ {m.venue || "Sân Phường"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connectors */}
          {(startingRound === "Quarter‑final" || startingRound === "Semi‑final") && (
            <div className="hidden lg:flex flex-col justify-around text-muted-foreground/30 font-extralight text-xl">
              <div>➔</div>
            </div>
          )}

          {/* Finals column */}
          <div className="flex flex-col justify-around gap-6 min-w-[240px]">
            <div className="text-center font-bold text-xs text-muted-foreground uppercase tracking-wider border-b pb-1 mb-2">Chung kết</div>
            {getMatchesForRound("Final").map((m) => (
              <div key={m.id} className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-3 shadow-md relative hover:shadow-lg transition-all ring-2 ring-amber-500/10">
                <div className="text-[10px] font-bold text-amber-600 mb-1">🏆 Trận Chung kết ({m.id})</div>
                <div className="text-xs font-semibold py-1 px-2 rounded bg-amber-500/10 flex justify-between items-center">
                  <span className="truncate max-w-[150px]">{getTeamPreviewName(m.home).split(" (")[0]}</span>
                  {getTeamPreviewName(m.home).includes("(") && (
                    <span className="text-[9px] bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded font-bold">
                      {getTeamPreviewName(m.home).split(" (")[1].replace(")", "")}
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold py-1 px-2 rounded bg-amber-500/10 flex justify-between items-center mt-1">
                  <span className="truncate max-w-[150px]">{getTeamPreviewName(m.away).split(" (")[0]}</span>
                  {getTeamPreviewName(m.away).includes("(") && (
                    <span className="text-[9px] bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded font-bold">
                      {getTeamPreviewName(m.away).split(" (")[1].replace(")", "")}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground mt-2 flex justify-between">
                  <span>📅 {m.match_date || "Chưa định ngày"}</span>
                  <span>🏟️ {m.venue || "Sân Phường"}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={submitting || startingMatches.length === 0}
          size="lg"
          className="shadow-lg px-8"
        >
          {submitting ? "Đang xử lý..." : "⚙️ Khởi tạo vòng Knockout & Nhánh đấu"}
        </Button>
      </div>
    </div>
  );
}
