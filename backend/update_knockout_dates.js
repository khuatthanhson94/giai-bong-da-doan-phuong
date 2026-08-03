import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath1 = path.join(__dirname, 'tournament.db');
const dbPath2 = path.join(__dirname, '..', 'data', 'tournament.db');

const db = new DatabaseSync(dbPath1);

// Ensure matches schema allows NULL for team_a_id and team_b_id
db.exec(`
  CREATE TABLE IF NOT EXISTS matches_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round TEXT NOT NULL,
    match_date TEXT NOT NULL,
    match_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    team_a_id INTEGER,
    team_b_id INTEGER,
    score_a INTEGER DEFAULT NULL,
    score_b INTEGER DEFAULT NULL,
    status TEXT DEFAULT 'scheduled',
    is_friendly INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id INTEGER DEFAULT 1,
    motm_player_id INTEGER,
    motm_player_name TEXT,
    published INTEGER DEFAULT 1,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (team_a_id) REFERENCES teams (id),
    FOREIGN KEY (team_b_id) REFERENCES teams (id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
    FOREIGN KEY (motm_player_id) REFERENCES players (id)
  );
  INSERT INTO matches_temp SELECT id, round, match_date, match_time, venue, team_a_id, team_b_id, score_a, score_b, status, is_friendly, notes, created_at, tournament_id, motm_player_id, motm_player_name, published, deleted_at FROM matches;
  DROP TABLE matches;
  ALTER TABLE matches_temp RENAME TO matches;
`);

// Target Knockout schedules requested by user
const koSchedule = [
  { round: 'Bán kết 1', date: '2026-08-06', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', koId: 'SF1' },
  { round: 'Bán kết 2', date: '2026-08-06', time: '18:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', koId: 'SF2' },
  { round: 'Chung kết', date: '2026-08-08', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', koId: 'F1' },
  { round: 'Tranh Hạng 3', date: '2026-08-08', time: '06:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', koId: '3P' }
];

for (const ko of koSchedule) {
  const existing = db.prepare("SELECT id FROM matches WHERE round = ? OR notes LIKE ?").get(ko.round, `%${ko.koId}%`);
  if (existing) {
    db.prepare(`
      UPDATE matches 
      SET round = ?, match_date = ?, match_time = ?, venue = ?, status = 'scheduled', published = 1, notes = ?
      WHERE id = ?
    `).run(ko.round, ko.date, ko.time, ko.venue, `KO_ID: ${ko.koId}`, existing.id);
  } else {
    db.prepare(`
      INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
      VALUES (?, ?, ?, ?, NULL, NULL, 1, 'scheduled', ?, 1)
    `).run(ko.round, ko.date, ko.time, ko.venue, `KO_ID: ${ko.koId}`);
  }
}

console.log('✅ Updated Bán kết & Chung kết dates/times in SQLite database!');

const buf = fs.readFileSync(dbPath1);
if (!fs.existsSync(path.dirname(dbPath2))) fs.mkdirSync(path.dirname(dbPath2), { recursive: true });
fs.writeFileSync(dbPath2, buf);

// Safeguard and sync to all Neon databases
const neonUrls = [
  'postgresql://neondb_owner:npg_E5KjxWXNAo2M@ep-soft-credit-azu5s02r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-wispy-breeze-azkn20cn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

async function syncAll() {
  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`🛡️ Safeguarding and syncing DB to Neon [${dbHost}]...`);
      const client = new Client({ connectionString: nUrl });
      await client.connect();

      await client.query(`
        CREATE TABLE IF NOT EXISTS sqlite_sync (
          key VARCHAR(255) PRIMARY KEY,
          data BYTEA,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        INSERT INTO sqlite_sync (key, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW();
      `, ['tournament.db', buf]);

      console.log(`🎉 Successfully safeguarded Neon [${dbHost}]!`);
      await client.end();
    } catch (e) {
      console.error(`❌ Sync error for ${nUrl}:`, e.message);
    }
  }
}

syncAll();
