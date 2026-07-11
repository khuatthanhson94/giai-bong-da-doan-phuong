import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, canManageNews } from '../middleware/auth.js';

const router = Router();

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

router.get('/', (req, res) => {
  const { category, tournament_id } = req.query;
  let sql = 'SELECT * FROM news WHERE published = 1 AND deleted_at IS NULL';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (tournament_id) { sql += ' AND tournament_id = ?'; params.push(Number(tournament_id)); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/admin/all', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { tournament_id } = req.query;
  let sql = 'SELECT * FROM news WHERE deleted_at IS NULL';
  const params = [];
  if (tournament_id) {
    sql += ' AND tournament_id = ?';
    params.push(Number(tournament_id));
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM news WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(item);
});

router.post('/', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { title, content, image, video_url, category, published, tournament_id } = req.body;
  const slug = slugify(title);

  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }
  if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để tạo tin bài' });

  const result = db.prepare(`
    INSERT INTO news (title, slug, content, image, video_url, category, published, tournament_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, slug, content, image, video_url, category || 'general', published ?? 1, tId);
  logAction(req.user.username, 'CREATE_NEWS', `Tạo tin tức mới: ${title}`);
  res.status(201).json({ id: result.lastInsertRowid, slug });
});

router.put('/:id', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { title, content, image, video_url, category, published } = req.body;
  const item = db.prepare('SELECT title FROM news WHERE id = ?').get(req.params.id);
  db.prepare(`
    UPDATE news SET title=?, content=?, image=?, video_url=?, category=?, published=? WHERE id=?
  `).run(title, content, image, video_url, category, published, req.params.id);
  logAction(req.user.username, 'UPDATE_NEWS', `Cập nhật tin tức: ${item?.title || title}`);
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const item = db.prepare('SELECT title FROM news WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Không tìm thấy tin tức' });

  db.prepare("UPDATE news SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
  logAction(req.user.username, 'DELETE_NEWS', `Đưa tin tức vào thùng rác: ${item.title}`);
  res.json({ message: 'Đã đưa tin tức vào thùng rác' });
});

export default router;
