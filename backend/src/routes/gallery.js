import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, canManageNews } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const { album, type, tournament_id } = req.query;
  let sql = 'SELECT * FROM gallery WHERE deleted_at IS NULL';
  const params = [];
  if (album) { sql += ' AND album = ?'; params.push(album); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (tournament_id) { sql += ' AND tournament_id = ?'; params.push(Number(tournament_id)); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/albums', (req, res) => {
  const { tournament_id } = req.query;
  let sql = 'SELECT DISTINCT album FROM gallery WHERE deleted_at IS NULL';
  const params = [];
  if (tournament_id) {
    sql += ' AND tournament_id = ?';
    params.push(Number(tournament_id));
  }
  sql += ' ORDER BY album';
  const albums = db.prepare(sql).all(...params);
  res.json(albums.map((a) => a.album));
});

router.post('/', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const { title, image_url, video_url, album, type, tournament_id } = req.body;
  
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }
  if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để đăng ảnh/video' });

  const result = db.prepare(`
    INSERT INTO gallery (title, image_url, video_url, album, type, tournament_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, image_url, video_url, album || 'Chung', type || 'image', tId);
  logAction(req.user.username, 'CREATE_GALLERY', `Thêm vào thư viện (${type === 'video' ? 'Video' : 'Ảnh'}): ${title || 'Không tiêu đề'} (Album: ${album || 'Chung'})`);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', authRequired, (req, res, next) => {
  if (!canManageNews(req.user.role)) return res.status(403).json({ error: 'Không có quyền' });
  next();
}, (req, res) => {
  const item = db.prepare('SELECT title, type FROM gallery WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Không tìm thấy thư mục/ảnh' });

  db.prepare("UPDATE gallery SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id);
  logAction(req.user.username, 'DELETE_GALLERY', `Đưa vào thùng rác (${item.type === 'video' ? 'Video' : 'Ảnh'}): ${item.title || 'Không tiêu đề'}`);
  res.json({ message: 'Đã đưa vào thùng rác' });
});

export default router;
