import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let DatabaseSync;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  const betterSqlite = await import('better-sqlite3');
  DatabaseSync = betterSqlite.default;
}

const dbPath1 = path.join(__dirname, 'tournament.db');
const dbPath2 = path.join(__dirname, '..', 'data', 'tournament.db');

const db = new DatabaseSync(dbPath1);

// 1. Delete all old Knockout matches (round not containing 'lượt' or 'bảng' or 'giao hữu')
db.prepare(`
  DELETE FROM matches 
  WHERE round NOT LIKE '%lượt%' AND round NOT LIKE '%bảng%' AND round NOT LIKE '%giao hữu%'
`).run();

// 2. Insert clean 8 Knockout matches with exact user requested schedule & badges
const koMatches = [
  { round: 'Tứ kết 1', date: '2026-08-04', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: 21, teamB: 93, notes: 'KO_ID: QF1' },
  { round: 'Tứ kết 2', date: '2026-08-04', time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', teamA: 78, teamB: 94, notes: 'KO_ID: QF2' },
  { round: 'Tứ kết 3', date: '2026-08-04', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: 80, teamB: 95, notes: 'KO_ID: QF3' },
  { round: 'Tứ kết 4', date: '2026-08-04', time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', teamA: 79, teamB: 80, notes: 'KO_ID: QF4' },
  { round: 'Bán kết 1', date: '2026-08-06', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: SF1' },
  { round: 'Bán kết 2', date: '2026-08-06', time: '18:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: SF2' },
  { round: 'Tranh Hạng 3', date: '2026-08-08', time: '06:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: 3P' },
  { round: 'Chung kết', date: '2026-08-08', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: F1' }
];

for (const ko of koMatches) {
  db.prepare(`
    INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'scheduled', ?, 1)
  `).run(ko.round, ko.date, ko.time, ko.venue, ko.teamA, ko.teamB, ko.notes);
}

console.log('✅ Formatted 8 Knockout matches with status = scheduled!');

// Copy to data/tournament.db
const buf = fs.readFileSync(dbPath1);
if (!fs.existsSync(path.dirname(dbPath2))) fs.mkdirSync(path.dirname(dbPath2), { recursive: true });
fs.writeFileSync(dbPath2, buf);

// 3. Upload to all 5 Neon database URLs
const neonUrls = [
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

async function syncAll() {
  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`📡 Uploading database to Neon [${dbHost}]...`);
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

      console.log(`🎉 Successfully synced to Neon [${dbHost}]!`);
      await client.end();
    } catch (e) {
      console.error(`❌ Sync error for ${nUrl}:`, e.message);
    }
  }
}

syncAll();
