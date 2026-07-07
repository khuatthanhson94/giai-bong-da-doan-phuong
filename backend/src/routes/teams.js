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

import bcrypt from 'bcryptjs';

function getSlugifiedUsername(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // keep alphanumeric only
}

// ---------- POST GENERATE ACCOUNTS ----------
router.post('/generate-accounts', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const teams = db.prepare('SELECT id, name FROM teams').all();
    const checkUserByTeam = db.prepare('SELECT id FROM users WHERE team_id = ?');
    const checkUserExists = db.prepare('SELECT id FROM users WHERE username = ?');
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, team_id)
      VALUES (?, ?, 'team', ?)
    `);
    const passwordHash = bcrypt.hashSync('admin123', 10);

    let generatedCount = 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const t of teams) {
        // Check if team already has an account
        const existing = checkUserByTeam.get(t.id);
        if (existing) continue;

        // Auto create user for team
        let baseUsername = getSlugifiedUsername(t.name);
        let finalUsername = baseUsername;
        let suffix = 1;
        while (checkUserExists.get(finalUsername)) {
          finalUsername = `${baseUsername}${suffix}`;
          suffix++;
        }

        insertUser.run(finalUsername, passwordHash, t.id);
        generatedCount++;
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({
      message: `Đã tự động tạo thành công ${generatedCount} tài khoản mới cho các đội bóng chưa có tài khoản`,
      generatedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- POST IMPORT ----------
router.post('/import', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams)) return res.status(400).json({ error: 'Dữ liệu đội bóng không hợp lệ' });

    db.exec('BEGIN IMMEDIATE');
    try {
      const insertTeam = db.prepare(`
        INSERT INTO teams (name, logo, jersey_color, description, image, coach, stadium)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const findGroup = db.prepare('SELECT id FROM groups WHERE name = ?');
      const insertGroup = db.prepare('INSERT INTO groups (name) VALUES (?)');
      const insertGroupTeam = db.prepare('INSERT OR IGNORE INTO group_teams (group_id, team_id) VALUES (?, ?)');
      const checkUserExists = db.prepare('SELECT id FROM users WHERE username = ?');
      const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, role, team_id)
        VALUES (?, ?, 'team', ?)
      `);
      const passwordHash = bcrypt.hashSync('admin123', 10);

      for (const t of teams) {
        if (!t.name) continue;
        const result = insertTeam.run(
          t.name,
          t.logo || null,
          t.jersey_color || '#0066CC',
          t.description || '',
          t.image || null,
          t.coach || null,
          t.stadium || null
        );
        const teamId = result.lastInsertRowid;

        // Auto create user for team
        let baseUsername = getSlugifiedUsername(t.name);
        let finalUsername = baseUsername;
        let suffix = 1;
        while (checkUserExists.get(finalUsername)) {
          finalUsername = `${baseUsername}${suffix}`;
          suffix++;
        }
        insertUser.run(finalUsername, passwordHash, teamId);

        if (t.group_name && t.group_name.trim()) {
          const gName = t.group_name.trim();
          let g = findGroup.get(gName);
          let groupId;
          if (!g) {
            const groupResult = insertGroup.run(gName);
            groupId = groupResult.lastInsertRowid;
          } else {
            groupId = g.id;
          }
          insertGroupTeam.run(groupId, teamId);
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ message: 'Nhập danh sách đội bóng thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- POST ----------
router.post('/', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { name, logo, jersey_color, description, image, coach, stadium } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên đội không được trống' });

    db.exec('BEGIN IMMEDIATE');
    try {
      const result = db.prepare(`
        INSERT INTO teams (name, logo, jersey_color, description, image, coach, stadium)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, logo || null, jersey_color || '#0066CC', description || '', image || null, coach || null, stadium || null);
      const teamId = result.lastInsertRowid;

      // Auto create user for team
      let baseUsername = getSlugifiedUsername(name);
      let finalUsername = baseUsername;
      let suffix = 1;
      while (db.prepare('SELECT id FROM users WHERE username = ?').get(finalUsername)) {
        finalUsername = `${baseUsername}${suffix}`;
        suffix++;
      }
      const passwordHash = bcrypt.hashSync('admin123', 10);
      db.prepare(`
        INSERT INTO users (username, password_hash, role, team_id)
        VALUES (?, ?, 'team', ?)
      `).run(finalUsername, passwordHash, teamId);

      db.exec('COMMIT');
      res.status(201).json({ id: teamId, name, logo, jersey_color, description, image, coach, stadium, username: finalUsername });
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
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

    const { name, logo, jersey_color, description, image, coach, stadium } = req.body;

    let info;
    if (isTeamAdmin) {
      // Team representative can modify logo, jersey color, description, coach, and stadium
      info = db.prepare(`
        UPDATE teams SET logo=?, jersey_color=?, description=?, coach=?, stadium=? WHERE id=?
      `).run(logo || null, jersey_color || '#0066CC', description || '', coach || null, stadium || null, req.params.id);
    } else {
      // Admin/Super Admin can update all
      if (!name) return res.status(400).json({ error: 'Tên đội không được trống' });
      info = db.prepare(`
        UPDATE teams SET name=?, logo=?, jersey_color=?, description=?, image=?, coach=?, stadium=? WHERE id=?
      `).run(name, logo || null, jersey_color || '#0066CC', description || '', image || null, coach || null, stadium || null, req.params.id);
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
      db.prepare('DELETE FROM users WHERE role = \'team\'').run();
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
      db.prepare('DELETE FROM users WHERE team_id = ?').run(teamId);
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
