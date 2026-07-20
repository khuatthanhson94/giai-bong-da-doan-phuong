import express from 'express';
import { db, logAction } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ---------- GET ALL GROUPS ----------
router.get('/', (req, res) => {
  const { tournament_id } = req.query;
  try {
    let sql = 'SELECT * FROM groups WHERE deleted_at IS NULL';
    const params = [];
    if (tournament_id) {
      sql += ' AND tournament_id = ?';
      params.push(Number(tournament_id));
    }
    const groups = db.prepare(sql).all(...params);
    const result = groups.map(g => {
      const teams = db.prepare(`
        SELECT t.id, t.name, t.logo, t.jersey_color
        FROM group_teams gt
        JOIN teams t ON gt.team_id = t.id
        WHERE gt.group_id = ? AND t.deleted_at IS NULL
      `).all(g.id);
      return { ...g, teams };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- CREATE A GROUP ----------
router.post('/', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { name, tournament_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên bảng không được trống' });

    let tId = tournament_id ? Number(tournament_id) : null;
    if (!tId) {
      const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
      if (activeTournament) tId = activeTournament.id;
    }
    if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để tạo bảng' });

    const result = db.prepare('INSERT INTO groups (name, tournament_id) VALUES (?, ?)').run(name, tId);
    logAction(req.user.username, 'CREATE_GROUP', `Tạo bảng đấu mới: ${name}`);
    res.status(201).json({ id: result.lastInsertRowid, name, teams: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE A GROUP ----------
router.put('/:id', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên bảng không được trống' });
    const originalGroup = db.prepare('SELECT name FROM groups WHERE id = ?').get(req.params.id);
    const info = db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy bảng' });
    logAction(req.user.username, 'UPDATE_GROUP', `Cập nhật tên bảng đấu từ ${originalGroup?.name || req.params.id} thành ${name}`);
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE A GROUP ----------
router.delete('/:id', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const originalGroup = db.prepare('SELECT name FROM groups WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!originalGroup) return res.status(404).json({ error: 'Không tìm thấy bảng' });

    db.prepare("UPDATE groups SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
    logAction(req.user.username, 'DELETE_GROUP', `Đưa bảng đấu vào thùng rác: ${originalGroup.name}`);
    res.json({ message: 'Đã đưa bảng đấu vào thùng rác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ASSIGN TEAMS TO GROUP ----------
router.post('/:groupId/teams', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { groupId } = req.params;
    const { teamIds } = req.body;
    if (!Array.isArray(teamIds)) {
      return res.status(400).json({ error: 'teamIds phải là một mảng' });
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      const insert = db.prepare('INSERT OR IGNORE INTO group_teams (group_id, team_id) VALUES (?, ?)');
      for (const teamId of teamIds) {
        // A team can only belong to one group at a time
        db.prepare('DELETE FROM group_teams WHERE team_id = ?').run(teamId);
        insert.run(groupId, teamId);
      }
      db.exec('COMMIT');
      const g = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
      logAction(req.user.username, 'ASSIGN_TEAMS_TO_GROUP', `Gán ${teamIds.length} đội bóng vào bảng đấu ${g?.name || groupId}`);
      res.json({ message: 'Gán đội vào bảng thành công' });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- REMOVE TEAM FROM GROUP ----------
router.delete('/:groupId/teams/:teamId', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { groupId, teamId } = req.params;
    const g = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
    const t = db.prepare('SELECT name FROM teams WHERE id = ?').get(teamId);
    const info = db.prepare('DELETE FROM group_teams WHERE group_id = ? AND team_id = ?').run(groupId, teamId);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy mối liên kết' });
    logAction(req.user.username, 'REMOVE_TEAM_FROM_GROUP', `Xóa đội bóng ${t?.name || teamId} khỏi bảng đấu ${g?.name || groupId}`);
    res.json({ message: 'Xóa đội khỏi bảng thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- AUTO-GENERATE GROUPS ----------
router.post('/generate', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const count = parseInt(req.body.count || req.body.numGroups, 10);
    if (!Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ error: 'Số bảng đấu (count) phải là số nguyên dương' });
    }

    // Xác định tournament_id từ body hoặc lấy giải đang active
    let tId = req.body.tournament_id ? Number(req.body.tournament_id) : null;
    if (!tId) {
      const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
      if (activeTournament) tId = activeTournament.id;
    }
    if (!tId) {
      return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để chia bảng' });
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      // Xóa các bảng đấu CŨ của đúng giải đấu này (không xóa giải khác)
      const oldGroups = db.prepare('SELECT id FROM groups WHERE tournament_id = ? AND deleted_at IS NULL').all(tId);
      for (const og of oldGroups) {
        db.prepare('DELETE FROM group_teams WHERE group_id = ?').run(og.id);
      }
      db.prepare('DELETE FROM groups WHERE tournament_id = ?').run(tId);

      // Tạo các bảng đấu mới với tournament_id
      const groupNames = Array.from({ length: count }, (_, i) => {
        const char = String.fromCharCode(65 + i); // Bảng A, Bảng B, ...
        return `Bảng ${char}`;
      });

      const groupIds = [];
      const insertGroup = db.prepare('INSERT INTO groups (name, tournament_id) VALUES (?, ?)');
      for (const name of groupNames) {
        const result = insertGroup.run(name, tId);
        groupIds.push(result.lastInsertRowid);
      }

      // Lấy danh sách các đội thuộc giải đấu này
      const teams = db.prepare(
        'SELECT id FROM teams WHERE tournament_id = ? AND deleted_at IS NULL'
      ).all(tId);

      // Trộn ngẫu nhiên (Fisher-Yates)
      for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
      }

      // Phân bổ đội vào các bảng theo vòng tròn
      const insertGroupTeam = db.prepare('INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)');
      teams.forEach((team, index) => {
        const groupId = groupIds[index % count];
        insertGroupTeam.run(groupId, team.id);
      });

      db.exec('COMMIT');
      logAction(req.user.username, 'AUTO_GENERATE_GROUPS', `Tự động chia đều ${teams.length} đội bóng vào ${count} bảng đấu (giải ${tId})`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    res.json({ message: 'Tạo bảng đấu tự động thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
