import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const url = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-wispy-breeze-azkn20cn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Downloading data from ep-wispy-breeze-azkn20cn...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length === 0 || !res.rows[0].data) {
    console.log('⚠️ No sqlite_sync row in this database');
    await client.end();
    return;
  }

  const buf = res.rows[0].data;
  console.log(`📥 Downloaded ${buf.length} bytes (Updated at: ${res.rows[0].updated_at})`);

  fs.writeFileSync('./backend/tmp_wispy_check.db', buf);
  const db = new DatabaseSync('./backend/tmp_wispy_check.db');

  console.log('\n=== TEAMS ===');
  const teams = db.prepare('SELECT id, name, logo FROM teams').all();
  console.table(teams);

  console.log('\n=== GROUPS ===');
  const groups = db.prepare('SELECT id, name FROM groups').all();
  console.table(groups);

  console.log('\n=== GROUP TEAMS ===');
  console.table(db.prepare(`
    SELECT g.name as group_name, t.id as team_id, t.name as team_name
    FROM group_teams gt
    JOIN groups g ON gt.group_id = g.id
    JOIN teams t ON gt.team_id = t.id
  `).all());

  console.log('\n=== MATCHES ===');
  console.table(db.prepare(`
    SELECT m.id, m.round, m.match_date, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all());

  console.log('\n=== STATS ===');
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
