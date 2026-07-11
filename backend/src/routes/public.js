import { Router } from 'express';
import QRCode from 'qrcode';
import { db, logAction, autoStartMatches } from '../db.js';
import { authRequired, requireRole, ROLES } from '../middleware/auth.js';
import { computeStandings, getTopScorers, getStatistics } from '../services/standings.js';

const router = Router();

router.get('/home', (req, res) => {
  autoStartMatches();
  const { tournament_id } = req.query;
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach((s) => {
    settings[s.key] = s.value;
  });

  const now = new Date().toISOString().split('T')[0];
  let allMatchesSql = `
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
    WHERE m.published = 1 AND m.deleted_at IS NULL AND ta.deleted_at IS NULL AND tb.deleted_at IS NULL
  `;
  const allMatchesParams = [];
  if (tournament_id) {
    allMatchesSql += ' AND m.tournament_id = ?';
    allMatchesParams.push(Number(tournament_id));
  }
  allMatchesSql += ' ORDER BY m.match_date, m.match_time';
  const allMatches = db.prepare(allMatchesSql).all(...allMatchesParams);

  const latestMatch = allMatches.filter((m) => m.status === 'finished').pop();
  const liveMatches = allMatches.filter((m) => m.status === 'live');

  let upcomingMatchesSql = `
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
    WHERE m.status = 'scheduled' AND m.deleted_at IS NULL AND ta.deleted_at IS NULL AND tb.deleted_at IS NULL
  `;
  const upcomingMatchesParams = [];
  if (tournament_id) {
    upcomingMatchesSql += ' AND m.tournament_id = ?';
    upcomingMatchesParams.push(Number(tournament_id));
  }
  upcomingMatchesSql += ' ORDER BY m.match_date, m.match_time LIMIT 12';
  const upcomingMatches = db.prepare(upcomingMatchesSql).all(...upcomingMatchesParams);

  let newsSql = 'SELECT * FROM news WHERE published = 1 AND deleted_at IS NULL';
  const newsParams = [];
  if (tournament_id) {
    newsSql += ' AND tournament_id = ?';
    newsParams.push(Number(tournament_id));
  }
  newsSql += ' ORDER BY created_at DESC LIMIT 4';
  const news = db.prepare(newsSql).all(...newsParams);

  const standings = computeStandings(tournament_id);
  const topScorers = getTopScorers(5, tournament_id);

  res.json({ settings, latestMatch, liveMatches, upcomingMatches, news, standings, topScorers });
});

router.get('/standings', (req, res) => {
  const { tournament_id } = req.query;
  res.json(computeStandings(tournament_id));
});

router.get('/statistics', (req, res) => {
  const { tournament_id } = req.query;
  res.json(getStatistics(tournament_id));
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
  logAction(req.user.username, 'UPDATE_SETTINGS', 'Cập nhật cấu hình giải đấu');
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
  const { tournament_id } = req.query;

  let teamsSql = 'SELECT COUNT(*) as c FROM teams WHERE deleted_at IS NULL';
  let playersSql = 'SELECT COUNT(*) as c FROM players p JOIN teams t ON p.team_id = t.id WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL';
  let matchesSql = 'SELECT COUNT(*) as c FROM matches WHERE deleted_at IS NULL';
  let finishedMatchesSql = "SELECT COUNT(*) as c FROM matches WHERE status='finished' AND deleted_at IS NULL";
  let scheduledMatchesSql = "SELECT COUNT(*) as c FROM matches WHERE status='scheduled' AND deleted_at IS NULL";
  let recentNewsSql = 'SELECT * FROM news WHERE deleted_at IS NULL';

  const params = [];
  if (tournament_id) {
    teamsSql += ' AND tournament_id = ?';
    playersSql += ' AND t.tournament_id = ?';
    matchesSql += ' AND tournament_id = ?';
    finishedMatchesSql += ' AND tournament_id = ?';
    scheduledMatchesSql += ' AND tournament_id = ?';
    recentNewsSql += ' AND tournament_id = ?';
    params.push(Number(tournament_id));
  }

  recentNewsSql += ' ORDER BY created_at DESC LIMIT 5';

  const totalTeams = db.prepare(teamsSql).get(...params).c;
  const totalPlayers = db.prepare(playersSql).get(tournament_id ? [Number(tournament_id)] : []).c;
  const totalMatches = db.prepare(matchesSql).get(...params).c;
  const finishedMatches = db.prepare(finishedMatchesSql).get(...params).c;
  const scheduledMatches = db.prepare(scheduledMatchesSql).get(...params).c;
  const recentNews = db.prepare(recentNewsSql).all(...params);

  const standings = computeStandings(tournament_id);
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
  const { tournament_id } = req.query;
  const standings = computeStandings(tournament_id);
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
