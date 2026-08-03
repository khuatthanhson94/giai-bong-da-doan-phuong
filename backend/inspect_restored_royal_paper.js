import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const restoredBranchUrl = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Restored Neon Branch (ep-royal-paper-azh7uc1w)...');
  const client = new Client({ connectionString: restoredBranchUrl });
  await client.connect();

  const res = await client.query('SELECT key, data, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length === 0 || !res.rows[0].data) {
    console.log('⚠️ No sqlite_sync row found in this branch!');
    await client.end();
    return;
  }

  const buf = res.rows[0].data;
  console.log(`📥 Downloaded ${buf.length} bytes from Restored Branch (Updated at: ${res.rows[0].updated_at})`);

  fs.writeFileSync('./backend/restored_from_royal_paper.db', buf);
  fs.writeFileSync('./backend/tournament.db', buf);
  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync('./data/tournament.db', buf);

  console.log('✅ Overwrote local tournament.db with restored branch data!');

  const db = new DatabaseSync('./backend/restored_from_royal_paper.db');

  console.log('=== TEAMS ===');
  const teams = db.prepare('SELECT id, name FROM teams WHERE deleted_at IS NULL').all();
  console.table(teams);

  console.log('=== GROUPS ===');
  const groups = db.prepare('SELECT id, name FROM groups WHERE deleted_at IS NULL').all();
  console.table(groups);

  console.log('=== GROUP TEAMS ===');
  console.table(db.prepare(`
    SELECT g.name as group_name, t.id as team_id, t.name as team_name
    FROM group_teams gt
    JOIN groups g ON gt.group_id = g.id
    JOIN teams t ON gt.team_id = t.id
  `).all());

  console.log('=== MATCHES ===');
  const matches = db.prepare(`
    SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all();
  console.table(matches);

  console.log('=== STATS ===');
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();

  // Now sync this EXACT restored database to ALL Neon databases!
  const neonUrls = [
    restoredBranchUrl,
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  ];

  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`📡 Syncing restored database to Neon [${dbHost}]...`);
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
      `, ['tournament.db', buf]);

      console.log(`🎉 Successfully synced restored DB to Neon [${dbHost}]!`);
      await nClient.end();
    } catch (e) {
      console.error(`❌ Sync error for ${nUrl}:`, e.message);
    }
  }
}

main().catch(err => console.error('❌ Error:', err));
