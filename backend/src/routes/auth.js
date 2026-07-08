import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, logAction } from '../db.js';
import { authRequired, signToken, requireRole, canManageUsers, ROLES } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, team_id: user.team_id },
  });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, username, role, team_id, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.post('/change-password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  logAction(req.user.username, 'CHANGE_PASSWORD', 'Đổi mật khẩu cá nhân');
  res.json({ message: 'Đổi mật khẩu thành công' });
});

router.get('/audit-logs', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const users = db.prepare('SELECT id, username, role, team_id, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.post('/users', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const { username, password, role, team_id } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, team_id) VALUES (?, ?, ?, ?)
    `).run(username, hash, role || 'admin', team_id ? Number(team_id) : null);
    logAction(req.user.username, 'CREATE_USER', `Tạo tài khoản mới: ${username} (Vai trò: ${role || 'admin'})`);
    res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'admin', team_id: team_id ? Number(team_id) : null });
  } catch (e) {
    res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }
});

router.put('/users/:id', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const { role, password, team_id } = req.body;
  const id = req.params.id;
  const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (team_id !== undefined) {
    db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(team_id ? Number(team_id) : null, id);
  }
  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id);
  }
  logAction(req.user.username, 'UPDATE_USER', `Cập nhật thông tin tài khoản: ${targetUser?.username || id}`);
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/users/:id', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
  }
  const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logAction(req.user.username, 'DELETE_USER', `Xóa tài khoản: ${targetUser?.username || req.params.id}`);
  res.json({ message: 'Đã xóa' });
});

// Reset password to admin123 (super_admin only)
router.post('/users/:id/reset-password', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  try {
    const hash = bcrypt.hashSync('admin123', 10);
    const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    logAction(req.user.username, 'RESET_PASSWORD', `Đặt lại mật khẩu tài khoản ${targetUser?.username || req.params.id} về mặc định (admin123)`);
    res.json({ message: 'Đặt lại mật khẩu thành công về mặc định (admin123)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
