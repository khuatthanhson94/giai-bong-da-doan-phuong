import { db } from '../db.js';

export function computeStandings(tournamentId) {
  let teamSql = `
    SELECT t.id, t.name, t.logo, t.jersey_color, g.id as group_id, g.name as group_name
    FROM teams t
    LEFT JOIN group_teams gt ON t.id = gt.team_id
    LEFT JOIN groups g ON gt.group_id = g.id
    WHERE t.deleted_at IS NULL
  `;
  const teamParams = [];
  if (tournamentId) {
    teamSql += ' AND t.tournament_id = ?';
    teamParams.push(Number(tournamentId));
  }
  teamSql += ' ORDER BY t.name';
  const teams = db.prepare(teamSql).all(...teamParams);

  let matchSql = "SELECT * FROM matches WHERE published = 1 AND status = 'finished' AND deleted_at IS NULL AND (is_friendly IS NULL OR is_friendly = 0)";
  const matchParams = [];
  if (tournamentId) {
    matchSql += ' AND tournament_id = ?';
    matchParams.push(Number(tournamentId));
  }
  const publishedMatches = db.prepare(matchSql).all(...matchParams);

  const stats = {};
  for (const team of teams) {
    stats[team.id] = {
      team_id: team.id,
      name: team.name,
      logo: team.logo,
      jersey_color: team.jersey_color,
      group_id: team.group_id,
      group_name: team.group_name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
    };
  }

  for (const m of publishedMatches) {
    const a = stats[m.team_a_id];
    const b = stats[m.team_b_id];
    if (!a || !b) continue;

    const sa = m.score_a ?? 0;
    const sb = m.score_b ?? 0;

    a.played++;
    b.played++;
    a.goals_for += sa;
    a.goals_against += sb;
    b.goals_for += sb;
    b.goals_against += sa;

    if (sa > sb) {
      a.won++;
      a.points += 3;
      b.lost++;
    } else if (sa < sb) {
      b.won++;
      b.points += 3;
      a.lost++;
    } else {
      a.drawn++;
      b.drawn++;
      a.points += 1;
      b.points += 1;
    }
  }

  return Object.values(stats)
    .map((s) => ({ ...s, goal_diff: s.goals_for - s.goals_against }))
    .sort((x, y) => y.points - x.points || y.goal_diff - x.goal_diff || y.goals_for - x.goals_for);
}

export function getTopScorers(limit = 10, tournamentId) {
  let sql = `
    SELECT p.*, t.name as team_name, t.logo as team_logo
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.goals > 0 AND p.deleted_at IS NULL AND t.deleted_at IS NULL
  `;
  const params = [];
  if (tournamentId) {
    sql += ' AND t.tournament_id = ?';
    params.push(Number(tournamentId));
  }
  sql += ' ORDER BY p.goals DESC, p.name ASC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params);
}

export function getStatistics(tournamentId) {
  let baseWhere = 'WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL';
  const params = [];
  if (tournamentId) {
    baseWhere += ' AND t.tournament_id = ?';
    params.push(Number(tournamentId));
  }

  const topScorers = db.prepare(`
    SELECT p.id, p.name, p.goals, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ${baseWhere}
    ORDER BY p.goals DESC LIMIT 10
  `).all(...params);

  const topAssists = db.prepare(`
    SELECT p.id, p.name, p.assists, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ${baseWhere}
    ORDER BY p.assists DESC LIMIT 10
  `).all(...params);

  const topYellow = db.prepare(`
    SELECT p.id, p.name, p.yellow_cards, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ${baseWhere}
    ORDER BY p.yellow_cards DESC LIMIT 10
  `).all(...params);

  const topRed = db.prepare(`
    SELECT p.id, p.name, p.red_cards, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ${baseWhere}
    ORDER BY p.red_cards DESC LIMIT 10
  `).all(...params);

  let teamGoalsSql = `
    SELECT t.id, t.name, t.logo, COALESCE(SUM(p.goals), 0) as total_goals
    FROM teams t
    LEFT JOIN players p ON p.team_id = t.id AND p.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
  `;
  const teamGoalsParams = [];
  if (tournamentId) {
    teamGoalsSql += ' AND t.tournament_id = ?';
    teamGoalsParams.push(Number(tournamentId));
  }
  teamGoalsSql += ' GROUP BY t.id ORDER BY total_goals DESC';
  const teamGoals = db.prepare(teamGoalsSql).all(...teamGoalsParams);

  const standings = computeStandings(tournamentId);
  const bestDefense = [...standings].sort((a, b) => a.goals_against - b.goals_against);

  return { topScorers, topAssists, topYellow, topRed, teamGoals, bestDefense };
}

