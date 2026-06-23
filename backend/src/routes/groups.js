import express from 'express';
import { db } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ---------- GET ALL GROUPS ----------
router.get('/', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups').all();
    const result = groups.map(g => {
      const teams = db.prepare(`
        SELECT t.id, t.name, t.logo, t.jersey_color
        FROM group_teams gt
        JOIN teams t ON gt.team_id = t.id
        WHERE gt.group_id = ?
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
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên bảng không được trống' });
    const result = db.prepare('INSERT INTO groups (name) VALUES (?)').run(name);
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
    const info = db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy bảng' });
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- DELETE A GROUP ----------
router.delete('/:id', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM group_teams WHERE group_id = ?').run(req.params.id);
      const info = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
      if (info.changes === 0) {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'Không tìm thấy bảng' });
      }
      db.exec('COMMIT');
      res.json({ message: 'Xóa bảng thành công' });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
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
    const info = db.prepare('DELETE FROM group_teams WHERE group_id = ? AND team_id = ?').run(groupId, teamId);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy mối liên kết' });
    res.json({ message: 'Xóa đội khỏi bảng thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- AUTO-GENERATE GROUPS ----------
router.post('/generate', authRequired, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const count = req.body.count || req.body.numGroups;
    if (!Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ error: 'Số bảng đấu (count) phải là số nguyên dương' });
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      // Delete existing groups and assignments
      db.prepare('DELETE FROM group_teams').run();
      db.prepare('DELETE FROM groups').run();

      // Create new groups
      const groupNames = Array.from({ length: count }, (_, i) => {
        const char = String.fromCharCode(65 + i); // Bảng A, Bảng B, ...
        return `Bảng ${char}`;
      });

      const groupIds = [];
      const insertGroup = db.prepare('INSERT INTO groups (name) VALUES (?)');
      for (const name of groupNames) {
        const result = insertGroup.run(name);
        groupIds.push(result.lastInsertRowid);
      }

      // Fetch all teams
      const teams = db.prepare('SELECT id FROM teams').all();

      // Shuffle teams (Fisher-Yates)
      for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
      }

      // Distribute teams to groups round-robin
      const insertGroupTeam = db.prepare('INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)');
      teams.forEach((team, index) => {
        const groupId = groupIds[index % count];
        insertGroupTeam.run(groupId, team.id);
      });

      db.exec('COMMIT');
      res.json({ message: 'Tạo bảng đấu tự động thành công' });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
