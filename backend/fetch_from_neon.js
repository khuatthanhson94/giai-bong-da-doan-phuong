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

const restoredBranchUrl = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Restored 10PM Branch (ep-lively-frost-az252nx4)...');
  const client = new Client({ connectionString: restoredBranchUrl });
  await client.connect();

  const res = await client.query('SELECT data, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length > 0 && res.rows[0].data) {
    const buf = res.rows[0].data;
    console.log(`📥 Downloaded ${buf.length} bytes from Restored 10PM Branch (Updated at: ${res.rows[0].updated_at})`);
    
    if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/tournament.db', buf);
    console.log('✅ Overwrote ./data/tournament.db with 10PM Restored Data!');

    const db = new DatabaseSync('./data/tournament.db');
    const teams = db.prepare('SELECT id, name FROM teams').all();
    const matches = db.prepare('SELECT id, team_a_id, team_b_id, score_a, score_b, status FROM matches').all();
    const playersCount = db.prepare('SELECT count(*) as c FROM players').get().c;

    console.log(`📊 10PM Restored Data Contents: ${teams.length} Teams, ${matches.length} Matches, ${playersCount} Players`);
    console.log('⚽ Match Scores (10PM State):');
    console.table(matches.slice(0, 10));
  } else {
    console.log('⚠️ No tournament.db row found in restored branch sqlite_sync table');
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
