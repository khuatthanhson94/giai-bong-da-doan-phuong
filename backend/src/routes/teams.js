import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

function enrichTeam(team) {
  const players = db.prepare('SELECT * FROM players WHERE team_id = ? AND deleted_at IS NULL ORDER BY jersey_number').all(team.id);
  const standings = getTeamStats(team.id);
  return { ...team, players, ...standings };
}

function getTeamStats(teamId) {
  const matches = db.prepare(`
    SELECT * FROM matches
    WHERE published = 1 AND status = 'finished' AND deleted_at IS NULL
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
    const { search, tournament_id } = req.query;
    let sql = `
      SELECT t.*, g.id as group_id, g.name as group_name
      FROM teams t
      LEFT JOIN group_teams gt ON t.id = gt.team_id
      LEFT JOIN groups g ON gt.group_id = g.id AND g.deleted_at IS NULL
      WHERE t.deleted_at IS NULL
    `;
    const params = [];

    if (tournament_id) {
      sql += ' AND t.tournament_id = ?';
      params.push(Number(tournament_id));
    }
    if (search) {
      sql += ' AND t.name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' GROUP BY t.id';
    sql += ' ORDER BY t.name';

    const teams = db.prepare(sql).all(...params);
    res.json(teams.map(t => ({ ...t, ...getTeamStats(t.id) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
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

    logAction(req.user.username, 'GENERATE_TEAM_ACCOUNTS', `Tự động tạo tài khoản đại diện cho ${generatedCount} đội bóng`);
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

    // Determine tournament_id
    const { tournament_id } = req.query;
    let tId = tournament_id ? Number(tournament_id) : null;
    if (!tId) {
      const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
      if (activeTournament) tId = activeTournament.id;
    }
    if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để nhập đội' });

    db.exec('BEGIN IMMEDIATE');
    try {
      const insertTeam = db.prepare(`
        INSERT INTO teams (name, logo, jersey_color, description, image, coach, stadium, tournament_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const findGroup = db.prepare('SELECT id FROM groups WHERE name = ? AND tournament_id = ? AND deleted_at IS NULL');
      const insertGroup = db.prepare('INSERT INTO groups (name, tournament_id) VALUES (?, ?)');
      const insertGroupTeam = db.prepare('INSERT OR IGNORE INTO group_teams (group_id, team_id) VALUES (?, ?)');
      const checkUserExists = db.prepare('SELECT id FROM users WHERE username = ?');
      const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, role, team_id)
        VALUES (?, ?, 'team', ?)
      `);
      const passwordHash = bcrypt.hashSync('admin123', 10);

      for (const t of teams) {
        if (!t.name) continue;

        // Skip if team already exists in this tournament
        const existingTeam = db.prepare('SELECT id FROM teams WHERE name = ? AND tournament_id = ? AND deleted_at IS NULL').get(t.name, tId);
        if (existingTeam) continue;

        const result = insertTeam.run(
          t.name,
          t.logo || null,
          t.jersey_color || '#0066CC',
          t.description || '',
          t.image || null,
          t.coach || null,
          t.stadium || null,
          tId
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
          let g = findGroup.get(gName, tId);
          let groupId;
          if (!g) {
            const groupResult = insertGroup.run(gName, tId);
            groupId = groupResult.lastInsertRowid;
          } else {
            groupId = g.id;
          }
          insertGroupTeam.run(groupId, teamId);
        }
      }
      db.exec('COMMIT');
      logAction(req.user.username, 'IMPORT_TEAMS', `Nhập danh sách ${teams.length} đội bóng từ tệp Excel cho giải đấu ID: ${tId}`);
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
    const { name, logo, jersey_color, description, image, coach, stadium, tournament_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên đội không được trống' });

    let tId = tournament_id ? Number(tournament_id) : null;
    if (!tId) {
      const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
      if (activeTournament) tId = activeTournament.id;
    }
    if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để phân bổ đội' });

    // Prevent duplicate team names in the same tournament
    const existingTeam = db.prepare('SELECT id FROM teams WHERE name = ? AND tournament_id = ? AND deleted_at IS NULL').get(name, tId);
    if (existingTeam) {
      return res.status(400).json({ error: `Đội bóng "${name}" đã tồn tại trong giải đấu này` });
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      const result = db.prepare(`
        INSERT INTO teams (name, logo, jersey_color, description, image, coach, stadium, tournament_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, logo || null, jersey_color || '#0066CC', description || '', image || null, coach || null, stadium || null, tId);
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
      logAction(req.user.username, 'CREATE_TEAM', `Tạo đội bóng mới: ${name}`);
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
    const originalTeam = db.prepare('SELECT name FROM teams WHERE id = ?').get(req.params.id);

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
    logAction(req.user.username, 'UPDATE_TEAM', `Cập nhật thông tin đội bóng ${originalTeam?.name || req.params.id}`);
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
      db.prepare("UPDATE teams SET deleted_at = datetime('now') WHERE deleted_at IS NULL").run();
      db.prepare("UPDATE players SET deleted_at = datetime('now') WHERE deleted_at IS NULL").run();
      db.exec('COMMIT');
      logAction(req.user.username, 'DELETE_ALL_TEAMS', 'Đưa toàn bộ đội bóng vào thùng rác');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ message: 'Đã đưa tất cả đội vào thùng rác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE ONE ----------
router.delete('/:id', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const teamId = req.params.id;
    const team = db.prepare('SELECT id, name FROM teams WHERE id = ? AND deleted_at IS NULL').get(teamId);
    if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare("UPDATE teams SET deleted_at = datetime('now') WHERE id = ?").run(teamId);
      db.prepare("UPDATE players SET deleted_at = datetime('now') WHERE team_id = ?").run(teamId);
      db.exec('COMMIT');
      logAction(req.user.username, 'DELETE_TEAM', `Đưa đội bóng vào thùng rác: ${team.name}`);
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.json({ message: 'Đã đưa đội bóng vào thùng rác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
