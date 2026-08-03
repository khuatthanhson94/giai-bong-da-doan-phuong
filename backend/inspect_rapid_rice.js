import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const rapidRiceUrl = 'postgresql://neondb_owner:npg_BoQrt5haT7Fe@ep-rapid-rice-az2ir2s8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon database (ep-rapid-rice-az2ir2s8)...');
  const client = new Client({ connectionString: rapidRiceUrl });
  await client.connect();

  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('📋 Existing Neon tables:', tables.rows.map(r => r.table_name));

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length > 0 && res.rows[0].data) {
    const buf = res.rows[0].data;
    console.log(`📥 Downloaded ${buf.length} bytes from ep-rapid-rice (Updated at: ${res.rows[0].updated_at})`);

    fs.writeFileSync('./backend/rapid_rice_download.db', buf);
    const db = new DatabaseSync('./backend/rapid_rice_download.db');

    console.log('\n=== TEAMS ===');
    const teams = db.prepare('SELECT id, name FROM teams').all();
    console.table(teams);

    console.log('\n=== GROUPS ===');
    const groups = db.prepare('SELECT id, name FROM groups').all();
    console.table(groups);

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

  } else {
    console.log('⚠️ No tournament.db row found in sqlite_sync table for ep-rapid-rice');
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
