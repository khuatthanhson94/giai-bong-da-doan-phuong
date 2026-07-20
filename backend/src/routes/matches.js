import { Router } from 'express';
import { db, logAction, autoStartMatches } from '../db.js';
import { authRequired, canManageTournament, canManageResults } from '../middleware/auth.js';
import { publishMatchResult, computeStandings } from '../services/standings.js';
import { getVNLocalDateString } from '../utils/date.js';

const router = Router();

function enrichMatch(match) {
  const teamA = db.prepare('SELECT id, name, logo, jersey_color FROM teams WHERE id = ?').get(match.team_a_id);
  const teamB = db.prepare('SELECT id, name, logo, jersey_color FROM teams WHERE id = ?').get(match.team_b_id);
  
  const isKnockout = !/bảng|lượt|group/i.test(match.round);
  const group = isKnockout ? null : (db.prepare(`
    SELECT g.id, g.name
    FROM group_teams gt
    JOIN groups g ON gt.group_id = g.id
    WHERE gt.team_id = ?
  `).get(match.team_a_id) || null);

  const goals = db.prepare(`
    SELECT g.*, COALESCE(p.name, g.player_name) as player_name, p.jersey_number, t.name as team_name
    FROM goals g 
    LEFT JOIN players p ON g.player_id = p.id 
    LEFT JOIN teams t ON g.team_id = t.id
    WHERE g.match_id = ? ORDER BY g.minute
  `).all(match.id);
  const yellows = db.prepare(`
    SELECT y.*, COALESCE(p.name, y.player_name) as player_name, p.jersey_number
    FROM yellow_cards y 
    LEFT JOIN players p ON y.player_id = p.id 
    WHERE y.match_id = ? ORDER BY y.minute
  `).all(match.id);
  const reds = db.prepare(`
    SELECT r.*, COALESCE(p.name, r.player_name) as player_name, p.jersey_number
    FROM red_cards r 
    LEFT JOIN players p ON r.player_id = p.id 
    WHERE r.match_id = ? ORDER BY r.minute
  `).all(match.id);
  const motm = match.motm_player_id
    ? db.prepare('SELECT id, name, jersey_number, photo FROM players WHERE id = ?').get(match.motm_player_id)
    : (match.motm_player_name ? { name: match.motm_player_name } : null);
  return { ...match, team_a: teamA, team_b: teamB, goals, yellow_cards: yellows, red_cards: reds, motm, group };
}

router.get('/', (req, res) => {
  autoStartMatches();
  const { round, date, team_id, status, published, tournament_id } = req.query;
  let sql = 'SELECT * FROM matches WHERE deleted_at IS NULL';
  const params = [];

  if (round) { sql += ' AND round = ?'; params.push(round); }
  if (date) { sql += ' AND match_date = ?'; params.push(date); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (published === '1') { sql += ' AND published = 1'; }
  if (tournament_id) { sql += ' AND tournament_id = ?'; params.push(Number(tournament_id)); }
  if (team_id) {
    sql += ' AND (team_a_id = ? OR team_b_id = ?)';
    params.push(team_id, team_id);
  }
  sql += ' ORDER BY match_date, match_time';
  const matches = db.prepare(sql).all(...params);
  res.json(matches.map(enrichMatch));
});

router.get('/rounds', (req, res) => {
  const { tournament_id } = req.query;
  let sql = 'SELECT DISTINCT round FROM matches WHERE deleted_at IS NULL';
  const params = [];
  if (tournament_id) {
    sql += ' AND tournament_id = ?';
    params.push(Number(tournament_id));
  }
  sql += ' ORDER BY id';
  const rounds = db.prepare(sql).all(...params);
  res.json(rounds.map((r) => r.round));
});

router.get('/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  res.json(enrichMatch(match));
});

