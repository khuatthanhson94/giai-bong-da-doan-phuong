import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'giai-bong-da-doan-phuong-secret-2026';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, team_id: user.team_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    next();
  };
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  SCOREKEEPER: 'scorekeeper',
  TEAM: 'team',
};

export function canManageTournament(role) {
  return ['super_admin', 'admin'].includes(role);
}

export function canManageNews(role) {
  return ['super_admin', 'admin', 'editor'].includes(role);
}

export function canManageResults(role) {
  return ['super_admin', 'admin', 'scorekeeper'].includes(role);
}

export function canManageUsers(role) {
  return role === 'super_admin';
}