export function publishMatchResult(matchId, userId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) throw new Error('Không tìm thấy trận đấu');

  const runTransaction = () => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE matches SET status = 'finished', published = 1 WHERE id = ?
      `).run(matchId);

      db.prepare('UPDATE players SET goals = 0, assists = 0, yellow_cards = 0, red_cards = 0').run();

      const allGoals = db.prepare(`
        SELECT g.player_id, COUNT(*) as cnt FROM goals g
        JOIN matches m ON g.match_id = m.id
        WHERE m.published = 1 AND (m.is_friendly IS NULL OR m.is_friendly = 0) AND g.player_id IS NOT NULL GROUP BY g.player_id
      `).all();
      for (const g of allGoals) {
        db.prepare('UPDATE players SET goals = ? WHERE id = ?').run(g.cnt, g.player_id);
      }

      const allYellow = db.prepare(`
        SELECT y.player_id, COUNT(*) as cnt FROM yellow_cards y
        JOIN matches m ON y.match_id = m.id
        WHERE m.published = 1 AND (m.is_friendly IS NULL OR m.is_friendly = 0) AND y.player_id IS NOT NULL GROUP BY y.player_id
      `).all();
      for (const y of allYellow) {
        db.prepare('UPDATE players SET yellow_cards = ? WHERE id = ?').run(y.cnt, y.player_id);
      }

      const allRed = db.prepare(`
        SELECT r.player_id, COUNT(*) as cnt FROM red_cards r
        JOIN matches m ON r.match_id = m.id
        WHERE m.published = 1 AND (m.is_friendly IS NULL OR m.is_friendly = 0) AND r.player_id IS NOT NULL GROUP BY r.player_id
      `).all();
      for (const r of allRed) {
        db.prepare('UPDATE players SET red_cards = ? WHERE id = ?').run(r.cnt, r.player_id);
      }

      if (userId) {
        db.prepare(`
          INSERT INTO activity_logs (user_id, action, details)
          VALUES (?, 'publish_match', ?)
        `).run(userId, JSON.stringify({ match_id: matchId }));
      }

      // ---------- AUTOMATIC PROGRESSION FOR KNOCKOUT STAGE ----------
      const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
      const matchNotes = updatedMatch.notes || '';
      const matchResultMatch = matchNotes.match(/KO_ID:\s*(\w+)/);
      const bracketMatchId = matchResultMatch ? matchResultMatch[1] : null;

      if (bracketMatchId) {
        const configRow = db.prepare("SELECT value FROM settings WHERE key = ?").get(`knockout_bracket_config_${updatedMatch.tournament_id}`);
        if (configRow) {
          const config = JSON.parse(configRow.value);
          const scoreA = updatedMatch.score_a ?? 0;
          const scoreB = updatedMatch.score_b ?? 0;
          let winnerTeamId = null;
          if (scoreA > scoreB) {
            winnerTeamId = updatedMatch.team_a_id;
          } else if (scoreB > scoreA) {
            winnerTeamId = updatedMatch.team_b_id;
          } else {
            // Tie breaker fallback: if equal, default to Team A
            winnerTeamId = updatedMatch.team_a_id;
          }

          const getWinnerOfBracketMatch = (bracketId) => {
            const matchRow = db.prepare(`
              SELECT * FROM matches 
              WHERE published = 1 AND status = 'finished' AND notes LIKE ?
            `).get(`%KO_ID: ${bracketId}%`);
            if (!matchRow) return null;
            
            const sA = matchRow.score_a ?? 0;
            const sB = matchRow.score_b ?? 0;
            if (sA > sB) return matchRow.team_a_id;
            if (sB > sA) return matchRow.team_b_id;
            return matchRow.team_a_id;
          };

          const resolveTeamInPublish = (source) => {
            if (source.type === 'team') {
              return Number(source.teamId);
            }
            if (source.type === 'rank') {
              const { groupId, rank } = source;
              const standings = computeStandings();
              const groupStandings = standings.filter(s => s.group_id === Number(groupId));
              const teamInfo = groupStandings[Number(rank) - 1];
              return teamInfo ? teamInfo.team_id : null;
            }
            return null;
          };

          const nextRounds = config.nextRounds || [];
          for (const r of nextRounds) {
            for (const m of r.matches) {
              const isHomeDep = m.home.type === 'winner' && m.home.matchId === bracketMatchId;
              const isAwayDep = m.away.type === 'winner' && m.away.matchId === bracketMatchId;
              
              if (isHomeDep || isAwayDep) {
                // Find if the next match already exists
                const existingNextMatch = db.prepare(`
                  SELECT * FROM matches 
                  WHERE round = ? AND notes LIKE ?
                `).get(r.round, `%KO_ID: ${m.id}%`);

                if (existingNextMatch) {
                  if (isHomeDep) {
                    db.prepare('UPDATE matches SET team_a_id = ? WHERE id = ?').run(winnerTeamId, existingNextMatch.id);
                  } else {
                    db.prepare('UPDATE matches SET team_b_id = ? WHERE id = ?').run(winnerTeamId, existingNextMatch.id);
                  }
                } else {
                  // Resolve both team IDs
                  let teamAId = null;
                  let teamBId = null;

                  if (m.home.type === 'winner') {
                    if (m.home.matchId === bracketMatchId) {
                      teamAId = winnerTeamId;
                    } else {
                      teamAId = getWinnerOfBracketMatch(m.home.matchId);
                    }
                  } else {
                    teamAId = resolveTeamInPublish(m.home);
                  }

                  if (m.away.type === 'winner') {
                    if (m.away.matchId === bracketMatchId) {
                      teamBId = winnerTeamId;
                    } else {
                      teamBId = getWinnerOfBracketMatch(m.away.matchId);
                    }
                  } else {
                    teamBId = resolveTeamInPublish(m.away);
                  }

                  if (teamAId !== null && teamBId !== null) {
                    const nextNotes = `KO_ID: ${m.id}${m.notes ? ' | ' + m.notes : ''}`;
                    db.prepare(`
                      INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, status, notes)
                      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
                    `).run(
                      r.round,
                      m.match_date || '',
                      m.match_time || '08:00',
                      m.venue || 'Sân bóng Phường',
                      teamAId,
                      teamBId,
                      nextNotes
                    );
                  }
                }
              }
            }
          }
        }
      }

      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };

  runTransaction();
  return db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
}
