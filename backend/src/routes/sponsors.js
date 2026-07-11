import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, requireRole, ROLES } from '../middleware/auth.js';

const router = Router();

// GET all sponsors (Public)
router.get('/', (req, res) => {
  const { tournament_id } = req.query;
  try {
    let sql = 'SELECT * FROM sponsors WHERE deleted_at IS NULL';
    const params = [];
    if (tournament_id) {
      sql += ' AND tournament_id = ?';
      params.push(Number(tournament_id));
    }
    sql += ' ORDER BY order_index ASC, id DESC';
    const sponsors = db.prepare(sql).all(...params);
    res.json(sponsors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create sponsor (Admin only)
router.post('/', authRequired, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), (req, res) => {
  const { name, short_name, logo, link, tier, order_index, tournament_id } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Tên nhà tài trợ không được trống' });
  }
  
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }
  if (!tId) return res.status(400).json({ error: 'Không tìm thấy giải đấu đang hoạt động để gán nhà tài trợ' });

  try {
    const result = db.prepare(`
      INSERT INTO sponsors (name, short_name, logo, link, tier, order_index, tournament_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, short_name || null, logo || null, link || '', tier || 'general', Number(order_index) || 0, tId);
    logAction(req.user.username, 'CREATE_SPONSOR', `Thêm nhà tài trợ mới: ${name} (Hạng: ${tier || 'general'})`);
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      short_name,
      logo,
      link,
      tier: tier || 'general',
      order_index: Number(order_index) || 0,
      tournament_id: tId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update sponsor (Admin only)
router.put('/:id', authRequired, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), (req, res) => {
  const { name, short_name, logo, link, tier, order_index } = req.body;
  const { id } = req.params;
  
  if (!name) {
    return res.status(400).json({ error: 'Tên nhà tài trợ không được trống' });
  }
  
  try {
    const targetSponsor = db.prepare('SELECT name FROM sponsors WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!targetSponsor) return res.status(404).json({ error: 'Không tìm thấy nhà tài trợ' });

    const result = db.prepare(`
      UPDATE sponsors SET name = ?, short_name = ?, logo = ?, link = ?, tier = ?, order_index = ?
      WHERE id = ?
    `).run(name, short_name || null, logo || null, link || '', tier || 'general', Number(order_index) || 0, id);
    
    logAction(req.user.username, 'UPDATE_SPONSOR', `Cập nhật nhà tài trợ: ${targetSponsor.name}`);
    res.json({ message: 'Cập nhật nhà tài trợ thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE sponsor (Admin only)
router.delete('/:id', authRequired, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), (req, res) => {
  const { id } = req.params;
  
  try {
    const targetSponsor = db.prepare('SELECT name FROM sponsors WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!targetSponsor) return res.status(404).json({ error: 'Không tìm thấy nhà tài trợ' });

    db.prepare("UPDATE sponsors SET deleted_at = datetime('now') WHERE id = ?").run(id);
    logAction(req.user.username, 'DELETE_SPONSOR', `Đưa nhà tài trợ vào thùng rác: ${targetSponsor.name}`);
    res.json({ message: 'Đã đưa nhà tài trợ vào thùng rác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
