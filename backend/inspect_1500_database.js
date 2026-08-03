import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const lateFieldUrl = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-late-field-azr87wgo-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Downloading database from ep-late-field-azr87wgo...');
  const client = new Client({ connectionString: lateFieldUrl });
  await client.connect();

  const res = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  const buf = res.rows[0].data;
  console.log(`📥 Downloaded ${buf.length} bytes`);

  fs.writeFileSync('./backend/late_field_1500.db', buf);
  fs.writeFileSync('./backend/tournament.db', buf);
  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync('./data/tournament.db', buf);

  const db = new DatabaseSync('./backend/late_field_1500.db');

  console.log('\n=== TEAMS IN 15:00 DB ===');
  console.table(db.prepare('SELECT id, name FROM teams').all());

  console.log('\n=== MATCHES IN 15:00 DB ===');
  const matches = db.prepare(`
    SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all();
  console.table(matches);

  console.log('\n=== STATS ===');
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();

  // NOW SYNC THIS EXACT 15:00 DB ACROSS ALL NEON NODES!
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
      console.log(`📡 Syncing 15:00 DB with scores to Neon [${dbHost}]...`);
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

      console.log(`🎉 Successfully synced 15:00 DB to Neon [${dbHost}]!`);
      await nClient.end();
    } catch (e) {
      console.error(`❌ Sync error for ${nUrl}:`, e.message);
    }
  }
}

main().catch(err => console.error('❌ Error:', err));
