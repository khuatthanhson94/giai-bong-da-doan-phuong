import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Downloading current database from ep-autumn-math-azd9xhwd...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  const buf = res.rows[0].data;

  fs.writeFileSync('./backend/tmp_check_autumn.db', buf);
  console.log(`📥 Saved ${buf.length} bytes to ./backend/tmp_check_autumn.db`);

  const db = new DatabaseSync('./backend/tmp_check_autumn.db');

  console.log('=== TEAMS ===');
  console.table(db.prepare('SELECT id, name, logo FROM teams').all());

  console.log('=== GROUPS ===');
  console.table(db.prepare('SELECT id, name FROM groups').all());

  console.table(db.prepare(`
    SELECT g.name as group_name, t.id as team_id, t.name as team_name
    FROM group_teams gt
    JOIN groups g ON gt.group_id = g.id
    JOIN teams t ON gt.team_id = t.id
  `).all());

  console.log('=== MATCHES ===');
  console.table(db.prepare(`
    SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all());

  console.log('=== PLAYERS COUNT ===');
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);

  console.log('=== GOALS COUNT ===');
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
