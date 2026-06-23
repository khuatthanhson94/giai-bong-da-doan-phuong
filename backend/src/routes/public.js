import { Router } from 'express';
import QRCode from 'qrcode';
import { db } from '../db.js';
import { authRequired, requireRole, ROLES } from '../middleware/auth.js';
import { computeStandings, getTopScorers, getStatistics } from '../services/standings.js';

const router = Router();

router.get('/home', (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach((s) => {
    settings[s.key] = s.value;
  });

  const now = new Date().toISOString().split('T')[0];
  const allMatches = db.prepare(`
    SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
           tb.name as team_b_name, tb.logo as team_b_logo,
           CASE 
             WHEN m.round LIKE '%bảng%' OR m.round LIKE '%lượt%' OR m.round LIKE '%group%' 
             THEN g.name 
             ELSE NULL 
           END as group_name
    FROM matches m
    JOIN teams ta ON m.team_a_id = ta.id
    JOIN teams tb ON m.team_b_id = tb.id
    LEFT JOIN group_teams gt ON m.team_a_id = gt.team_id
    LEFT JOIN groups g ON gt.group_id = g.id
    WHERE m.published = 1
    ORDER BY m.match_date, m.match_time
  `).all();

  const latestMatch = allMatches.filter((m) => m.status === 'finished').pop();
  const upcomingMatches = db.prepare(`
    SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
           tb.name as team_b_name, tb.logo as team_b_logo,
           CASE 
             WHEN m.round LIKE '%bảng%' OR m.round LIKE '%lượt%' OR m.round LIKE '%group%' 
             THEN g.name 
             ELSE NULL 
           END as group_name
    FROM matches m
    JOIN teams ta ON m.team_a_id = ta.id
    JOIN teams tb ON m.team_b_id = tb.id
    LEFT JOIN group_teams gt ON m.team_a_id = gt.team_id
    LEFT JOIN groups g ON gt.group_id = g.id
    WHERE m.status = 'scheduled'
    ORDER BY m.match_date, m.match_time LIMIT 12
  `).all();

  const news = db.prepare('SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC LIMIT 4').all();
  const standings = computeStandings();
  const topScorers = getTopScorers(5);

  res.json({ settings, latestMatch, upcomingMatches, news, standings, topScorers });
});

router.get('/standings', (req, res) => {
  res.json(computeStandings());
});

router.get('/statistics', (req, res) => {
  res.json(getStatistics());
});

router.get('/settings', (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach((s) => {
    settings[s.key] = s.value;
  });
  res.json(settings);
});

router.put('/settings', authRequired, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(req.body)) {
    upsert.run(key, String(value));
  }
  res.json({ message: 'Cập nhật thành công' });
});

// Temporary endpoint to update settings without auth (for initial setup)
router.post('/admin/update-settings', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(req.body)) {
    upsert.run(key, String(value));
  }
  res.json({ message: 'Cập nhật thành công' });
});

router.get('/dashboard', authRequired, (req, res) => {
  const totalTeams = db.prepare('SELECT COUNT(*) as c FROM teams').get().c;
  const totalPlayers = db.prepare('SELECT COUNT(*) as c FROM players').get().c;
  const totalMatches = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
  const finishedMatches = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status='finished'").get().c;
  const scheduledMatches = db.prepare("SELECT COUNT(*) as c FROM matches WHERE status='scheduled'").get().c;
  const recentNews = db.prepare('SELECT * FROM news ORDER BY created_at DESC LIMIT 5').all();
  const standings = computeStandings();
  const logs = db.prepare(`
    SELECT l.*, u.username FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC LIMIT 20
  `).all();

  res.json({
    totalTeams, totalPlayers, totalMatches, finishedMatches, scheduledMatches,
    recentNews, standings, logs,
  });
});

router.get('/qrcode', async (req, res) => {
  const url = req.query.url || 'http://localhost:5173';
  try {
    const qr = await QRCode.toDataURL(url);
    res.json({ qr, url });
  } catch {
    res.status(500).json({ error: 'Không tạo được QR code' });
  }
});

router.get('/export/standings', (req, res) => {
  const standings = computeStandings();
  const csv = [
    'STT,Đội,Số trận,Thắng,Hòa,Thua,Bàn thắng,Bàn thua,Hiệu số,Điểm',
    ...standings.map((s, i) =>
      `${i + 1},${s.name},${s.played},${s.won},${s.drawn},${s.lost},${s.goals_for},${s.goals_against},${s.goal_diff},${s.points}`
    ),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=bang-xep-hang.csv');
  res.send('\uFEFF' + csv);
});

export default router;
