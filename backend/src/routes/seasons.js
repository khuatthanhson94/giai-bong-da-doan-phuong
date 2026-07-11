import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, canManageTournament } from '../middleware/auth.js';

const router = Router();

// Public: list seasons
router.get('/', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM seasons WHERE deleted_at IS NULL ORDER BY year DESC, name ASC').all();
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

// CRUD: Create Season
router.post('/', adminOnly, (req, res) => {
  const { name, year, logo, banner, status } = req.body;
  if (!name || !year) return res.status(400).json({ error: 'Thiếu tên hoặc năm của mùa giải' });
  try {
    const result = db.prepare(`
      INSERT INTO seasons (name, year, logo, banner, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, Number(year), logo || null, banner || null, status || 'active');
    
    logAction(req.user.username, 'CREATE_SEASON', `Tạo mùa giải mới: ${name} (${year})`);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Tên mùa giải đã tồn tại' });
    }
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Update Season
router.put('/:id', adminOnly, (req, res) => {
  const { name, year, logo, banner, status } = req.body;
  if (!name || !year) return res.status(400).json({ error: 'Thiếu thông tin cập nhật' });
  try {
    const item = db.prepare('SELECT name FROM seasons WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy mùa giải' });

    db.prepare(`
      UPDATE seasons
      SET name = ?, year = ?, logo = ?, banner = ?, status = ?
      WHERE id = ?
    `).run(name, Number(year), logo || null, banner || null, status || 'active', req.params.id);

    logAction(req.user.username, 'UPDATE_SEASON', `Cập nhật mùa giải: ${item.name} thành ${name}`);
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Tên mùa giải đã tồn tại' });
    }
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Soft Delete Season (Trash Bin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    const item = db.prepare('SELECT name FROM seasons WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy mùa giải' });

    db.prepare("UPDATE seasons SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);

    logAction(req.user.username, 'DELETE_SEASON', `Đưa mùa giải vào thùng rác: ${item.name}`);
    res.json({ message: 'Đã đưa vào thùng rác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
