import { Router } from 'express';
import { db } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

function enrichTeam(team) {
  const players = db.prepare('SELECT * FROM players WHERE team_id = ? ORDER BY jersey_number').all(team.id);
  const standings = getTeamStats(team.id);
  return { ...team, players, ...standings };
}

function getTeamStats(teamId) {
  const matches = db.prepare(`
    SELECT * FROM matches
    WHERE published = 1 AND status = 'finished'
    AND (team_a_id = ? OR team_b_id = ?)
  `).all(teamId, teamId);

  let played = 0, won = 0, drawn = 0, lost = 0, points = 0, goals_for = 0, goals_against = 0;
  for (const m of matches) {
    played++;
    const isHome = m.team_a_id === teamId;
    const gf = isHome ? (m.score_a ?? 0) : (m.score_b ?? 0);
    const ga = isHome ? (m.score_b ?? 0) : (m.score_a ?? 0);
    goals_for += gf;
    goals_against += ga;
    if (gf > ga) { won++; points += 3; }
    else if (gf < ga) { lost++; }
    else { drawn++; points += 1; }
  }
  return { played, won, drawn, lost, points, goals_for, goals_against, goal_diff: goals_for - goals_against };
}

// ---------- GET ----------
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    const teams = search
      ? db.prepare(`
          SELECT t.*, g.id as group_id, g.name as group_name
          FROM teams t
          LEFT JOIN group_teams gt ON t.id = gt.team_id
          LEFT JOIN groups g ON gt.group_id = g.id
          WHERE t.name LIKE ? ORDER BY t.name
        `).all(`%${search}%`)
      : db.prepare(`
          SELECT t.*, g.id as group_id, g.name as group_name
          FROM teams t
          LEFT JOIN group_teams gt ON t.id = gt.team_id
          LEFT JOIN groups g ON gt.group_id = g.id
          ORDER BY t.name
        `).all();
    res.json(teams.map(t => ({ ...t, ...getTeamStats(t.id) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
    res.json(enrichTeam(team));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- POST ----------
router.post('/', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { name, logo, jersey_color, description, image } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên đội không được trống' });
    const result = db.prepare(`
      INSERT INTO teams (name, logo, jersey_color, description, image)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, logo || null, jersey_color || '#0066CC', description || '', image || null);
    res.status(201).json({ id: result.lastInsertRowid, name, logo, jersey_color, description, image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- PUT ----------
router.put('/:id', authRequired, (req, res) => {
  try {
    const isTeamAdmin = req.user.role === 'team' && Number(req.params.id) === Number(req.user.team_id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isTeamAdmin && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa đội này' });
    }

    const { name, logo, jersey_color, description, image } = req.body;

    let info;
    if (isTeamAdmin) {
      // Team representative can only modify logo, jersey color, and description
      info = db.prepare(`
        UPDATE teams SET logo=?, jersey_color=?, description=? WHERE id=?
      `).run(logo || null, jersey_color || '#0066CC', description || '', req.params.id);
    } else {
      // Admin/Super Admin can update all
      if (!name) return res.status(400).json({ error: 'Tên đội không được trống' });
      info = db.prepare(`
        UPDATE teams SET name=?, logo=?, jersey_color=?, description=?, image=? WHERE id=?
      `).run(name, logo || null, jersey_color || '#0066CC', description || '', image || null, req.params.id);
    }

    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy đội' });
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE ALL (must come before /:id) ----------
router.delete('/all', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM goals').run();
      db.prepare('DELETE FROM yellow_cards').run();
      db.prepare('DELETE FROM red_cards').run();
      db.prepare('DELETE FROM player_votes').run();
      db.prepare('UPDATE matches SET motm_player_id = NULL').run();
      db.prepare('DELETE FROM matches').run();
      db.prepare('DELETE FROM group_teams').run();
      db.prepare('DELETE FROM players').run();
      db.prepare('DELETE FROM teams').run();
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ message: 'Đã xóa tất cả đội và dữ liệu liên quan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE ONE ----------
router.delete('/:id', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const teamId = req.params.id;
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId);
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });

    db.exec('BEGIN IMMEDIATE');
    try {
      const playerIds = db.prepare('SELECT id FROM players WHERE team_id = ?').all(teamId).map(p => p.id);
      if (playerIds.length) {
        const ph = playerIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM goals WHERE player_id IN (${ph})`).run(...playerIds);
        db.prepare(`DELETE FROM yellow_cards WHERE player_id IN (${ph})`).run(...playerIds);
        db.prepare(`DELETE FROM red_cards WHERE player_id IN (${ph})`).run(...playerIds);
        db.prepare(`DELETE FROM player_votes WHERE player_id IN (${ph})`).run(...playerIds);
        db.prepare(`UPDATE matches SET motm_player_id = NULL WHERE motm_player_id IN (${ph})`).run(...playerIds);
      }
      db.prepare('DELETE FROM matches WHERE team_a_id = ? OR team_b_id = ?').run(teamId, teamId);
      db.prepare('DELETE FROM group_teams WHERE team_id = ?').run(teamId);
      db.prepare('DELETE FROM players WHERE team_id = ?').run(teamId);
      db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ message: 'Đã xóa đội thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
