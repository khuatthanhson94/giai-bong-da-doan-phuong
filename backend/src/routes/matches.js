import { Router } from 'express';
import { db, logAction, autoStartMatches } from '../db.js';
import { authRequired, canManageTournament, canManageResults } from '../middleware/auth.js';
import { publishMatchResult, computeStandings, recalculatePlayerStats } from '../services/standings.js';
import { getVNLocalDateString } from '../utils/date.js';

const router = Router();

export function getKnockoutPlaceholder(match, side) {
  const notes = match.notes || '';
  const koMatch = notes.match(/KO_ID:\s*(\w+)/);
  const koId = koMatch ? koMatch[1] : null;

  if (koId === 'SF1') return side === 'home' ? 'Thắng Tứ kết 1' : 'Thắng Tứ kết 2';
  if (koId === 'SF2') return side === 'home' ? 'Thắng Tứ kết 3' : 'Thắng Tứ kết 4';
  if (koId === 'F1') return side === 'home' ? 'Thắng Bán kết 1' : 'Thắng Bán kết 2';
  if (koId === '3P') return side === 'home' ? 'Thua Bán kết 1' : 'Thua Bán kết 2';

  if (/Bán kết 1/i.test(match.round)) return side === 'home' ? 'Thắng Tứ kết 1' : 'Thắng Tứ kết 2';
  if (/Bán kết 2/i.test(match.round)) return side === 'home' ? 'Thắng Tứ kết 3' : 'Thắng Tứ kết 4';
  if (/Bán kết/i.test(match.round)) return side === 'home' ? 'Thắng Tứ kết' : 'Thắng Tứ kết';
  if (/Tranh Hạng 3/i.test(match.round)) return side === 'home' ? 'Thua Bán kết 1' : 'Thua Bán kết 2';
  if (/Chung kết/i.test(match.round)) return side === 'home' ? 'Thắng Bán kết 1' : 'Thắng Bán kết 2';

  return side === 'home' ? 'Đội A' : 'Đội B';
}

