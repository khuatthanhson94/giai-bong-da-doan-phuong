import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, canManageTournament } from '../middleware/auth.js';

const router = Router();

// Public: list tournaments for a season, or all tournaments if season_id is omitted
router.get('/', (req, res) => {
  const { season_id } = req.query;
  try {
    let sql = 'SELECT * FROM tournaments WHERE deleted_at IS NULL';
    const params = [];
    if (season_id) {
      sql += ' AND season_id = ?';
      params.push(Number(season_id));
    }
    sql += ' ORDER BY created_at DESC';
    const list = db.prepare(sql).all(...params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin check middleware
const adminOnly = [
  authRequired,
  (req, res, next) => {
    if (!canManageTournament(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
    next();
  }
];

// CRUD: Create Tournament
router.post('/', adminOnly, (req, res) => {
  const { season_id, name, logo, banner, format, points_win, points_draw, points_loss, advance_count, status, settings } = req.body;
  if (!season_id || !name) return res.status(400).json({ error: 'Thiếu tên hoặc ID mùa giải' });
  try {
    const result = db.prepare(`
      INSERT INTO tournaments (season_id, name, logo, banner, format, points_win, points_draw, points_loss, advance_count, status, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(season_id),
      name,
      logo || null,
      banner || null,
      format || 'group_knockout',
      Number(points_win ?? 3),
      Number(points_draw ?? 1),
      Number(points_loss ?? 0),
      Number(advance_count ?? 2),
      status || 'draft',
      settings ? JSON.stringify(settings) : null
    );
    
    logAction(req.user.username, 'CREATE_TOURNAMENT', `Tạo giải đấu mới: ${name}`);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Update Tournament
router.put('/:id', adminOnly, (req, res) => {
  const { name, logo, banner, format, points_win, points_draw, points_loss, advance_count, status, settings } = req.body;
  if (!name) return res.status(400).json({ error: 'Thiếu tên giải đấu' });
  try {
    const item = db.prepare('SELECT name FROM tournaments WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy giải đấu' });

    db.prepare(`
      UPDATE tournaments
      SET name = ?, logo = ?, banner = ?, format = ?, points_win = ?, points_draw = ?, points_loss = ?, advance_count = ?, status = ?, settings = ?
      WHERE id = ?
    `).run(
      name,
      logo || null,
      banner || null,
      format || 'group_knockout',
      Number(points_win ?? 3),
      Number(points_draw ?? 1),
      Number(points_loss ?? 0),
      Number(advance_count ?? 2),
      status || 'draft',
      settings ? (typeof settings === 'string' ? settings : JSON.stringify(settings)) : null,
      req.params.id
    );

    logAction(req.user.username, 'UPDATE_TOURNAMENT', `Cập nhật giải đấu: ${item.name} thành ${name}`);
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Soft Delete Tournament (Trash Bin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    const item = db.prepare('SELECT name FROM tournaments WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy giải đấu' });

    db.prepare("UPDATE tournaments SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);

    logAction(req.user.username, 'DELETE_TOURNAMENT', `Đưa giải đấu vào thùng rác: ${item.name}`);
    res.json({ message: 'Đã đưa vào thùng rác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
