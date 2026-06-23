import { Router } from 'express';
import { db } from '../db.js';
import { authRequired, canManageNews } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const { album, type } = req.query;
  let sql = 'SELECT * FROM gallery WHERE 1=1';
  const params = [];
  if (album) { sql += ' AND album = ?'; params.push(album); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/albums', (req, res) => {
  const albums = db.prepare('SELECT DISTINCT album FROM gallery ORDER BY album').all();
  res.json(albums.map((a) => a.album));
});

router.post('/', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { title, image_url, video_url, album, type } = req.body;
  const result = db.prepare(`
    INSERT INTO gallery (title, image_url, video_url, album, type)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, image_url, video_url, album || 'Chung', type || 'image');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

export default router;