function enrichMatch(match) {
  let teamA = null, teamB = null, group = null, goals = [], yellows = [], reds = [], motm = null;
  try {
    if (match.team_a_id) {
      teamA = db.prepare('SELECT id, name, logo, jersey_color FROM teams WHERE id = ?').get(match.team_a_id) || null;
    }
  } catch (e) {}
  try {
    if (match.team_b_id) {
      teamB = db.prepare('SELECT id, name, logo, jersey_color FROM teams WHERE id = ?').get(match.team_b_id) || null;
    }
  } catch (e) {}

  if (!teamA) {
    teamA = { id: null, name: getKnockoutPlaceholder(match, 'home'), logo: null, jersey_color: '#4f46e5' };
  }
  if (!teamB) {
    teamB = { id: null, name: getKnockoutPlaceholder(match, 'away'), logo: null, jersey_color: '#4f46e5' };
  }
  
  const isKnockout = !/bảng|lượt|group/i.test(match.round);
  if (!isKnockout && match.team_a_id) {
    try {
      group = db.prepare(`
        SELECT g.id, g.name
        FROM group_teams gt
        JOIN groups g ON gt.group_id = g.id
        WHERE gt.team_id = ? AND g.deleted_at IS NULL
      `).get(match.team_a_id) || null;
    } catch (e) {}
  }

  try {
    goals = db.prepare(`
      SELECT g.*, COALESCE(p.name, g.player_name) as player_name, p.jersey_number, t.name as team_name
      FROM goals g 
      LEFT JOIN players p ON g.player_id = p.id 
      LEFT JOIN teams t ON COALESCE(g.team_id, p.team_id) = t.id
      WHERE g.match_id = ? ORDER BY g.minute
    `).all(match.id);
  } catch (e) {}

  try {
    yellows = db.prepare(`
      SELECT y.*, COALESCE(p.name, y.player_name) as player_name, p.jersey_number, t.name as team_name
      FROM yellow_cards y 
      LEFT JOIN players p ON y.player_id = p.id 
      LEFT JOIN teams t ON COALESCE(y.team_id, p.team_id) = t.id
      WHERE y.match_id = ? ORDER BY y.minute
    `).all(match.id);
  } catch (e) {}

  try {
    reds = db.prepare(`
      SELECT r.*, COALESCE(p.name, r.player_name) as player_name, p.jersey_number, t.name as team_name
      FROM red_cards r 
      LEFT JOIN players p ON r.player_id = p.id 
      LEFT JOIN teams t ON COALESCE(r.team_id, p.team_id) = t.id
      WHERE r.match_id = ? ORDER BY r.minute
    `).all(match.id);
  } catch (e) {}

  if (match.motm_player_id) {
    try {
      motm = db.prepare('SELECT id, name, jersey_number, photo FROM players WHERE id = ?').get(match.motm_player_id) || null;
    } catch (e) {}
  } else if (match.motm_player_name) {
    motm = { name: match.motm_player_name };
  }

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

function addMinutesToTime(timeStr, mins) {
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

router.post('/generate-group-schedule', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  try {
    const { tournament_id, group_id, start_date, interval_days, venue_names, rest_days, start_time, match_duration_minutes } = req.body;
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
        INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', 1)
      `);

      let baseStartDate = new Date();
      if (start_date) {
        const parts = start_date.split('-');
        if (parts.length === 3) {
          baseStartDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
      }
      
      const restGap = rest_days !== undefined ? Number(rest_days) : (interval_days ? (Number(interval_days) > 1 ? 1 : 0) : 0);
      const spacingDays = restGap === 1 ? 2 : (interval_days && Number(interval_days) > 1 ? Number(interval_days) : 1);

      const venuesList = Array.isArray(venue_names) && venue_names.length > 0 
        ? venue_names 
        : ['Sân 1 - Sân bóng Tùng Thiện', 'Sân 2 - Sân bóng Tùng Thiện'];
      const baseStartTime = start_time || '07:00';
      const duration = Number(match_duration_minutes) || 60;

      for (const group of groups) {
        const groupTeams = db.prepare(`
          SELECT team_id FROM group_teams WHERE group_id = ?
        `).all(group.id).map(t => t.team_id);

        if (groupTeams.length < 2) continue;

        const placeholders = groupTeams.map(() => '?').join(',');
        db.prepare(`
          DELETE FROM matches 
          WHERE status = 'scheduled' 
          AND tournament_id = ? 
          AND (team_a_id IN (${placeholders}) OR team_b_id IN (${placeholders}))
          AND id NOT IN (SELECT match_id FROM goals UNION SELECT match_id FROM yellow_cards UNION SELECT match_id FROM red_cards)
        `).run(tId, ...groupTeams, ...groupTeams);

        let list = [...groupTeams];
        if (list.length % 2 !== 0) {
          list.push(null);
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
              const venueIndex = matchIdx % venuesList.length;
              const slotIndex = Math.floor(matchIdx / venuesList.length);
              const venue = venuesList[venueIndex];
              const matchTime = addMinutesToTime(baseStartTime, slotIndex * duration);

              insertMatch.run(
                `Vòng bảng - Lượt ${round + 1}`,
                dateStr,
                matchTime,
                venue,
                teamA,
                teamB,
                tId
              );
              matchIdx++;
            }
          }
          list = [list[0], list[numTeams - 1], ...list.slice(1, numTeams - 1)];
        }
      }

      db.exec('COMMIT');
      logAction(
        req.user.username,
        'GENERATE_GROUP_SCHEDULE',
        group_id 
          ? `Tự động tạo lịch thi đấu cho bảng đấu ID: ${group_id} của giải đấu ID: ${tId}`
          : `Tự động khởi tạo lịch thi đấu vòng bảng giải đấu ID: ${tId}`
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
    const { config, tournament_id, start_date, venue_names, rest_days, morning_start_time, afternoon_start_time, match_duration_minutes } = req.body;
    if (!config || !config.startingRound) {
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
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .run(`knockout_bracket_config_${tId}`, JSON.stringify(config));

      const koRounds = [config.startingRound, ...(config.nextRounds || []).map(r => r.round)];

      const deleteStmt = db.prepare(`
        DELETE FROM matches 
        WHERE round = ? AND status != 'finished' AND tournament_id = ?
      `);
      for (const round of koRounds) {
        deleteStmt.run(round, tId);
      }

      const standings = computeStandings(tId);

      const resolveTeam = (source) => {
        if (!source) return null;
        if (source.type === 'team') {
          return Number(source.teamId);
        }
        if (source.type === 'rank') {
          const { groupId, rank } = source;
          const groupStandings = standings.filter(s => s.group_id === Number(groupId));
          const teamInfo = groupStandings[Number(rank) - 1];
          if (teamInfo) return teamInfo.team_id;
          const groupTeams = standings.filter(s => String(s.group_id) === String(groupId));
          if (groupTeams[Number(rank) - 1]) return groupTeams[Number(rank) - 1].team_id;
          const groupTeamsList = db.prepare("SELECT team_id FROM group_teams WHERE group_id = ?").all(groupId);
          if (groupTeamsList[Number(rank) - 1]) return groupTeamsList[Number(rank) - 1].team_id;
          return null;
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
          if (teamInfo) return teamInfo.team_id;
          const fallbackThirds = [];
          for (const g of groupsList) {
            const groupTeams = standings.filter(s => s.group_id === g.id);
            if (groupTeams[2]) fallbackThirds.push(groupTeams[2]);
          }
          if (fallbackThirds[Number(rank) - 1]) return fallbackThirds[Number(rank) - 1].team_id;
          return null;
        }
        return null;
      };

      const venuesList = Array.isArray(venue_names) && venue_names.length > 0 
        ? venue_names 
        : ['Sân 1 - Sân bóng Tùng Thiện', 'Sân 2 - Sân bóng Tùng Thiện'];
      const restGap = rest_days !== undefined ? Number(rest_days) : 1;
      const spacingDays = restGap === 1 ? 2 : 1;
      const morningTime = morning_start_time || '07:00';
      const afternoonTime = afternoon_start_time || '18:00';
      const duration = Number(match_duration_minutes) || 60;

      let baseStartDate = new Date();
      if (start_date) {
        const parts = start_date.split('-');
        if (parts.length === 3) {
          baseStartDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
      }

      const koMatches = Array.isArray(config.startingMatches) && config.startingMatches.length > 0 
        ? config.startingMatches 
        : (Array.isArray(config.matches) ? config.matches : []);

      let insertedCount = 0;
      let qfIndex = 0;

      const qfDateStr = getVNLocalDateString(baseStartDate);

      for (const matchDef of koMatches) {
        const homeSource = matchDef.home || matchDef.teamA;
        const awaySource = matchDef.away || matchDef.teamB;

        const teamA = resolveTeam(homeSource);
        const teamB = resolveTeam(awaySource);

        const venueIndex = qfIndex % venuesList.length;
        const slotIndex = Math.floor(qfIndex / venuesList.length);
        const matchVenue = matchDef.venue || venuesList[venueIndex];
        const matchTime = matchDef.match_time || addMinutesToTime(morningTime, slotIndex * duration);
        const matchDate = matchDef.match_date || qfDateStr;
        const notes = `KO_ID: ${matchDef.id || 'QF' + (qfIndex + 1)}`;
        const roundName = matchDef.round || `Tứ kết ${qfIndex + 1}`;

        db.prepare(`
          INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 1)
        `).run(
          roundName,
          matchDate,
          matchTime,
          matchVenue,
          teamA,
          teamB,
          tId,
          notes
        );
        insertedCount++;
        qfIndex++;
      }

      if (Array.isArray(config.nextRounds)) {
        let roundOffset = 1;
        for (const r of config.nextRounds) {
          const rDate = new Date(baseStartDate);
          rDate.setDate(rDate.getDate() + roundOffset * spacingDays);
          const rDateStr = getVNLocalDateString(rDate);

          let mIdx = 0;
          for (const mDef of r.matches) {
            const notes = `KO_ID: ${mDef.id}`;
            const roundName = mDef.round || `${r.round} ${mIdx + 1}`;
            const venue = mDef.venue || venuesList[0];
            const time = mDef.match_time || (mIdx === 1 ? afternoonTime : morningTime);

            db.prepare(`
              INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
              VALUES (?, ?, ?, ?, NULL, NULL, ?, 'scheduled', ?, 1)
            `).run(
              roundName,
              mDef.match_date || rDateStr,
              time,
              venue,
              tId,
              notes
            );
            insertedCount++;
            mIdx++;
          }
          roundOffset++;
        }
      }

      db.exec('COMMIT');
      logAction(req.user.username, 'GENERATE_KNOCKOUT_SCHEDULE', `Khởi tạo ${insertedCount} trận đấu vòng loại trực tiếp cho giải đấu ID: ${tId}`);
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
  const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Không tìm thấy trận đấu' });

  const round = req.body.round !== undefined ? req.body.round : m.round;
  const match_date = req.body.match_date !== undefined ? req.body.match_date : m.match_date;
  const match_time = req.body.match_time !== undefined ? req.body.match_time : m.match_time;
  const venue = req.body.venue !== undefined ? req.body.venue : m.venue;
  const team_a_id = req.body.team_a_id !== undefined ? req.body.team_a_id : m.team_a_id;
  const team_b_id = req.body.team_b_id !== undefined ? req.body.team_b_id : m.team_b_id;
  const is_friendly = req.body.is_friendly !== undefined ? (req.body.is_friendly ? 1 : 0) : m.is_friendly;

  db.prepare(`
    UPDATE matches SET round=?, match_date=?, match_time=?, venue=?, team_a_id=?, team_b_id=?, is_friendly=?
    WHERE id=?
  `).run(round, match_date, match_time, venue, team_a_id, team_b_id, is_friendly, req.params.id);
  const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(team_a_id);
  const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(team_b_id);
  logAction(req.user.username, 'UPDATE_MATCH', `Cập nhật lịch trận đấu ${teamA?.name || team_a_id} vs ${teamB?.name || team_b_id} (Vòng: ${round})`);
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const m = db.prepare('SELECT team_a_id, team_b_id, round, published FROM matches WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_a_id);
  const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(m.team_b_id);

  db.prepare("UPDATE matches SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
  
  if (m.published === 1) {
    recalculatePlayerStats();
  }

  logAction(req.user.username, 'DELETE_MATCH', `Đưa trận đấu vào thùng rác: ${teamA?.name || m.team_a_id} vs ${teamB?.name || m.team_b_id} (Vòng: ${m.round})`);
  res.json({ message: 'Đã đưa trận đấu vào thùng rác' });
});

router.post('/:id/result', authRequired, (req, res, next) => {
  if (!canManageResults(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const matchId = req.params.id;
  const { score_a, score_b, penalty_a, penalty_b, goals, yellow_cards, red_cards, motm_player_id, motm_player_name, notes, status } = req.body;

  const penA = penalty_a !== undefined && penalty_a !== null && penalty_a !== '' ? Number(penalty_a) : null;
  const penB = penalty_b !== undefined && penalty_b !== null && penalty_b !== '' ? Number(penalty_b) : null;

  const saveResult = () => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE matches SET score_a=?, score_b=?, penalty_a=?, penalty_b=?, motm_player_id=?, motm_player_name=?, notes=?, status=?, published = CASE WHEN ? = 'live' THEN 1 ELSE published END
        WHERE id=?
      `).run(score_a, score_b, penA, penB, motm_player_id || null, motm_player_name || null, notes || '', status || 'finished', status || 'finished', matchId);

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
  recalculatePlayerStats();
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
