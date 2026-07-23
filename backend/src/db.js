process.env.TZ = 'Asia/Ho_Chi_Minh';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { getVNLocalDateTimeString } from './utils/date.js';
import { requestStorage } from './utils/context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let dataDir;
let dbPath;

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const isRender = process.env.RENDER || process.env.RENDER_SERVICE_ID || fs.existsSync('/opt/render');

if (isVercel) {
  dataDir = '/tmp/data';
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'tournament.db');

  const templateDbPath = path.join(__dirname, '..', 'data', 'tournament.db');
  if (!fs.existsSync(dbPath) && fs.existsSync(templateDbPath)) {
    try {
      fs.copyFileSync(templateDbPath, dbPath);
      console.log('Copied database template to /tmp/data');
    } catch (e) {
      console.error('Failed to copy database template:', e);
    }
  }
} else if (isRender) {
  // Use persistent disk on Render
  dataDir = '/opt/render/project/backend/data';
  // Fallback if backend folder doesn't exist
  if (!fs.existsSync('/opt/render/project/backend')) {
    dataDir = '/opt/render/project/data';
  }
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'tournament.db');

  const templateDbPath = path.join(__dirname, '..', 'data', 'tournament.db');
  if (!fs.existsSync(dbPath) && fs.existsSync(templateDbPath)) {
    try {
      fs.copyFileSync(templateDbPath, dbPath);
      console.log(`Copied database template to Render persistent disk: ${dbPath}`);
    } catch (e) {
      console.error('Failed to copy database template to Render persistent disk:', e);
    }
  }
  console.log('Using persistent disk on Render:', dbPath);
} else {
  dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'tournament.db');
}

import { restoreDatabase, restoreUploads, scheduleSync } from './services/sync.js';

const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : (process.env.RENDER
      ? path.join(dataDir, 'uploads')
      : path.join(__dirname, '..', 'uploads'));

// Top-level await to restore SQLite database from PostgreSQL cloud storage on startup
if (process.env.SYNC_DATABASE_URL) {
  try {
    await restoreDatabase(dbPath);
    // Restore uploads in the background so the server can start listening immediately
    restoreUploads(uploadDir).catch((err) => {
      console.error('[Sync] Background restore uploads error:', err.message);
    });
  } catch (err) {
    console.error('[Sync] Error during startup restore:', err.message);
  }
}

const rawDb = new DatabaseSync(dbPath);
try {
  rawDb.exec('PRAGMA journal_mode = WAL');
  rawDb.exec('PRAGMA synchronous = NORMAL');
  rawDb.exec('PRAGMA cache_size = -16000');
  rawDb.exec('PRAGMA temp_store = MEMORY');
} catch (e) {
  // Ignore pragma errors if unsupported
}

// Helper to check if a query modifies data
function triggerSyncIfWrite(sql) {
  const isWrite = /insert|update|delete|replace|create|drop|alter/i.test(sql);
  if (isWrite) {
    scheduleSync(dbPath);
  }
}

let activeDb = rawDb;

export function reopenDatabase(sourcePath) {
  try {
    activeDb.close();
    console.log('[Database] Closed active connection.');
  } catch (err) {
    console.error('[Database] Failed to close database:', err.message);
  }

  if (sourcePath) {
    try {
      fs.copyFileSync(sourcePath, dbPath);
      if (sourcePath.includes('temp') || sourcePath.includes('uploads')) {
        try { fs.unlinkSync(sourcePath); } catch (e) {}
      }
      console.log(`[Database] Overwrote dbPath from source: ${sourcePath}`);
    } catch (err) {
      console.error('[Database] Failed to copy database file:', err.message);
      throw err;
    }
  }

  activeDb = new DatabaseSync(dbPath);
  try {
    activeDb.exec('PRAGMA foreign_keys = ON');
    activeDb.exec('PRAGMA journal_mode = WAL');
    activeDb.exec('PRAGMA synchronous = NORMAL');
  } catch (e) {}
  console.log('[Database] Re-opened active connection.');
}

