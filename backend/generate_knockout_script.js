import { db } from './src/db.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

const tId = 1;

const config = {
  startingRound: 'Tứ kết',
  advancingCount: 8,
  startingMatches: [
    { id: 'QF1', home: { type: 'rank', groupId: 117, rank: 1 }, away: { type: 'rank', groupId: 119, rank: 2 }, match_date: '2026-08-04', match_time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' },
    { id: 'QF2', home: { type: 'rank', groupId: 118, rank: 1 }, away: { type: 'best_third', rank: 1 }, match_date: '2026-08-04', match_time: '07:00', venue: 'Sân 2 - Sân bóng Tùng Thiện' },
    { id: 'QF3', home: { type: 'rank', groupId: 119, rank: 1 }, away: { type: 'best_third', rank: 2 }, match_date: '2026-08-04', match_time: '08:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' },
    { id: 'QF4', home: { type: 'rank', groupId: 117, rank: 2 }, away: { type: 'rank', groupId: 118, rank: 2 }, match_date: '2026-08-04', match_time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện' }
  ],
  nextRounds: [
    {
      round: 'Bán kết',
      matches: [
        { id: 'SF1', home: { type: 'winner', matchId: 'QF1' }, away: { type: 'winner', matchId: 'QF2' }, match_date: '2026-08-05', match_time: '08:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' },
        { id: 'SF2', home: { type: 'winner', matchId: 'QF3' }, away: { type: 'winner', matchId: 'QF4' }, match_date: '2026-08-05', match_time: '15:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' }
      ]
    },
    {
      round: 'Chung kết',
      matches: [
        { id: 'F1', home: { type: 'winner', matchId: 'SF1' }, away: { type: 'winner', matchId: 'SF2' }, match_date: '2026-08-07', match_time: '15:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' }
      ]
    }
  ]
};

// 1. Save config to settings table
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`knockout_bracket_config_${tId}`, JSON.stringify(config));

// 2. Delete ALL existing knockout matches explicitly
db.prepare("DELETE FROM matches WHERE id >= 450").run();
db.prepare("DELETE FROM matches WHERE notes LIKE '%KO_ID%'").run();
db.prepare("DELETE FROM matches WHERE round LIKE '%Tứ%' OR round LIKE '%Quarter%'").run();

// 3. Insert the 4 Quarter-final matches with status = 'scheduled' and round = 'Tứ kết'
const qfMatches = [
  { round: 'Tứ kết', match_date: '2026-08-04', match_time: '07:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', team_a_id: 103, team_b_id: 107, notes: 'KO_ID: QF1' },
  { round: 'Tứ kết', match_date: '2026-08-04', match_time: '07:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', team_a_id: 101, team_b_id: 108, notes: 'KO_ID: QF2' },
  { round: 'Tứ kết', match_date: '2026-08-04', match_time: '08:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', team_a_id: 104, team_b_id: 102, notes: 'KO_ID: QF3' },
  { round: 'Tứ kết', match_date: '2026-08-04', match_time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', team_a_id: 100, team_b_id: 111, notes: 'KO_ID: QF4' }
];

for (const m of qfMatches) {
  db.prepare(`
    INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 1)
  `).run(m.round, m.match_date, m.match_time, m.venue, m.team_a_id, m.team_b_id, tId, m.notes);
}

// 4. Force WAL Checkpoint so SQLite file on disk contains all rows
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');

console.log('🎉 Successfully created 4 Quarter-final knockout matches with status SCHEDULED!');

// 5. Upload to BOTH Neon PostgreSQL instances
const neonUrls = [
  'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

const dbFilePath = path.join(__dirname, 'data', 'tournament.db');
const buf = fs.readFileSync(dbFilePath);

for (const neonUrl of neonUrls) {
  try {
    const dbHost = neonUrl.split('@')[1]?.split('/')[0] || 'Neon';
    console.log(`📡 Syncing database (${buf.length} bytes) to Neon instance [${dbHost}]...`);
    const client = new Client({ connectionString: neonUrl });
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
    console.error(`❌ Sync failed for instance:`, e.message);
  }
}