router.post('/generate-group-schedule', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  try {
    const { tournament_id, group_id, start_date, interval_days } = req.body;
    let tId = tournament_id ? Number(tournament_id) : null;
    if (!tId) {
      const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
      if (activeTournament) tId = activeTournament.id;
    }
    if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để lên lịch' });

    db.exec('BEGIN IMMEDIATE');
    try {
      let groups = [];
      if (group_id) {
        const group = db.prepare('SELECT id, name FROM groups WHERE id = ? AND tournament_id = ? AND deleted_at IS NULL').get(group_id, tId);
        if (!group) {
          db.exec('ROLLBACK');
          return res.status(404).json({ error: 'Không tìm thấy bảng đấu hợp lệ' });
        }
        groups = [group];
      } else {
        groups = db.prepare('SELECT id, name FROM groups WHERE tournament_id = ? AND deleted_at IS NULL').all(tId);
      }

      const insertMatch = db.prepare(`
        INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Parse custom start date or default to today
      let baseStartDate = new Date();
      if (start_date) {
        // Handle YYYY-MM-DD input cleanly
        const parts = start_date.split('-');
        if (parts.length === 3) {
          baseStartDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
      }
      
      // Determine spacing days (1 for continuous, 2 for rest 1 day, 7 for weekly)
      const spacingDays = interval_days ? Number(interval_days) : 7;

      for (const group of groups) {
        const groupTeams = db.prepare(`
          SELECT team_id FROM group_teams WHERE group_id = ?
        `).all(group.id).map(t => t.team_id);

        if (groupTeams.length < 2) continue;

        // Delete existing scheduled (unfinished) matches for these teams in this tournament
        const placeholders = groupTeams.map(() => '?').join(',');
        db.prepare(`
          DELETE FROM matches 
          WHERE status != 'finished' 
          AND tournament_id = ? 
          AND (team_a_id IN (${placeholders}) OR team_b_id IN (${placeholders}))
        `).run(tId, ...groupTeams, ...groupTeams);

        // Berger Round Robin Rotation
        let list = [...groupTeams];
        if (list.length % 2 !== 0) {
          list.push(null); // bye
        }
        const numTeams = list.length;
        const numRounds = numTeams - 1;
        const half = numTeams / 2;

        for (let round = 0; round < numRounds; round++) {
          const d = new Date(baseStartDate);
          d.setDate(d.getDate() + round * spacingDays);
          const dateStr = getVNLocalDateString(d);

          let matchIdx = 0;
          for (let i = 0; i < half; i++) {
            const teamA = list[i];
            const teamB = list[numTeams - 1 - i];
            if (teamA !== null && teamB !== null) {
              // Distribute matches during the day
              let timeStr = '08:00';
              if (matchIdx === 1) timeStr = '10:00';
              else if (matchIdx === 2) timeStr = '15:00';
              else if (matchIdx === 3) timeStr = '17:00';
              else if (matchIdx > 3) timeStr = '19:00';

              insertMatch.run(
                `Vòng bảng - Lượt ${round + 1}`,
                dateStr,
                timeStr,
                'Sân bóng Phường',
                teamA,
                teamB,
                tId
              );
              matchIdx++;
            }
          }
          // Rotate circle list
          list = [list[0], list[numTeams - 1], ...list.slice(1, numTeams - 1)];
        }
      }

      db.exec('COMMIT');
      logAction(
        req.user.username,
        'GENERATE_GROUP_SCHEDULE',
        group_id 
          ? `Tự động tạo lịch thi đấu cho bảng đấu ID: ${group_id} của giải đấu ID: ${tId} (Bắt đầu: ${start_date || 'hôm nay'}, Khoảng cách: ${spacingDays} ngày)`
          : `Tự động khởi tạo lịch thi đấu vòng bảng giải đấu ID: ${tId} (Bắt đầu: ${start_date || 'hôm nay'}, Khoảng cách: ${spacingDays} ngày)`
      );
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    res.json({ message: 'Tạo lịch thi đấu vòng bảng tự động thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-knockout', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  try {
    const { config, tournament_id } = req.body;
    if (!config || !config.startingRound || !Array.isArray(config.startingMatches)) {
      return res.status(400).json({ error: 'Cấu hình knockout không hợp lệ' });
    }

    let tId = tournament_id ? Number(tournament_id) : null;
    if (!tId) {
      const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
      if (activeTournament) tId = activeTournament.id;
    }
    if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để gán lịch knockout' });

    db.exec('BEGIN IMMEDIATE');
    try {
      // 1. Save config to settings with tournament suffix
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .run(`knockout_bracket_config_${tId}`, JSON.stringify(config));

      // 2. Collect all knockout rounds in this configuration
      const koRounds = [config.startingRound, ...(config.nextRounds || []).map(r => r.round)];

      // 3. Delete scheduled (not finished) matches in these rounds for this tournament
      const deleteStmt = db.prepare(`
        DELETE FROM matches 
        WHERE round = ? AND status != 'finished' AND tournament_id = ?
      `);
      for (const round of koRounds) {
        deleteStmt.run(round, tId);
      }

      // 4. Resolve starting round teams and insert matches using tournament standings
      const standings = computeStandings(tId);

      const resolveTeam = (source) => {
        if (source.type === 'team') {
          return Number(source.teamId);
        }
        if (source.type === 'rank') {
          const { groupId, rank } = source;
          const groupStandings = standings.filter(s => s.group_id === Number(groupId));
          const teamInfo = groupStandings[Number(rank) - 1];
          if (!teamInfo) {
            throw new Error(`Không tìm thấy đội bóng ở vị trí xếp hạng ${rank} của bảng đấu ID ${groupId}. Hãy hoàn thành vòng bảng hoặc phân bảng đầy đủ.`);
          }
          return teamInfo.team_id;
        }
        if (source.type === 'best_third') {
          const { rank } = source;
          const groupsList = db.prepare("SELECT id FROM groups WHERE tournament_id = ?").all(tId);
          const thirdTeams = [];
          for (const g of groupsList) {
            const groupStandings = standings.filter(s => s.group_id === g.id);
            if (groupStandings.length >= 3 && groupStandings[2]) {
              thirdTeams.push(groupStandings[2]);
            }
          }
          thirdTeams.sort((x, y) => y.points - x.points || y.goal_diff - x.goal_diff || y.goals_for - x.goals_for);
          const teamInfo = thirdTeams[Number(rank) - 1];
          if (!teamInfo) {
            throw new Error(`Không tìm thấy đội bóng xếp thứ 3 xuất sắc thứ ${rank}. Hãy hoàn thành vòng bảng.`);
          }
          return teamInfo.team_id;
        }
        throw new Error(`Kiểu nguồn đội không hợp lệ: ${source.type}`);
      };

      const insertMatch = db.prepare(`
        INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, status, notes, tournament_id)
        VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `);

      for (const m of config.startingMatches) {
        const teamAId = resolveTeam(m.home);
        const teamBId = resolveTeam(m.away);
        if (teamAId === teamBId) {
          throw new Error(`Hai đội đấu nhau trong một trận không thể trùng nhau.`);
        }
        const notes = `KO_ID: ${m.id}${m.notes ? ' | ' + m.notes : ''}`;
        insertMatch.run(
          config.startingRound,
          m.match_date || '',
          m.match_time || '08:00',
          m.venue || 'Sân bóng Phường',
          teamAId,
          teamBId,
          notes,
          tId
        );
      }

      db.exec('COMMIT');
      logAction(req.user.username, 'GENERATE_KNOCKOUT_SCHEDULE', `Khởi tạo vòng loại trực tiếp cho giải đấu ID: ${tId}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    res.json({ message: 'Khởi tạo vòng loại trực tiếp và cấu hình nhánh đấu thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, is_friendly } = req.body;
  
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }
  if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để tạo trận' });

  const result = db.prepare(`
    INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, is_friendly)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(round, match_date, match_time, venue, team_a_id, team_b_id, tId, is_friendly ? 1 : 0);
  const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(team_a_id);
  const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(team_b_id);
  logAction(req.user.username, 'CREATE_MATCH', `Tạo trận đấu mới: ${teamA?.name || team_a_id} vs ${teamB?.name || team_b_id} (Vòng: ${round})`);
  res.status(201).json({ id: result.lastInsertRowid, ...req.body, status: 'scheduled' });
});

router.put('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) {
    return res.status(403).json({ error: 'Không có quyền chỉnh sửa lịch thi đấu' });
  }
  next();
}, (req, res) => {
  const { round, match_date, match_time, venue, team_a_id, team_b_id, is_friendly } = req.body;
  const m = db.prepare('SELECT team_a_id, team_b_id, round FROM matches WHERE id = ?').get(req.params.id);
  db.prepare(`
    UPDATE matches SET round=?, match_date=?, match_time=?, venue=?, team_a_id=?, team_b_id=?, is_friendly=?
    WHERE id=?
  `).run(round, match_date, match_time, venue, team_a_id, team_b_id, is_friendly ? 1 : 0, req.params.id);
  const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_a_id);
  const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_b_id);
  logAction(req.user.username, 'UPDATE_MATCH', `Cập nhật lịch trận đấu ${teamA?.name || m.team_a_id} vs ${teamB?.name || m.team_b_id} (Vòng: ${m.round})`);
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const m = db.prepare('SELECT team_a_id, team_b_id, round FROM matches WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_a_id);
  const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_b_id);

  db.prepare("UPDATE matches SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
  logAction(req.user.username, 'DELETE_MATCH', `Đưa trận đấu vào thùng rác: ${teamA?.name || m.team_a_id} vs ${teamB?.name || m.team_b_id} (Vòng: ${m.round})`);
  res.json({ message: 'Đã đưa trận đấu vào thùng rác' });
});

router.post('/:id/result', authRequired, (req, res, next) => {
  if (!canManageResults(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const matchId = req.params.id;
  const { score_a, score_b, goals, yellow_cards, red_cards, motm_player_id, motm_player_name, notes, status } = req.body;

  const saveResult = () => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE matches SET score_a=?, score_b=?, motm_player_id=?, motm_player_name=?, notes=?, status=?, published = CASE WHEN ? = 'live' THEN 1 ELSE published END
        WHERE id=?
      `).run(score_a, score_b, motm_player_id || null, motm_player_name || null, notes || '', status || 'finished', status || 'finished', matchId);

      db.prepare('DELETE FROM goals WHERE match_id = ?').run(matchId);
      db.prepare('DELETE FROM yellow_cards WHERE match_id = ?').run(matchId);
      db.prepare('DELETE FROM red_cards WHERE match_id = ?').run(matchId);

      const insertGoal = db.prepare('INSERT INTO goals (match_id, player_id, player_name, team_id, minute, is_own_goal) VALUES (?, ?, ?, ?, ?, ?)');
      for (const g of goals || []) {
        insertGoal.run(matchId, g.player_id || null, g.player_name || null, g.team_id || null, g.minute, g.is_own_goal ? 1 : 0);
      }

      const insertYellow = db.prepare('INSERT INTO yellow_cards (match_id, player_id, player_name, team_id, minute) VALUES (?, ?, ?, ?, ?)');
      for (const y of yellow_cards || []) {
        insertYellow.run(matchId, y.player_id || null, y.player_name || null, y.team_id || null, y.minute);
      }

      const insertRed = db.prepare('INSERT INTO red_cards (match_id, player_id, player_name, team_id, minute) VALUES (?, ?, ?, ?, ?)');
      for (const r of red_cards || []) {
        insertRed.run(matchId, r.player_id || null, r.player_name || null, r.team_id || null, r.minute);
      }

      const m = db.prepare('SELECT team_a_id, team_b_id, round FROM matches WHERE id = ?').get(matchId);
      const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_a_id);
      const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_b_id);
      logAction(req.user.username, 'UPDATE_MATCH_RESULT', `Cập nhật kết quả trận đấu ${teamA?.name} vs ${teamB?.name}: ${score_a} - ${score_b}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };

  saveResult();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  res.json(enrichMatch(match));
});

router.post('/:id/publish', authRequired, (req, res, next) => {
  if (!canManageResults(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  try {
    const m = db.prepare('SELECT team_a_id, team_b_id FROM matches WHERE id = ?').get(req.params.id);
    const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_a_id);
    const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_b_id);
    const match = publishMatchResult(req.params.id, req.user.id);
    logAction(req.user.username, 'PUBLISH_MATCH_RESULT', `Công bố kết quả trận đấu ${teamA?.name} vs ${teamB?.name}`);
    res.json(enrichMatch(match));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/vote', (req, res) => {
  const { player_id, voter_ip } = req.body;
  const matchId = req.params.id;
  const existing = db.prepare(`
    SELECT id FROM player_votes WHERE match_id = ? AND voter_ip = ?
  `).get(matchId, voter_ip || req.ip);
  if (existing) return res.status(400).json({ error: 'Bạn đã bình chọn rồi' });
  db.prepare('INSERT INTO player_votes (match_id, player_id, voter_ip) VALUES (?, ?, ?)').run(
    matchId, player_id, voter_ip || req.ip
  );
  res.json({ message: 'Bình chọn thành công' });
});

export default router;