// Proxy wrapper for SQLite DatabaseSync to automatically backup changes
export const db = new Proxy({}, {
  get(target, prop) {
    if (prop === 'exec') {
      return function (sql) {
        const result = activeDb.exec(sql);
        triggerSyncIfWrite(sql);
        return result;
      };
    }
    if (prop === 'prepare') {
      return function (sql) {
        const stmt = activeDb.prepare(sql);
        const rawRun = stmt.run;
        
        stmt.run = function (...args) {
          const result = rawRun.apply(stmt, args);
          triggerSyncIfWrite(sql);
          return result;
        };
        
        return stmt;
      };
    }
    const value = activeDb[prop];
    if (typeof value === 'function') {
      return value.bind(activeDb);
    }
    return value;
  }
});

export { dbPath, uploadDir };
// Enable foreign key constraints for cascade deletes
db.exec('PRAGMA foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo TEXT,
      jersey_color TEXT DEFAULT '#0066CC',
      description TEXT,
      image TEXT,
      coach TEXT,
      stadium TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    -- Add new columns for existing databases
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dob TEXT,
      jersey_number INTEGER,
      position TEXT,
      photo TEXT,
      goals INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      yellow_cards INTEGER DEFAULT 0,
      red_cards INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round TEXT NOT NULL,
      match_date TEXT NOT NULL,
      match_time TEXT NOT NULL,
      venue TEXT NOT NULL,
      team_a_id INTEGER NOT NULL,
      team_b_id INTEGER NOT NULL,
      score_a INTEGER,
      score_b INTEGER,
      status TEXT DEFAULT 'scheduled',
      motm_player_id INTEGER,
      motm_player_name TEXT,
      notes TEXT,
      published INTEGER DEFAULT 0,
      is_friendly INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      FOREIGN KEY (team_a_id) REFERENCES teams(id),
      FOREIGN KEY (team_b_id) REFERENCES teams(id),
      FOREIGN KEY (motm_player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER,
      player_name TEXT,
      team_id INTEGER,
      minute INTEGER NOT NULL,
      is_own_goal INTEGER DEFAULT 0,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS yellow_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER,
      player_name TEXT,
      team_id INTEGER,
      minute INTEGER NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS red_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER,
      player_name TEXT,
      team_id INTEGER,
      minute INTEGER NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT,
      image TEXT,
      video_url TEXT,
      category TEXT DEFAULT 'general',
      published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      album TEXT DEFAULT 'Chung',
      type TEXT DEFAULT 'image',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS group_teams (
      group_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS player_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      voter_ip TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT,
      logo TEXT,
      link TEXT,
      tier TEXT DEFAULT 'general',
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS visit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT,
      visit_date TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visit_logs_date ON visit_logs(visit_date);
    CREATE INDEX IF NOT EXISTS idx_visit_logs_ip ON visit_logs(ip_address);

    CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_matches_lookup ON matches(published, deleted_at, status, match_date);
    CREATE INDEX IF NOT EXISTS idx_news_lookup ON news(published, deleted_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_teams_lookup ON teams(deleted_at, tournament_id);
    CREATE INDEX IF NOT EXISTS idx_goals_match_id ON goals(match_id);
    CREATE INDEX IF NOT EXISTS idx_yellow_cards_match_id ON yellow_cards(match_id);
    CREATE INDEX IF NOT EXISTS idx_red_cards_match_id ON red_cards(match_id);

    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      year INTEGER NOT NULL,
      logo TEXT,
      banner TEXT,
      status TEXT DEFAULT 'active',
      deleted_at TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      logo TEXT,
      banner TEXT,
      format TEXT DEFAULT 'group_knockout',
      points_win INTEGER DEFAULT 3,
      points_draw INTEGER DEFAULT 1,
      points_loss INTEGER DEFAULT 0,
      advance_count INTEGER DEFAULT 2,
      status TEXT DEFAULT 'draft',
      settings TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add team_id to users if it doesn't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN team_id INTEGER REFERENCES teams(id)');
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: Add coach and stadium columns to teams if they don't exist
  try {
    db.exec('ALTER TABLE teams ADD COLUMN coach TEXT');
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migration: Add stadium column to teams if it doesn't exist
  try {
    db.exec('ALTER TABLE teams ADD COLUMN stadium TEXT');
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migration: Add short_name column to sponsors if it doesn't exist
  try {
    db.exec('ALTER TABLE sponsors ADD COLUMN short_name TEXT');
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrations for V3.0 multi-tournament, season and recycle bin
  try { db.exec('ALTER TABLE teams ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)'); } catch (e) {}
  try { db.exec('ALTER TABLE teams ADD COLUMN deleted_at TEXT'); } catch (e) {}

  try { db.exec('ALTER TABLE players ADD COLUMN deleted_at TEXT'); } catch (e) {}

  try { db.exec('ALTER TABLE groups ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)'); } catch (e) {}
  try { db.exec('ALTER TABLE groups ADD COLUMN deleted_at TEXT'); } catch (e) {}

  // Migration: Remove UNIQUE constraint on groups.name (was blocking groups with same name across tournaments)
  try {
    const groupsInfo = db.prepare("PRAGMA table_info(groups)").all();
    const hasUnique = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='groups'").get();
    if (hasUnique && hasUnique.sql && hasUnique.sql.includes('UNIQUE')) {
      console.log('[Migration] Removing UNIQUE constraint from groups.name...');
      db.exec('PRAGMA foreign_keys=OFF');
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS groups_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            tournament_id INTEGER REFERENCES tournaments(id),
            deleted_at TEXT,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
          );
        `);
        db.exec(`INSERT INTO groups_new (id, name, tournament_id, deleted_at, created_at) SELECT id, name, tournament_id, deleted_at, created_at FROM groups`);
        db.exec(`DROP TABLE groups`);
        db.exec(`ALTER TABLE groups_new RENAME TO groups`);
        db.exec('COMMIT');
        console.log('[Migration] groups.name UNIQUE constraint removed successfully.');
      } catch (migErr) {
        db.exec('ROLLBACK');
        console.error('[Migration] Failed to remove groups.name UNIQUE constraint:', migErr.message);
      }
      db.exec('PRAGMA foreign_keys=ON');
    }
  } catch (e) {
    console.error('[Migration] groups UNIQUE check failed:', e.message);
  }

  try { db.exec('ALTER TABLE matches ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)'); } catch (e) {}
  try { db.exec('ALTER TABLE matches ADD COLUMN deleted_at TEXT'); } catch (e) {}

  try { db.exec('ALTER TABLE news ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)'); } catch (e) {}
  try { db.exec('ALTER TABLE news ADD COLUMN deleted_at TEXT'); } catch (e) {}

  try { db.exec('ALTER TABLE gallery ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)'); } catch (e) {}
  try { db.exec('ALTER TABLE gallery ADD COLUMN deleted_at TEXT'); } catch (e) {}

  try { db.exec('ALTER TABLE sponsors ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)'); } catch (e) {}
  try { db.exec('ALTER TABLE sponsors ADD COLUMN deleted_at TEXT'); } catch (e) {}

  // Audit Logs Migrations
  try { db.exec('ALTER TABLE audit_logs ADD COLUMN ip_address TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE audit_logs ADD COLUMN user_agent TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE audit_logs ADD COLUMN device_type TEXT'); } catch (e) {}

  // Friendly matches and MOTM name migrations
  try { db.exec('ALTER TABLE matches ADD COLUMN is_friendly INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE matches ADD COLUMN motm_player_name TEXT'); } catch (e) {}

  // Migration: Modify goals, yellow_cards, red_cards to support free text players & team_id
  try {
    const checkGoals = db.prepare("PRAGMA table_info(goals)").all();
    const hasPlayerName = checkGoals.some(c => c.name === 'player_name');
    if (!hasPlayerName) {
      console.log('Migrating goals, yellow_cards, and red_cards tables...');
      db.exec('BEGIN IMMEDIATE');
      
      // 1. goals migration
      db.exec(`
        CREATE TABLE goals_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          player_id INTEGER,
          player_name TEXT,
          team_id INTEGER,
          minute INTEGER NOT NULL,
          is_own_goal INTEGER DEFAULT 0,
          FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
        );
      `);
      db.exec(`
        INSERT INTO goals_new (id, match_id, player_id, team_id, minute, is_own_goal)
        SELECT id, match_id, player_id, 
               (SELECT team_id FROM players WHERE players.id = player_id), 
               minute, is_own_goal
        FROM goals;
      `);
      db.exec('DROP TABLE goals;');
      db.exec('ALTER TABLE goals_new RENAME TO goals;');

      // 2. yellow_cards migration
      db.exec(`
        CREATE TABLE yellow_cards_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          player_id INTEGER,
          player_name TEXT,
          team_id INTEGER,
          minute INTEGER NOT NULL,
          FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
        );
      `);
      db.exec(`
        INSERT INTO yellow_cards_new (id, match_id, player_id, team_id, minute)
        SELECT id, match_id, player_id, 
               (SELECT team_id FROM players WHERE players.id = player_id), 
               minute
        FROM yellow_cards;
      `);
      db.exec('DROP TABLE yellow_cards;');
      db.exec('ALTER TABLE yellow_cards_new RENAME TO yellow_cards;');

      // 3. red_cards migration
      db.exec(`
        CREATE TABLE red_cards_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          player_id INTEGER,
          player_name TEXT,
          team_id INTEGER,
          minute INTEGER NOT NULL,
          FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
        );
      `);
      db.exec(`
        INSERT INTO red_cards_new (id, match_id, player_id, team_id, minute)
        SELECT id, match_id, player_id, 
               (SELECT team_id FROM players WHERE players.id = player_id), 
               minute
        FROM red_cards;
      `);
      db.exec('DROP TABLE red_cards;');
      db.exec('ALTER TABLE red_cards_new RENAME TO red_cards;');

      db.exec('COMMIT');
      console.log('Migration of goals, yellow_cards, and red_cards successful!');
    }
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (e) {}
    console.error('Failed to migrate events tables:', err.message);
  }

  // Timezone Migration: Convert UTC space-separated strings to ISO 8601 UTC strings
  const tablesToFix = ['seasons', 'tournaments', 'teams', 'players', 'matches', 'news', 'gallery', 'sponsors', 'activity_logs', 'audit_logs', 'users'];
  for (const table of tablesToFix) {
    try {
      const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (checkTable) {
        db.prepare(`
          UPDATE ${table} 
          SET created_at = replace(created_at, ' ', 'T') || 'Z' 
          WHERE created_at NOT LIKE '%Z' AND created_at IS NOT NULL AND created_at NOT LIKE '%T%'
        `).run();
        
        db.prepare(`
          UPDATE ${table} 
          SET created_at = created_at || 'Z' 
          WHERE created_at NOT LIKE '%Z' AND created_at IS NOT NULL
        `).run();
      }
    } catch (err) {
      console.warn(`[Timezone Migration] Could not migrate created_at for table ${table}:`, err.message);
    }
  }

  // Seed default season and tournament if empty, mapping existing database items
  try {
    const seasonCount = db.prepare('SELECT COUNT(*) as count FROM seasons').get();
    if (!seasonCount || seasonCount.count === 0) {
      console.log('No seasons found. Creating default V3.0 season...');
      db.prepare("INSERT INTO seasons (name, year, status) VALUES ('Mùa giải 2026', 2026, 'active')").run();
    }
    
    const defaultSeason = db.prepare("SELECT id FROM seasons WHERE name = 'Mùa giải 2026'").get();
    if (defaultSeason) {
      const tournamentCount = db.prepare('SELECT COUNT(*) as count FROM tournaments').get();
      if (!tournamentCount || tournamentCount.count === 0) {
        console.log('No tournaments found. Creating default V3.0 tournament and mapping existing data...');
        db.prepare(`
          INSERT INTO tournaments (season_id, name, format, status, points_win, points_draw, points_loss)
          VALUES (?, 'Giải Bóng đá Thanh niên 2026', 'group_knockout', 'active', 3, 1, 0)
        `).run(defaultSeason.id);
        
        const defaultTournament = db.prepare("SELECT id FROM tournaments WHERE name = 'Giải Bóng đá Thanh niên 2026'").get();
        if (defaultTournament) {
          const tId = defaultTournament.id;
          db.prepare('UPDATE teams SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
          db.prepare('UPDATE groups SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
          db.prepare('UPDATE matches SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
          db.prepare('UPDATE news SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
          db.prepare('UPDATE gallery SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
          db.prepare('UPDATE sponsors SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
          console.log(`Mapped all existing teams, matches, groups, news, gallery, and sponsors to default tournament ID: ${tId}`);
        }
      }
    }
    
    // Automatically merge any duplicate teams in the same tournament
    mergeDuplicateTeams();
  } catch (err) {
    console.error('Error during V3.0 season/tournament database migration:', err);
  }

  // Automatically seed users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCount || userCount.count === 0) {
    console.log('Database empty. Running automatic seed of default users...');
    const adminHash = bcrypt.hashSync('admin123', 10);
    const bientapHash = bcrypt.hashSync('bientap123', 10);
    const nhapketquaHash = bcrypt.hashSync('ketqua123', 10);

    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'super_admin')").run(adminHash);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('bientap', ?, 'editor')").run(bientapHash);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('nhapketqua', ?, 'scorekeeper')").run(nhapketquaHash);
    
    // Seed settings
    const settings = [
      ['tournament_name', 'Giải Bóng đá Thanh niên Đoàn phường 2026'],
      ['slogan', 'Đoàn kết - Kỷ luật - Sáng tạo - Thành công'],
      ['banner', ''],
      ['union_logo', ''],
      ['contact_phone', '0123 456 789'],
      ['contact_email', 'doanphuong@example.com'],
      ['contact_address', 'UBND Phường, Quận/Huyện, Tỉnh/TP'],
      ['about', 'Giải bóng đá Thanh niên do Đoàn phường tổ chức nhằm tạo sân chơi lành mạnh, rèn luyện thể chất và tinh thần đoàn kết cho thanh niên trên địa bàn phường.'],
      ['livestream_url', ''],
    ];
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of settings) upsert.run(k, v);
    
    console.log('Seeded:');
    console.log('- admin / admin123 (super_admin)');
    console.log('- bientap / bientap123 (editor)');
    console.log('- nhapketqua / ketqua123 (scorekeeper)');
  }

  // Run recycle bin auto-cleanup on startup
  try {
    cleanOldRecycleBin();
    // Clean up stale group teams pointing to deleted groups
    db.prepare('DELETE FROM group_teams WHERE group_id IN (SELECT id FROM groups WHERE deleted_at IS NOT NULL)').run();
    console.log('[Database] Cleaned up stale group_teams assignments.');

    // Clean up duplicate groups that have NULL tournament_id, and update other orphans
    // 1. Delete group_teams assignments for groups with NULL tournament_id
    db.prepare('DELETE FROM group_teams WHERE group_id IN (SELECT id FROM groups WHERE tournament_id IS NULL)').run();
    // 2. Delete the groups themselves
    db.prepare('DELETE FROM groups WHERE tournament_id IS NULL').run();
    console.log('[Database] Cleaned up stale NULL tournament_id groups and their assignments.');

    // 3. Set tournament_id for other orphaned records
    const activeT = db.prepare("SELECT id FROM tournaments WHERE status = 'active' AND deleted_at IS NULL LIMIT 1").get();
    if (activeT) {
      const tId = activeT.id;
      db.prepare('UPDATE teams SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
      db.prepare('UPDATE matches SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
      db.prepare('UPDATE news SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
      db.prepare('UPDATE gallery SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
      db.prepare('UPDATE sponsors SET tournament_id = ? WHERE tournament_id IS NULL').run(tId);
      console.log(`[Database] Mapped orphaned records to tournament ID: ${tId}`);
    }
  } catch (err) {
    console.error('[RecycleBin] Initial clean up error:', err);
  }
  // Setup interval to run every 24 hours
  setInterval(() => {
    try {
      cleanOldRecycleBin();
    } catch (err) {
      console.error('[RecycleBin] Scheduled clean up error:', err);
    }
  }, 24 * 60 * 60 * 1000);

  // Run auto backup on startup
  try {
    performAutoBackup();
  } catch (err) {
    console.error('[Backup] Initial auto backup error:', err);
  }
  // Setup interval to run every 7 days
  setInterval(() => {
    try {
      performAutoBackup();
    } catch (err) {
      console.error('[Backup] Scheduled auto backup error:', err);
    }
  }, 7 * 24 * 60 * 60 * 1000);
}

export function performAutoBackup() {
  try {
    const backupsDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const dateStr = getVNLocalDateTimeString();
    const backupFile = path.join(backupsDir, `backup-${dateStr}.db`);
    
    // Copy active database
    fs.copyFileSync(dbPath, backupFile);
    console.log(`[Backup] Automatic backup created: ${backupFile}`);

    // Prune backups if count > 5
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, path: path.join(backupsDir, f), stat: fs.statSync(path.join(backupsDir, f)) }))
      .sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());

    while (files.length > 5) {
      const oldest = files.shift();
      fs.unlinkSync(oldest.path);
      console.log(`[Backup] Pruned oldest backup file: ${oldest.name}`);
    }
  } catch (err) {
    console.error('[Backup] Automatic backup failed:', err);
  }
}

export function cleanOldRecycleBin() {
  try {
    const threshold = "datetime('now', '-30 days')";
    
    // Deleting teams and their players
    const oldTeams = db.prepare(`SELECT id FROM teams WHERE deleted_at < ${threshold}`).all();
    for (const team of oldTeams) {
      db.prepare('DELETE FROM players WHERE team_id = ?').run(team.id);
      db.prepare('DELETE FROM group_teams WHERE team_id = ?').run(team.id);
      db.prepare('DELETE FROM matches WHERE team_a_id = ? OR team_b_id = ?').run(team.id, team.id);
      db.prepare('DELETE FROM users WHERE team_id = ?').run(team.id);
      db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);
    }

    db.prepare(`DELETE FROM players WHERE deleted_at < ${threshold}`).run();
    db.prepare(`DELETE FROM matches WHERE deleted_at < ${threshold}`).run();
    db.prepare(`DELETE FROM groups WHERE deleted_at < ${threshold}`).run();
    db.prepare(`DELETE FROM news WHERE deleted_at < ${threshold}`).run();
    db.prepare(`DELETE FROM sponsors WHERE deleted_at < ${threshold}`).run();
    
    // Deleting seasons and their tournaments
    const oldSeasons = db.prepare(`SELECT id FROM seasons WHERE deleted_at < ${threshold}`).all();
    for (const season of oldSeasons) {
      db.prepare('DELETE FROM tournaments WHERE season_id = ?').run(season.id);
      db.prepare('DELETE FROM seasons WHERE id = ?').run(season.id);
    }
    
    db.prepare(`DELETE FROM tournaments WHERE deleted_at < ${threshold}`).run();
    
    console.log('[RecycleBin] Auto-purged old items deleted more than 30 days ago.');
  } catch (err) {
    console.error('[RecycleBin] Clean up failed:', err);
  }
}

function getDeviceType(ua) {
  if (!ua) return 'Desktop';
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('mobi') || uaLower.includes('android') || uaLower.includes('iphone') || uaLower.includes('ipad')) {
    if (uaLower.includes('ipad') || uaLower.includes('tablet')) {
      return 'Tablet';
    }
    return 'Mobile';
  }
  return 'Desktop';
}

function getBrowserName(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'Internet Explorer';
  if (ua.includes('Edge') || ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Browser';
}

export function logAction(username, action, details) {
  try {
    let ipAddress = null;
    let userAgent = null;
    let deviceType = null;

    try {
      const req = requestStorage.getStore();
      if (req) {
        userAgent = req.headers['user-agent'] || null;
        ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || null;
        if (ipAddress && ipAddress.startsWith('::ffff:')) {
          ipAddress = ipAddress.substring(7);
        }
        // Extract client IP if comma separated proxy list
        if (ipAddress && ipAddress.includes(',')) {
          ipAddress = ipAddress.split(',')[0].trim();
        }
        deviceType = getDeviceType(userAgent);
        if (userAgent) {
          const browser = getBrowserName(userAgent);
          userAgent = `${deviceType} (${browser}) - ${userAgent.substring(0, 100)}`;
        }
      }
    } catch (e) {
      // Ignore request context errors
    }

    // Print to backend console for verification
    console.log(`[AuditLog] Logged action: ${action} by user ${username} from IP: ${ipAddress || 'local'} (${deviceType || 'Desktop'})`);

    try {
      db.prepare(`
        INSERT INTO audit_logs (username, action, details, ip_address, user_agent, device_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        username,
        action,
        details || null,
        ipAddress,
        userAgent,
        deviceType || 'Desktop',
        new Date().toISOString()
      );
    } catch (dbErr) {
      // Fallback if table doesn't have the new columns yet (server has not restarted to run migrations)
      db.prepare(`
        INSERT INTO audit_logs (username, action, details, created_at)
        VALUES (?, ?, ?, ?)
      `).run(username, action, details || null, new Date().toISOString());
      console.warn('[AuditLog] Wrote log using fallback schema due to DB column error:', dbErr.message);
    }
  } catch (err) {
    console.error('[AuditLog] Failed to write log completely:', err);
  }
}

export function autoStartMatches() {
  try {
    const now = new Date();
    const scheduled = db.prepare("SELECT * FROM matches WHERE status = 'scheduled' AND deleted_at IS NULL").all();
    for (const match of scheduled) {
      const matchStart = new Date(`${match.match_date}T${match.match_time}:00`);
      if (now >= matchStart) {
        db.prepare(`
          UPDATE matches 
          SET status = 'live', published = 1 
          WHERE id = ?
        `).run(match.id);
        console.log(`[Auto-Start] Match ${match.id} (${match.match_date} ${match.match_time}) has started. Status updated to live.`);
      }
    }
  } catch (err) {
    console.error('[Auto-Start Error]', err.message);
  }
}

export function mergeDuplicateTeams() {
  try {
    const duplicates = db.prepare(`
      SELECT name, tournament_id, COUNT(*) as c 
      FROM teams 
      WHERE deleted_at IS NULL 
      GROUP BY name, tournament_id 
      HAVING c > 1
    `).all();

    if (duplicates.length === 0) return;

    console.log(`[Database] Found ${duplicates.length} duplicate team names. Merging...`);
    db.exec('BEGIN TRANSACTION');
    try {
      for (const dup of duplicates) {
        const allMatches = db.prepare(`
          SELECT id FROM teams 
          WHERE name = ? AND tournament_id = ? AND deleted_at IS NULL
          ORDER BY id ASC
        `).all(dup.name, dup.tournament_id);

        const masterId = allMatches[0].id;
        const duplicateIds = allMatches.slice(1).map(t => t.id);

        for (const dupId of duplicateIds) {
          // 1. Move players
          db.prepare('UPDATE players SET team_id = ? WHERE team_id = ?').run(masterId, dupId);

          // 2. Move matches (team_a and team_b)
          db.prepare('UPDATE matches SET team_a_id = ? WHERE team_a_id = ?').run(masterId, dupId);
          db.prepare('UPDATE matches SET team_b_id = ? WHERE team_b_id = ?').run(masterId, dupId);

          // 3. Move group assignments
          const masterGroup = db.prepare('SELECT group_id FROM group_teams WHERE team_id = ?').get(masterId);
          const dupGroup = db.prepare('SELECT group_id FROM group_teams WHERE team_id = ?').get(dupId);
          
          if (dupGroup) {
            if (masterGroup) {
              db.prepare('DELETE FROM group_teams WHERE team_id = ?').run(dupId);
            } else {
              db.prepare('UPDATE group_teams SET team_id = ? WHERE team_id = ?').run(masterId, dupId);
            }
          }

          // 4. Move goals
          db.prepare('UPDATE goals SET team_id = ? WHERE team_id = ?').run(masterId, dupId);

          // 5. Move yellow cards
          db.prepare('UPDATE yellow_cards SET team_id = ? WHERE team_id = ?').run(masterId, dupId);

          // 6. Move red cards
          db.prepare('UPDATE red_cards SET team_id = ? WHERE team_id = ?').run(masterId, dupId);

          // 7. Move users
          db.prepare('UPDATE users SET team_id = ? WHERE team_id = ?').run(masterId, dupId);

          // 8. Delete the duplicate team
          db.prepare('DELETE FROM teams WHERE id = ?').run(dupId);
        }
      }
      db.exec('COMMIT');
      console.log('[Database] Duplicate teams merged successfully.');
    } catch (migErr) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {}
      console.error('[Database] Failed to merge duplicate teams:', migErr.message);
    }
  } catch (err) {
    console.error('[Database] Duplicate teams check failed:', err.message);
  }
}

