import { db } from '../db.js';

export function computeStandings() {
  const teams = db.prepare(`
    SELECT t.id, t.name, t.logo, t.jersey_color, g.id as group_id, g.name as group_name
    FROM teams t
    LEFT JOIN group_teams gt ON t.id = gt.team_id
    LEFT JOIN groups g ON gt.group_id = g.id
    ORDER BY t.name
  `).all();
  const publishedMatches = db.prepare(`
    SELECT * FROM matches WHERE published = 1 AND status = 'finished'
  `).all();

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

export function getTopScorers(limit = 10) {
  return db.prepare(`
    SELECT p.*, t.name as team_name, t.logo as team_logo
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.goals > 0
    ORDER BY p.goals DESC, p.name ASC
    LIMIT ?
  `).all(limit);
}

export function getStatistics() {
  const topScorers = db.prepare(`
    SELECT p.id, p.name, p.goals, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ORDER BY p.goals DESC LIMIT 10
  `).all();

  const topAssists = db.prepare(`
    SELECT p.id, p.name, p.assists, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ORDER BY p.assists DESC LIMIT 10
  `).all();

  const topYellow = db.prepare(`
    SELECT p.id, p.name, p.yellow_cards, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ORDER BY p.yellow_cards DESC LIMIT 10
  `).all();

  const topRed = db.prepare(`
    SELECT p.id, p.name, p.red_cards, p.photo, t.name as team_name
    FROM players p JOIN teams t ON p.team_id = t.id
    ORDER BY p.red_cards DESC LIMIT 10
  `).all();

  const teamGoals = db.prepare(`
    SELECT t.id, t.name, t.logo, COALESCE(SUM(p.goals), 0) as total_goals
    FROM teams t
    LEFT JOIN players p ON p.team_id = t.id
    GROUP BY t.id
    ORDER BY total_goals DESC
  `).all();

  const standings = computeStandings();
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
        WHERE m.published = 1 GROUP BY g.player_id
      `).all();
      for (const g of allGoals) {
        db.prepare('UPDATE players SET goals = ? WHERE id = ?').run(g.cnt, g.player_id);
      }

      const allYellow = db.prepare(`
        SELECT y.player_id, COUNT(*) as cnt FROM yellow_cards y
        JOIN matches m ON y.match_id = m.id
        WHERE m.published = 1 GROUP BY y.player_id
      `).all();
      for (const y of allYellow) {
        db.prepare('UPDATE players SET yellow_cards = ? WHERE id = ?').run(y.cnt, y.player_id);
      }

      const allRed = db.prepare(`
        SELECT r.player_id, COUNT(*) as cnt FROM red_cards r
        JOIN matches m ON r.match_id = m.id
        WHERE m.published = 1 GROUP BY r.player_id
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
        const configRow = db.prepare("SELECT value FROM settings WHERE key = 'knockout_bracket_config'").get();
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
