import { Router } from 'express';
import { db } from '../db.js';
import { authRequired, canManageTournament, canManageResults } from '../middleware/auth.js';
import { publishMatchResult, computeStandings } from '../services/standings.js';

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
    SELECT g.*, p.name as player_name, p.jersey_number, t.name as team_name
    FROM goals g JOIN players p ON g.player_id = p.id JOIN teams t ON p.team_id = t.id
    WHERE g.match_id = ? ORDER BY g.minute
  `).all(match.id);
  const yellows = db.prepare(`
    SELECT y.*, p.name as player_name, p.jersey_number
    FROM yellow_cards y JOIN players p ON y.player_id = p.id WHERE y.match_id = ? ORDER BY y.minute
  `).all(match.id);
  const reds = db.prepare(`
    SELECT r.*, p.name as player_name, p.jersey_number
    FROM red_cards r JOIN players p ON r.player_id = p.id WHERE r.match_id = ? ORDER BY r.minute
  `).all(match.id);
  const motm = match.motm_player_id
    ? db.prepare('SELECT id, name, jersey_number, photo FROM players WHERE id = ?').get(match.motm_player_id)
    : null;
  return { ...match, team_a: teamA, team_b: teamB, goals, yellow_cards: yellows, red_cards: reds, motm, group };
}

router.get('/', (req, res) => {
  const { round, date, team_id, status, published } = req.query;
  let sql = 'SELECT * FROM matches WHERE 1=1';
  const params = [];

  if (round) { sql += ' AND round = ?'; params.push(round); }
  if (date) { sql += ' AND match_date = ?'; params.push(date); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (published === '1') { sql += ' AND published = 1'; }
  if (team_id) {
    sql += ' AND (team_a_id = ? OR team_b_id = ?)';
    params.push(team_id, team_id);
  }
  sql += ' ORDER BY match_date, match_time';
  const matches = db.prepare(sql).all(...params);
  res.json(matches.map(enrichMatch));
});

router.get('/rounds', (req, res) => {
  const rounds = db.prepare('SELECT DISTINCT round FROM matches ORDER BY id').all();
  res.json(rounds.map((r) => r.round));
});

router.get('/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  res.json(enrichMatch(match));
});

router.post('/generate-group-schedule', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      // Delete all matches that are NOT finished
      db.prepare("DELETE FROM matches WHERE status != 'finished'").run();

      const groups = db.prepare('SELECT id, name FROM groups').all();
      const startDate = new Date();
      const insertMatch = db.prepare(`
        INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const group of groups) {
        const groupTeams = db.prepare(`
          SELECT team_id FROM group_teams WHERE group_id = ?
        `).all(group.id).map(t => t.team_id);

        if (groupTeams.length < 2) continue;

        // Berger Round Robin Rotation
        let list = [...groupTeams];
        if (list.length % 2 !== 0) {
          list.push(null); // bye
        }
        const numTeams = list.length;
        const numRounds = numTeams - 1;
        const half = numTeams / 2;

        for (let round = 0; round < numRounds; round++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + round * 7); // Schedule weekly (e.g., Lượt 1 on Week 1, Lượt 2 on Week 2)
          const dateStr = d.toISOString().split('T')[0];

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
                `Lượt ${round + 1}`,
                dateStr,
                timeStr,
                'Sân bóng Phường',
                teamA,
                teamB
              );
              matchIdx++;
            }
          }
          // Rotate circle list
          list = [list[0], list[numTeams - 1], ...list.slice(1, numTeams - 1)];
        }
      }

      db.exec('COMMIT');
      res.json({ message: 'Tạo lịch thi đấu vòng bảng tự động thành công' });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-knockout', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  try {
    const { config } = req.body;
    if (!config || !config.startingRound || !Array.isArray(config.startingMatches)) {
      return res.status(400).json({ error: 'Cấu hình knockout không hợp lệ' });
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      // 1. Save config to settings
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('knockout_bracket_config', ?)")
        .run(JSON.stringify(config));

      // 2. Collect all knockout rounds in this configuration
      const koRounds = [config.startingRound, ...(config.nextRounds || []).map(r => r.round)];

      // 3. Delete scheduled (not finished) matches in these rounds
      const deleteStmt = db.prepare(`
        DELETE FROM matches 
        WHERE round = ? AND status != 'finished'
      `);
      for (const round of koRounds) {
        deleteStmt.run(round);
      }

      // 4. Resolve starting round teams and insert matches
      const standings = computeStandings();

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
        throw new Error(`Kiểu nguồn đội không hợp lệ: ${source.type}`);
      };

      const insertMatch = db.prepare(`
        INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
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
          notes
        );
      }

      db.exec('COMMIT');
      res.json({ message: 'Khởi tạo vòng loại trực tiếp và cấu hình nhánh đấu thành công' });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { round, match_date, match_time, venue, team_a_id, team_b_id } = req.body;
  const result = db.prepare(`
    INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(round, match_date, match_time, venue, team_a_id, team_b_id);
  res.status(201).json({ id: result.lastInsertRowid, ...req.body, status: 'scheduled' });
});

router.put('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) {
    return res.status(403).json({ error: 'Không có quyền chỉnh sửa lịch thi đấu' });
  }
  next();
}, (req, res) => {
  const { round, match_date, match_time, venue, team_a_id, team_b_id } = req.body;
  db.prepare(`
    UPDATE matches SET round=?, match_date=?, match_time=?, venue=?, team_a_id=?, team_b_id=?
    WHERE id=?
  `).run(round, match_date, match_time, venue, team_a_id, team_b_id, req.params.id);
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

router.post('/:id/result', authRequired, (req, res, next) => {
  if (!canManageResults(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const matchId = req.params.id;
  const { score_a, score_b, goals, yellow_cards, red_cards, motm_player_id, notes } = req.body;

  const saveResult = () => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE matches SET score_a=?, score_b=?, motm_player_id=?, notes=?, status='finished'
        WHERE id=?
      `).run(score_a, score_b, motm_player_id || null, notes || '', matchId);

      db.prepare('DELETE FROM goals WHERE match_id = ?').run(matchId);
      db.prepare('DELETE FROM yellow_cards WHERE match_id = ?').run(matchId);
      db.prepare('DELETE FROM red_cards WHERE match_id = ?').run(matchId);

      const insertGoal = db.prepare('INSERT INTO goals (match_id, player_id, minute, is_own_goal) VALUES (?, ?, ?, ?)');
      for (const g of goals || []) {
        insertGoal.run(matchId, g.player_id, g.minute, g.is_own_goal ? 1 : 0);
      }

      const insertYellow = db.prepare('INSERT INTO yellow_cards (match_id, player_id, minute) VALUES (?, ?, ?)');
      for (const y of yellow_cards || []) {
        insertYellow.run(matchId, y.player_id, y.minute);
      }

      const insertRed = db.prepare('INSERT INTO red_cards (match_id, player_id, minute) VALUES (?, ?, ?)');
      for (const r of red_cards || []) {
        insertRed.run(matchId, r.player_id, r.minute);
      }

      db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(
        req.user.id, 'save_result', JSON.stringify({ match_id: matchId })
      );
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
    const match = publishMatchResult(req.params.id, req.user.id);
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
