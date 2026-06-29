import { Router } from 'express';
import { db } from '../db.js';
import { authRequired, canManageNews } from '../middleware/auth.js';

const router = Router();

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

router.get('/', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM news WHERE published = 1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/admin/all', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  res.json(db.prepare('SELECT * FROM news ORDER BY created_at DESC').all());
});

router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(item);
});

router.post('/', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { title, content, image, video_url, category, published } = req.body;
  const slug = slugify(title);
  const result = db.prepare(`
    INSERT INTO news (title, slug, content, image, video_url, category, published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, slug, content, image, video_url, category || 'general', published ?? 1);
  res.status(201).json({ id: result.lastInsertRowid, slug });
});

router.put('/:id', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { title, content, image, video_url, category, published } = req.body;
  db.prepare(`
    UPDATE news SET title=?, content=?, image=?, video_url=?, category=?, published=? WHERE id=?
  `).run(title, content, image, video_url, category, published, req.params.id);
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

export default router;
