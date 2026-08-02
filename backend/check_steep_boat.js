import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

let DatabaseSync;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  const betterSqlite = await import('better-sqlite3');
  DatabaseSync = betterSqlite.default;
}

const steepBoatUrl = 'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to new Neon database (ep-steep-boat-az2o0ij7)...');
  const client = new Client({ connectionString: steepBoatUrl });
  await client.connect();

  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('📋 Existing Neon tables:', tables.rows.map(r => r.table_name));

  const res = await client.query('SELECT key, data, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length > 0 && res.rows[0].data) {
    const buf = res.rows[0].data;
    console.log(`📥 Downloaded ${buf.length} bytes from ep-steep-boat (Updated at: ${res.rows[0].updated_at})`);
    
    if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/tournament.db', buf);
    fs.writeFileSync('./backend/tournament.db', buf);
    console.log('✅ Overwrote ./data/tournament.db & ./backend/tournament.db with download!');

    const db = new DatabaseSync('./backend/tournament.db');
    const teams = db.prepare('SELECT id, name FROM teams').all();
    const matches = db.prepare('SELECT id, round, team_a_id, team_b_id, score_a, score_b, status FROM matches').all();
    const finishedMatches = db.prepare("SELECT count(*) as c FROM matches WHERE status = 'finished'").get().c;

    console.log(`📊 Data Summary: ${teams.length} Teams, ${matches.length} Total Matches, ${finishedMatches} Finished Matches`);
    console.log('⚽ All Teams:');
    console.table(teams);

    console.log('⚽ All Matches:');
    console.table(matches);
  } else {
    console.log('⚠️ No tournament.db row found in sqlite_sync table for this database');
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
