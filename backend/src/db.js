import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let dataDir;
let dbPath;

if (process.env.VERCEL) {
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
} else if (process.env.RENDER) {
  // Use persistent disk on Render
  dataDir = '/opt/render/project/backend/data';
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'tournament.db');
  console.log('Using persistent disk on Render:', dbPath);
} else {
  dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'tournament.db');
}

export const db = new DatabaseSync(dbPath);
// Enable foreign key constraints for cascade deletes
db.exec('PRAGMA foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
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
      notes TEXT,
      published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_a_id) REFERENCES teams(id),
      FOREIGN KEY (team_b_id) REFERENCES teams(id),
      FOREIGN KEY (motm_player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      is_own_goal INTEGER DEFAULT 0,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS yellow_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS red_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      album TEXT DEFAULT 'Chung',
      type TEXT DEFAULT 'image',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );
  `);

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
}
