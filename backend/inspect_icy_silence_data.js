import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const url = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-icy-silence-azm8cc4x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Downloading database from ep-icy-silence-azm8cc4x...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  const buf = res.rows[0].data;
  console.log(`📥 Downloaded ${buf.length} bytes`);

  fs.writeFileSync('./backend/icy_silence.db', buf);
  const db = new DatabaseSync('./backend/icy_silence.db');

  console.log('\n=== TEAMS IN ICY SILENCE ===');
  console.table(db.prepare('SELECT id, name FROM teams').all());

  console.log('\n=== MATCHES IN ICY SILENCE ===');
  const matches = db.prepare(`
    SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all();
  console.table(matches);

  console.log(`Total matches in ICY SILENCE: ${matches.length}`);
  const finished = matches.filter(x => x.score_a !== null || x.score_b !== null || x.status === 'finished');
  console.log(`Finished matches in ICY SILENCE: ${finished.length}`);

  console.log('\n=== STATS ===');
  console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
  console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
