import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const wispyBreezeUrl = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-wispy-breeze-azkn20cn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon database (ep-wispy-breeze-azkn20cn)...');
  const client = new Client({ connectionString: wispyBreezeUrl });
  await client.connect();

  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('📋 Existing Neon tables:', tables.rows.map(r => r.table_name));

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length > 0 && res.rows[0].data) {
    const buf = res.rows[0].data;
    console.log(`📥 Downloaded ${buf.length} bytes from ep-wispy-breeze (Updated at: ${res.rows[0].updated_at})`);
    
    fs.writeFileSync('./backend/wispy_breeze.db', buf);
    fs.writeFileSync('./backend/tournament.db', buf);
    if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/tournament.db', buf);
    console.log('✅ Overwrote ./data/tournament.db & ./backend/tournament.db with download!');

    const db = new DatabaseSync('./backend/wispy_breeze.db');
    const teams = db.prepare('SELECT id, name FROM teams').all();
    const groups = db.prepare('SELECT id, name FROM groups').all();
    const groupTeams = db.prepare(`
      SELECT g.name as group_name, t.id as team_id, t.name as team_name
      FROM group_teams gt
      JOIN groups g ON gt.group_id = g.id
      JOIN teams t ON gt.team_id = t.id
    `).all();
    const matches = db.prepare(`
      SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
      FROM matches m
      LEFT JOIN teams ta ON m.team_a_id = ta.id
      LEFT JOIN teams tb ON m.team_b_id = tb.id
    `).all();

    console.log('=== TEAMS ===');
    console.table(teams);

    console.log('=== GROUPS ===');
    console.table(groups);

    console.log('=== GROUP TEAMS ===');
    console.table(groupTeams);

    console.log('=== MATCHES ===');
    console.table(matches);

    console.log('=== STATS ===');
    console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
    console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

    // Sync this exact database from ep-wispy-breeze to ALL Neon databases!
    const neonUrls = [
      wispyBreezeUrl,
      'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    ];

    for (const nUrl of neonUrls) {
      try {
        const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
        console.log(`📡 Syncing wispy-breeze database to Neon [${dbHost}]...`);
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

        console.log(`🎉 Successfully synced to Neon [${dbHost}]!`);
        await nClient.end();
      } catch (e) {
        console.error(`❌ Sync error for ${nUrl}:`, e.message);
      }
    }

  } else {
    console.log('⚠️ No tournament.db row found in sqlite_sync table for this database');
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
