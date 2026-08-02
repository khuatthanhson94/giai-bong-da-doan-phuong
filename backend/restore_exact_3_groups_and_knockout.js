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

const steepBoatUrl = 'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Downloading data from ep-steep-boat-az2o0ij7...');
  const client = new Client({ connectionString: steepBoatUrl });
  await client.connect();

  const res = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length === 0 || !res.rows[0].data) {
    throw new Error('No data found in ep-steep-boat');
  }

  const buf = res.rows[0].data;
  const dbPath1 = path.join(__dirname, 'tournament.db');
  const dbPath2 = path.join(__dirname, '..', 'data', 'tournament.db');

  fs.writeFileSync(dbPath1, buf);
  if (!fs.existsSync(path.dirname(dbPath2))) fs.mkdirSync(path.dirname(dbPath2), { recursive: true });
  fs.writeFileSync(dbPath2, buf);
  console.log(`✅ Loaded ${buf.length} bytes into local database files!`);

  const db = new DatabaseSync(dbPath1);

  // Migrate matches table to make team_a_id and team_b_id nullable if not already
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches_new (
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
    INSERT INTO matches_new SELECT id, round, match_date, match_time, venue, team_a_id, team_b_id, score_a, score_b, status, is_friendly, notes, created_at, tournament_id, motm_player_id, motm_player_name, published, deleted_at FROM matches;
    DROP TABLE matches;
    ALTER TABLE matches_new RENAME TO matches;
  `);

  // 1. Ensure all future/unscored Knockout matches have status = 'scheduled'
  db.prepare(`
    UPDATE matches 
    SET status = 'scheduled' 
    WHERE score_a IS NULL AND score_b IS NULL AND status = 'live'
  `).run();

  // 2. Ensure all 8 Knockout matches (QF1-4, SF1-2, 3P, F1) exist
  const existingMatches = db.prepare('SELECT id, round, notes FROM matches').all();
  
  const koDefinitions = [
    { round: 'Tứ kết 1', date: '2026-08-04', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: 21, teamB: 93, notes: 'KO_ID: QF1' },
    { round: 'Tứ kết 2', date: '2026-08-04', time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', teamA: 78, teamB: 94, notes: 'KO_ID: QF2' },
    { round: 'Tứ kết 3', date: '2026-08-04', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: 80, teamB: 95, notes: 'KO_ID: QF3' },
    { round: 'Tứ kết 4', date: '2026-08-04', time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', teamA: 79, teamB: 80, notes: 'KO_ID: QF4' },
    { round: 'Bán kết 1', date: '2026-08-06', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: SF1' },
    { round: 'Bán kết 2', date: '2026-08-06', time: '18:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: SF2' },
    { round: 'Tranh Hạng 3', date: '2026-08-08', time: '06:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: 3P' },
    { round: 'Chung kết', date: '2026-08-08', time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', teamA: null, teamB: null, notes: 'KO_ID: F1' }
  ];

  for (const ko of koDefinitions) {
    const found = existingMatches.find(m => m.notes && m.notes.includes(ko.notes));
    if (found) {
      db.prepare(`
        UPDATE matches 
        SET round = ?, match_date = ?, match_time = ?, venue = ?, status = 'scheduled', published = 1
        WHERE id = ?
      `).run(ko.round, ko.date, ko.time, ko.venue, found.id);
    } else {
      db.prepare(`
        INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'scheduled', ?, 1)
      `).run(ko.round, ko.date, ko.time, ko.venue, ko.teamA, ko.teamB, ko.notes);
    }
  }

  // 3. Flush changes and get buffer
  const finalBuf = fs.readFileSync(dbPath1);

  // 4. Sync to all 5 Neon instances
  const neonUrls = [
    steepBoatUrl,
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  ];

  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`📡 Syncing restored 3-group & Knockout DB to Neon [${dbHost}]...`);
      const nClient = new Client({ connectionString: nUrl });
      await nClient.connect();

      await nClient.query(`
        CREATE TABLE IF NOT EXISTS sqlite_sync (
          key VARCHAR(255) PRIMARY KEY,
          data BYTEA,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await nClient.query(`
        INSERT INTO sqlite_sync (key, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW();
      `, ['tournament.db', finalBuf]);

      console.log(`🎉 Successfully synced to Neon [${dbHost}]!`);
      await nClient.end();
    } catch (e) {
      console.error(`❌ Sync error:`, e.message);
    }
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
