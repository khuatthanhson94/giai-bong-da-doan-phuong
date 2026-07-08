// server/src/routes/players.js
import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, canManageTournament } from '../middleware/auth.js';

const router = Router();

// Helper to fetch player with team info
function enrichPlayer(player) {
  const team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(player.team_id);
  return { ...player, team };
}

// Get all players (optionally filter by team)
router.get('/', (req, res) => {
  const { teamId } = req.query;
  let players;
  if (teamId) {
    players = db.prepare('SELECT * FROM players WHERE team_id = ? ORDER BY jersey_number').all(teamId);
  } else {
    players = db.prepare('SELECT * FROM players ORDER BY jersey_number').all();
  }
  res.json(players.map(enrichPlayer));
});

// Get single player
router.get('/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Không tìm thấy cầu thủ' });
  res.json(enrichPlayer(player));
});

// Create player (admin and matching team accounts)
router.post('/', authRequired, (req, res) => {
  const { team_id, name, dob, jersey_number, position, photo } = req.body;
  
  const isTeamAdmin = req.user.role === 'team' && Number(team_id) === Number(req.user.team_id);
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isTeamAdmin && !isAdmin) {
    return res.status(403).json({ error: 'Không có quyền' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO players (team_id, name, dob, jersey_number, position, photo)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(team_id), name, dob, Number(jersey_number), position, photo);
    logAction(req.user.username, 'CREATE_PLAYER', `Thêm cầu thủ mới: ${name} (Số áo: ${jersey_number})`);
    res.status(201).json({ id: result.lastInsertRowid, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update player (admin and matching team accounts)
router.put('/:id', authRequired, (req, res) => {
  const { team_id, name, dob, jersey_number, position, photo } = req.body;
  const id = req.params.id;

  try {
    const player = db.prepare('SELECT team_id, name FROM players WHERE id = ?').get(id);
    if (!player) return res.status(404).json({ error: 'Không tìm thấy cầu thủ' });

    const isTeamAdmin = req.user.role === 'team' && 
                        Number(player.team_id) === Number(req.user.team_id) && 
                        Number(team_id) === Number(req.user.team_id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (!isTeamAdmin && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền' });
    }

    db.prepare(`
      UPDATE players SET team_id=?, name=?, dob=?, jersey_number=?, position=?, photo=? WHERE id=?
    `).run(Number(team_id), name, dob, Number(jersey_number), position, photo, id);
    logAction(req.user.username, 'UPDATE_PLAYER', `Cập nhật thông tin cầu thủ: ${player.name} (ID: ${id})`);
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete player (admin and matching team accounts)
router.delete('/:id', authRequired, (req, res) => {
  const id = req.params.id;

  try {
    const player = db.prepare('SELECT team_id, name FROM players WHERE id = ?').get(id);
    if (!player) return res.status(404).json({ error: 'Không tìm thấy cầu thủ' });

    const isTeamAdmin = req.user.role === 'team' && Number(player.team_id) === Number(req.user.team_id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (!isTeamAdmin && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền' });
    }

    db.prepare('DELETE FROM players WHERE id = ?').run(id);
    logAction(req.user.username, 'DELETE_PLAYER', `Xóa cầu thủ: ${player.name}`);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk import players (admin and matching team accounts)
router.post('/import', authRequired, (req, res) => {
  const { team_id, players } = req.body;
  if (!team_id || !Array.isArray(players)) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }

  const isTeamAdmin = req.user.role === 'team' && Number(team_id) === Number(req.user.team_id);
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isTeamAdmin && !isAdmin) {
    return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này' });
  }

  try {
    db.exec('BEGIN TRANSACTION');
    const stmt = db.prepare(`
      INSERT INTO players (team_id, name, dob, jersey_number, position, photo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const p of players) {
      if (!p.name) continue;
      stmt.run(
        Number(team_id),
        p.name,
        p.dob || '',
        Number(p.jersey_number) || 0,
        p.position || 'Tiền vệ',
        p.photo || ''
      );
    }
    db.exec('COMMIT');
    const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(team_id);
    logAction(req.user.username, 'IMPORT_PLAYERS', `Nhập danh sách ${players.length} cầu thủ cho đội ${team?.name || team_id} từ Excel`);
    res.json({ message: 'Nhập danh sách cầu thủ thành công' });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

export default router;
