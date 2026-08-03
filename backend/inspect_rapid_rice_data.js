import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const url = 'postgresql://neondb_owner:npg_BoQrt5haT7Fe@ep-rapid-rice-az2ir2s8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Downloading database from ep-rapid-rice-az2ir2s8...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  const buf = res.rows[0].data;

  fs.writeFileSync('./backend/rapid_rice.db', buf);
  console.log(`📥 Downloaded ${buf.length} bytes to ./backend/rapid_rice.db`);

  const db = new DatabaseSync('./backend/rapid_rice.db');

  console.log('\n=== TEAMS ===');
  console.table(db.prepare('SELECT id, name FROM teams').all());

  console.log('\n=== GROUPS ===');
  console.table(db.prepare('SELECT id, name FROM groups').all());

  console.log('\n=== MATCHES WITH SCORES ===');
  const matches = db.prepare(`
    SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all();
  console.table(matches);

  const finishedMatches = db.prepare("SELECT count(*) as c FROM matches WHERE status = 'finished'").get().c;
  console.log(`\n📊 Matches Summary: Total=${matches.length}, Finished=${finishedMatches}`);
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
