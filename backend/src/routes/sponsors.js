import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, requireRole, ROLES } from '../middleware/auth.js';

const router = Router();

// GET all sponsors (Public)
router.get('/', (req, res) => {
  try {
    const sponsors = db.prepare('SELECT * FROM sponsors ORDER BY order_index ASC, id DESC').all();
    res.json(sponsors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create sponsor (Admin only)
router.post('/', authRequired, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), (req, res) => {
  const { name, short_name, logo, link, tier, order_index } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Tên nhà tài trợ không được trống' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO sponsors (name, short_name, logo, link, tier, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, short_name || null, logo || null, link || '', tier || 'general', Number(order_index) || 0);
    logAction(req.user.username, 'CREATE_SPONSOR', `Thêm nhà tài trợ mới: ${name} (Hạng: ${tier || 'general'})`);
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      short_name,
      logo,
      link,
      tier: tier || 'general',
      order_index: Number(order_index) || 0
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
    const targetSponsor = db.prepare('SELECT name FROM sponsors WHERE id = ?').get(id);
    const result = db.prepare(`
      UPDATE sponsors SET name = ?, short_name = ?, logo = ?, link = ?, tier = ?, order_index = ?
      WHERE id = ?
    `).run(name, short_name || null, logo || null, link || '', tier || 'general', Number(order_index) || 0, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhà tài trợ' });
    }
    logAction(req.user.username, 'UPDATE_SPONSOR', `Cập nhật nhà tài trợ: ${targetSponsor?.name || name}`);
    res.json({ message: 'Cập nhật nhà tài trợ thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE sponsor (Admin only)
router.delete('/:id', authRequired, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), (req, res) => {
  const { id } = req.params;
  
  try {
    const targetSponsor = db.prepare('SELECT name FROM sponsors WHERE id = ?').get(id);
    const result = db.prepare('DELETE FROM sponsors WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhà tài trợ' });
    }
    logAction(req.user.username, 'DELETE_SPONSOR', `Xóa nhà tài trợ: ${targetSponsor?.name || id}`);
    res.json({ message: 'Xóa nhà tài trợ thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
