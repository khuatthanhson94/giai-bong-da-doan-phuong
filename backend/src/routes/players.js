// server/src/routes/players.js
import { Router } from 'express';
import { db } from '../db.js';
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

// Create player (admin only)
router.post('/', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { team_id, name, dob, jersey_number, position, photo } = req.body;
  const result = db.prepare(`
    INSERT INTO players (team_id, name, dob, jersey_number, position, photo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(team_id, name, dob, jersey_number, position, photo);
  res.status(201).json({ id: result.lastInsertRowid, ...req.body });
});

// Update player (admin only)
router.put('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { team_id, name, dob, jersey_number, position, photo } = req.body;
  db.prepare(`
    UPDATE players SET team_id=?, name=?, dob=?, jersey_number=?, position=?, photo=? WHERE id=?
  `).run(team_id, name, dob, jersey_number, position, photo, req.params.id);
  res.json({ message: 'Cập nhật thành công' });
});

// Delete player (admin only)
router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

export default router;
