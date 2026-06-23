import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
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
    user: { id: user.id, username: user.username, role: user.role },
  });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
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
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(
    req.user.id, 'change_password', '{}'
  );
  res.json({ message: 'Đổi mật khẩu thành công' });
});

router.get('/users', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.post('/users', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)
    `).run(username, hash, role || 'admin');
    res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'admin' });
  } catch {
    res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }
});

router.put('/users/:id', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const { role, password } = req.body;
  const id = req.params.id;
  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id);
  }
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/users/:id', authRequired, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xóa' });
});

export default router;
