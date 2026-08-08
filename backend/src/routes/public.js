import { Router } from 'express';
import QRCode from 'qrcode';
import { db, logAction, autoStartMatches } from '../db.js';
import { authRequired, requireRole, ROLES } from '../middleware/auth.js';
import { computeStandings, getTopScorers, getStatistics } from '../services/standings.js';
import { getVNLocalDateString } from '../utils/date.js';
import { getKnockoutPlaceholder } from './matches.js';

const router = Router();

function normalizeDateStr(dateStr) {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return trimmed;
}

const serverCache = new Map();
const CACHE_DURATION_MS = 10000; // 10s server cache for public read endpoints

function getCached(key) {
  const cached = serverCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  serverCache.set(key, { data, timestamp: Date.now() });
}

router.get('/home', (req, res) => {
  try {
    autoStartMatches();
    const { tournament_id } = req.query;
    let tId = tournament_id ? Number(tournament_id) : null;
    if (!tId) {
      try {
        const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
        if (activeTournament) tId = activeTournament.id;
      } catch (e) {}
    }

    const cacheKey = `home:${tId || 'active'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const settings = {};
    try {
      db.prepare('SELECT key, value FROM settings').all().forEach((s) => {
        settings[s.key] = s.value;
      });
    } catch (e) {}

    let allMatches = [];
    try {
      let allMatchesSql = `
        SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
               tb.name as team_b_name, tb.logo as team_b_logo
        FROM matches m
        LEFT JOIN teams ta ON m.team_a_id = ta.id
        LEFT JOIN teams tb ON m.team_b_id = tb.id
        WHERE m.published = 1 AND m.deleted_at IS NULL 
      `;
      const allMatchesParams = [];
      if (tId) {
        allMatchesSql += ' AND m.tournament_id = ?';
        allMatchesParams.push(tId);
      }
      allMatchesSql += ' ORDER BY m.match_date, m.match_time';
      allMatches = db.prepare(allMatchesSql).all(...allMatchesParams).map((m) => {
        let goals = [], yellow_cards = [], red_cards = [];
        try {
          goals = db.prepare(`
            SELECT g.*, COALESCE(p.name, g.player_name) as player_name, p.jersey_number, COALESCE(g.team_id, p.team_id) as team_id, t.name as team_name
            FROM goals g
            LEFT JOIN players p ON g.player_id = p.id
            LEFT JOIN teams t ON COALESCE(g.team_id, p.team_id) = t.id
            WHERE g.match_id = ?
            ORDER BY g.minute ASC
          `).all(m.id);
        } catch (e) {}

        try {
          yellow_cards = db.prepare(`
            SELECT y.*, COALESCE(p.name, y.player_name) as player_name, p.jersey_number, COALESCE(y.team_id, p.team_id) as team_id, t.name as team_name
            FROM yellow_cards y
            LEFT JOIN players p ON y.player_id = p.id
            LEFT JOIN teams t ON COALESCE(y.team_id, p.team_id) = t.id
            WHERE y.match_id = ?
            ORDER BY y.minute ASC
          `).all(m.id);
        } catch (e) {}

        try {
          red_cards = db.prepare(`
            SELECT r.*, COALESCE(p.name, r.player_name) as player_name, p.jersey_number, COALESCE(r.team_id, p.team_id) as team_id, t.name as team_name
            FROM red_cards r
            LEFT JOIN players p ON r.player_id = p.id
            LEFT JOIN teams t ON COALESCE(r.team_id, p.team_id) = t.id
            WHERE r.match_id = ?
            ORDER BY r.minute ASC
          `).all(m.id);
        } catch (e) {}

        const teamAName = m.team_a_name || getKnockoutPlaceholder(m, 'home');
        const teamBName = m.team_b_name || getKnockoutPlaceholder(m, 'away');

        return { 
          ...m, 
          team_a_name: teamAName,
          team_b_name: teamBName,
          team_a: { id: m.team_a_id, name: teamAName, logo: m.team_a_logo },
          team_b: { id: m.team_b_id, name: teamBName, logo: m.team_b_logo },
          goals, 
          yellow_cards, 
          red_cards 
        };
      });
    } catch (e) {
      console.error('[API /home] Error fetching matches:', e.message);
    }

    const now = new Date();
    const latestMatch = allMatches.filter((m) => m.status === 'finished').pop() || null;
    const liveMatches = allMatches.filter((m) => {
      if (m.status !== 'live') return false;
      if (!m.match_date || !m.match_time) return true;
      const normDate = normalizeDateStr(m.match_date);
      const timeStr = m.match_time.substring(0, 5);
      const matchStart = new Date(`${normDate}T${timeStr}:00+07:00`);
      if (now < matchStart && (m.score_a === null || m.score_a === undefined) && (m.score_b === null || m.score_b === undefined)) {
        return false;
      }
      return true;
    });

    let upcomingMatches = [];
    try {
      let upcomingMatchesSql = `
        SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
               tb.name as team_b_name, tb.logo as team_b_logo
        FROM matches m
        LEFT JOIN teams ta ON m.team_a_id = ta.id
        LEFT JOIN teams tb ON m.team_b_id = tb.id
        WHERE m.status = 'scheduled' AND m.deleted_at IS NULL 
      `;
      const upcomingMatchesParams = [];
      if (tId) {
        upcomingMatchesSql += ' AND m.tournament_id = ?';
        upcomingMatchesParams.push(tId);
      }
      upcomingMatchesSql += ' ORDER BY m.match_date, m.match_time LIMIT 12';
      upcomingMatches = db.prepare(upcomingMatchesSql).all(...upcomingMatchesParams).map(m => {
        const teamAName = m.team_a_name || getKnockoutPlaceholder(m, 'home');
        const teamBName = m.team_b_name || getKnockoutPlaceholder(m, 'away');
        return {
          ...m,
          team_a_name: teamAName,
          team_b_name: teamBName,
          team_a: { id: m.team_a_id, name: teamAName, logo: m.team_a_logo },
          team_b: { id: m.team_b_id, name: teamBName, logo: m.team_b_logo }
        };
      });
    } catch (e) {}

    let news = [];
    try {
      let newsSql = 'SELECT * FROM news WHERE published = 1 AND deleted_at IS NULL';
      const newsParams = [];
      if (tId) {
        newsSql += ' AND tournament_id = ?';
        newsParams.push(tId);
      }
      newsSql += ' ORDER BY created_at DESC LIMIT 4';
      news = db.prepare(newsSql).all(...newsParams);
    } catch (e) {}

    let standings = [];
    try {
      standings = computeStandings(tId);
    } catch (e) {}

    let topScorers = [];
    try {
      topScorers = getTopScorers(5, tId);
    } catch (e) {}

    let championTeam = null;
    try {
      const finalMatch = allMatches.find(m => 
        m.status === 'finished' && 
        (/Chung kết/i.test(m.round) || /F1/i.test(m.notes || '')) &&
        !/Bán kết/i.test(m.round)
      );

      if (finalMatch && finalMatch.team_a_id && finalMatch.team_b_id) {
        const sa = finalMatch.score_a ?? 0;
        const sb = finalMatch.score_b ?? 0;
        const pa = finalMatch.penalty_a;
        const pb = finalMatch.penalty_b;

        let winnerTeamId = null;
        if (sa > sb) winnerTeamId = finalMatch.team_a_id;
        else if (sb > sa) winnerTeamId = finalMatch.team_b_id;
        else if (pa !== null && pa !== undefined && pb !== null && pb !== undefined) {
          if (pa > pb) winnerTeamId = finalMatch.team_a_id;
          else if (pb > pa) winnerTeamId = finalMatch.team_b_id;
        }

        if (winnerTeamId) {
          championTeam = db.prepare('SELECT id, name, logo, coach, stadium, jersey_color FROM teams WHERE id = ?').get(winnerTeamId);
          if (championTeam) {
            championTeam.finalMatch = {
              score_a: sa,
              score_b: sb,
              penalty_a: pa,
              penalty_b: pb,
              team_a_name: finalMatch.team_a_name,
              team_b_name: finalMatch.team_b_name
            };
          }
        }
      }
    } catch (e) {
      console.error('[API /home Champion Error]', e.message);
    }

    let visits = {
      total_visits: 0,
      total_unique_visitors: 0,
      today_visits: 0,
      today_unique_visitors: 0
    };

    const result = { settings, latestMatch, liveMatches, upcomingMatches, news, standings, topScorers, visits, championTeam };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[API /home Fatal Error]', err.message);
    res.json({ settings: {}, latestMatch: null, liveMatches: [], upcomingMatches: [], news: [], standings: [], topScorers: [], visits: {}, championTeam: null });
  }
});

router.get('/livescore', (req, res) => {
  autoStartMatches();
  const { tournament_id } = req.query;
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }

  const todayStr = getVNLocalDateString();

  let liveMatchesSql = `
    SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
           tb.name as team_b_name, tb.logo as team_b_logo
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
    WHERE m.status = 'live' AND m.deleted_at IS NULL 
  `;
  const liveParams = [];
  if (tId) {
    liveMatchesSql += ' AND m.tournament_id = ?';
    liveParams.push(tId);
  }
  liveMatchesSql += ' ORDER BY m.match_date, m.match_time';

  const liveMatches = db.prepare(liveMatchesSql).all(...liveParams).map((m) => {
    const goals = db.prepare(`
      SELECT g.*, COALESCE(p.name, g.player_name) as player_name, p.jersey_number, COALESCE(g.team_id, p.team_id) = t.id
      FROM goals g
      LEFT JOIN players p ON g.player_id = p.id
      LEFT JOIN teams t ON COALESCE(g.team_id, p.team_id) = t.id
      WHERE g.match_id = ?
      ORDER BY g.minute ASC
    `).all(m.id);

    const yellow_cards = db.prepare(`
      SELECT y.*, COALESCE(p.name, y.player_name) as player_name, p.jersey_number, COALESCE(y.team_id, p.team_id) = t.id
      FROM yellow_cards y
      LEFT JOIN players p ON y.player_id = p.id
      LEFT JOIN teams t ON COALESCE(y.team_id, p.team_id) = t.id
      WHERE y.match_id = ?
      ORDER BY y.minute ASC
    `).all(m.id);

    const red_cards = db.prepare(`
      SELECT r.*, COALESCE(p.name, r.player_name) as player_name, p.jersey_number, COALESCE(r.team_id, p.team_id) = t.id
      FROM red_cards r
      LEFT JOIN players p ON r.player_id = p.id
      LEFT JOIN teams t ON COALESCE(r.team_id, p.team_id) = t.id
      WHERE r.match_id = ?
      ORDER BY r.minute ASC
    `).all(m.id);

    const teamAName = m.team_a_name || getKnockoutPlaceholder(m, 'home');
    const teamBName = m.team_b_name || getKnockoutPlaceholder(m, 'away');

    return { 
      ...m, 
      team_a_name: teamAName,
      team_b_name: teamBName,
      team_a: { id: m.team_a_id, name: teamAName, logo: m.team_a_logo },
      team_b: { id: m.team_b_id, name: teamBName, logo: m.team_b_logo },
      goals, 
      yellow_cards, 
      red_cards 
    };
  });

  let upcomingMatchesSql = `
    SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
           tb.name as team_b_name, tb.logo as team_b_logo
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
    WHERE m.status = 'scheduled' AND m.deleted_at IS NULL 
      AND (ta.deleted_at IS NULL OR ta.id IS NULL) 
      AND (tb.deleted_at IS NULL OR tb.id IS NULL)
  `;
  const upcomingParams = [];
  if (tId) {
    upcomingMatchesSql += ' AND m.tournament_id = ?';
    upcomingParams.push(tId);
  }
  upcomingMatchesSql += ' ORDER BY m.match_date, m.match_time LIMIT 6';
  const upcomingMatches = db.prepare(upcomingMatchesSql).all(...upcomingParams).map(m => {
    const teamAName = m.team_a_name || getKnockoutPlaceholder(m, 'home');
    const teamBName = m.team_b_name || getKnockoutPlaceholder(m, 'away');
    return {
      ...m,
      team_a_name: teamAName,
      team_b_name: teamBName,
      team_a: { id: m.team_a_id, name: teamAName, logo: m.team_a_logo },
      team_b: { id: m.team_b_id, name: teamBName, logo: m.team_b_logo }
    };
  });

  let todayMatchesSql = `
    SELECT m.*, ta.name as team_a_name, ta.logo as team_a_logo,
           tb.name as team_b_name, tb.logo as team_b_logo
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
    WHERE m.match_date = ? AND m.deleted_at IS NULL 
      AND (ta.deleted_at IS NULL OR ta.id IS NULL) 
      AND (tb.deleted_at IS NULL OR tb.id IS NULL)
  `;
  const todayParams = [todayStr];
  if (tId) {
    todayMatchesSql += ' AND m.tournament_id = ?';
    todayParams.push(tId);
  }
  todayMatchesSql += ' ORDER BY m.match_time';
  const todayMatches = db.prepare(todayMatchesSql).all(...todayParams).map(m => {
    const teamAName = m.team_a_name || getKnockoutPlaceholder(m, 'home');
    const teamBName = m.team_b_name || getKnockoutPlaceholder(m, 'away');
    return {
      ...m,
      team_a_name: teamAName,
      team_b_name: teamBName,
      team_a: { id: m.team_a_id, name: teamAName, logo: m.team_a_logo },
      team_b: { id: m.team_b_id, name: teamBName, logo: m.team_b_logo }
    };
  });

  const now = new Date();
  const validLiveMatches = liveMatches.filter((m) => {
    if (!m.match_date || !m.match_time) return true;
    const normDate = normalizeDateStr(m.match_date);
    const timeStr = m.match_time.substring(0, 5);
    const matchStart = new Date(`${normDate}T${timeStr}:00+07:00`);
    if (now < matchStart && (m.score_a === null || m.score_a === undefined) && (m.score_b === null || m.score_b === undefined)) {
      return false;
    }
    return true;
  });

  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

  res.json({
    liveMatches: validLiveMatches,
    upcomingMatches,
    todayMatches,
    settings
  });
});

router.get('/standings', (req, res) => {
  const { tournament_id } = req.query;
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }
  const cacheKey = `standings:${tId || 'active'}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const result = computeStandings(tId);
  setCache(cacheKey, result);
  res.json(result);
});

router.get('/statistics', (req, res) => {
  const { tournament_id } = req.query;
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }
  const cacheKey = `statistics:${tId || 'active'}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const result = getStatistics(tId);
  setCache(cacheKey, result);
  res.json(result);
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

// Visit session tracking endpoint
router.post('/track-visit', (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    let ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '';
    if (ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7);
    }
    if (ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }

    let deviceType = 'Desktop';
    const uaLower = userAgent.toLowerCase();
    if (uaLower.includes('mobi') || uaLower.includes('android') || uaLower.includes('iphone') || uaLower.includes('ipad')) {
      if (uaLower.includes('ipad') || uaLower.includes('tablet')) {
        deviceType = 'Tablet';
      } else {
        deviceType = 'Mobile';
      }
    }

    const todayStr = getVNLocalDateString();
    
    db.prepare(`
      INSERT INTO visit_logs (ip_address, user_agent, device_type, visit_date)
      VALUES (?, ?, ?, ?)
    `).run(ipAddress, userAgent, deviceType, todayStr);

    res.json({ success: true });
  } catch (err) {
    console.warn('[VisitTracker] Non-fatal tracking error:', err.message);
    res.json({ success: true, warning: err.message });
  }
});

router.get('/visits-count', (req, res) => {
  try {
    const todayStr = getVNLocalDateString();
    const totalVisits = db.prepare('SELECT COUNT(*) as c FROM visit_logs').get()?.c || 0;
    const totalUnique = db.prepare('SELECT COUNT(DISTINCT ip_address) as c FROM visit_logs').get()?.c || 0;
    const todayVisits = db.prepare('SELECT COUNT(*) as c FROM visit_logs WHERE visit_date = ?').get(todayStr)?.c || 0;
    const todayUnique = db.prepare('SELECT COUNT(DISTINCT ip_address) as c FROM visit_logs WHERE visit_date = ?').get(todayStr)?.c || 0;

    res.json({
      total_visits: totalVisits,
      total_unique_visitors: totalUnique,
      today_visits: todayVisits,
      today_unique_visitors: todayUnique
    });
  } catch (err) {
    res.json({
      total_visits: 0,
      total_unique_visitors: 0,
      today_visits: 0,
      today_unique_visitors: 0
    });
  }
});

router.get('/dashboard', authRequired, (req, res) => {
  const { tournament_id } = req.query;
  let tId = tournament_id ? Number(tournament_id) : null;
  if (!tId) {
    const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeTournament) tId = activeTournament.id;
  }

  let teamsSql = 'SELECT COUNT(*) as c FROM teams WHERE deleted_at IS NULL';
  let playersSql = 'SELECT COUNT(*) as c FROM players p JOIN teams t ON p.team_id = t.id WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL';
  let matchesSql = 'SELECT COUNT(*) as c FROM matches WHERE deleted_at IS NULL';
  let finishedMatchesSql = "SELECT COUNT(*) as c FROM matches WHERE status='finished' AND deleted_at IS NULL";
  let scheduledMatchesSql = "SELECT COUNT(*) as c FROM matches WHERE status='scheduled' AND deleted_at IS NULL";
  let recentNewsSql = 'SELECT * FROM news WHERE deleted_at IS NULL';

  const params = [];
  if (tId) {
    teamsSql += ' AND tournament_id = ?';
    playersSql += ' AND t.tournament_id = ?';
    matchesSql += ' AND tournament_id = ?';
    finishedMatchesSql += ' AND tournament_id = ?';
    scheduledMatchesSql += ' AND tournament_id = ?';
    recentNewsSql += ' AND tournament_id = ?';
    params.push(tId);
  }

  recentNewsSql += ' ORDER BY created_at DESC LIMIT 5';

  const totalTeams = db.prepare(teamsSql).get(...params).c;
  const totalPlayers = db.prepare(playersSql).get(...(tId ? [tId] : [])).c;
  const totalMatches = db.prepare(matchesSql).get(...params).c;
  const finishedMatches = db.prepare(finishedMatchesSql).get(...params).c;
  const scheduledMatches = db.prepare(scheduledMatchesSql).get(...params).c;
  const recentNews = db.prepare(recentNewsSql).all(...params);

  const standings = computeStandings(tId);
  const logs = db.prepare(`
    SELECT l.*, u.username FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC LIMIT 20
  `).all();

  res.json({
    totalTeams, totalPlayers, totalMatches, finishedMatches, scheduledMatches,
    recentNews, standings, logs,
    visits: (() => {
      let stats = {
        total_visits: 0,
        total_unique_visitors: 0,
        today_visits: 0,
        today_unique_visitors: 0
      };
      try {
        const todayStr = getVNLocalDateString();
        const totalVisits = db.prepare('SELECT COUNT(*) as c FROM visit_logs').get()?.c || 0;
        const totalUnique = db.prepare('SELECT COUNT(DISTINCT ip_address) as c FROM visit_logs').get()?.c || 0;
        const todayVisits = db.prepare('SELECT COUNT(*) as c FROM visit_logs WHERE visit_date = ?').get(todayStr)?.c || 0;
        const todayUnique = db.prepare('SELECT COUNT(DISTINCT ip_address) as c FROM visit_logs WHERE visit_date = ?').get(todayStr)?.c || 0;
        stats = {
          total_visits: totalVisits,
          total_unique_visitors: totalUnique,
          today_visits: todayVisits,
          today_unique_visitors: todayUnique
        };
      } catch (err) {
        // Table not migrated yet
      }
      return stats;
    })()
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
