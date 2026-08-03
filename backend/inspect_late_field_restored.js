import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const lateFieldUrl = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-late-field-azr87wgo-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Restored Branch (ep-late-field-azr87wgo)...');
  const client = new Client({ connectionString: lateFieldUrl });
  await client.connect();

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length === 0 || !res.rows[0].data) {
    console.log('⚠️ No sqlite_sync row in this restored branch');
    await client.end();
    return;
  }

  const buf = res.rows[0].data;
  console.log(`📥 Downloaded ${buf.length} bytes from ep-late-field (Updated at: ${res.rows[0].updated_at})`);

  fs.writeFileSync('./backend/late_field_download.db', buf);
  fs.writeFileSync('./backend/tournament.db', buf);
  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync('./data/tournament.db', buf);

  console.log('✅ Overwrote local tournament.db with restored branch data!');

  const db = new DatabaseSync('./backend/late_field_download.db');

  console.log('\n=== TEAMS IN RESTORED BRANCH ===');
  console.table(db.prepare('SELECT id, name FROM teams').all());

  console.log('\n=== GROUPS IN RESTORED BRANCH ===');
  console.table(db.prepare('SELECT id, name FROM groups').all());

  console.log('\n=== MATCHES & SCORES IN RESTORED BRANCH ===');
  const matches = db.prepare(`
    SELECT m.id, m.round, m.match_date, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all();
  console.table(matches);

  console.log('\n=== FINISHED MATCHES WITH SCORES ===');
  console.table(matches.filter(x => x.score_a !== null || x.score_b !== null || x.status === 'finished'));

  console.log('\n=== STATS ===');
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();

  // NOW SYNC THIS RESTORED DATABASE WITH SCORES ACROSS ALL NEON NODES!
  const neonUrls = [
    lateFieldUrl,
    'postgresql://neondb_owner:npg_E5KjxWXNAo2M@ep-soft-credit-azu5s02r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-wispy-breeze-azkn20cn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  ];

  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`📡 Syncing restored database with scores to Neon [${dbHost}]...`);
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
