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

const urls = [
  'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

async function main() {
  for (const url of urls) {
    const host = url.split('@')[1].split('/')[0];
    console.log(`\n--- Checking Neon Host: ${host} ---`);
    try {
      const client = new Client({ connectionString: url });
      await client.connect();
      const allRows = await client.query('SELECT key, data, updated_at FROM sqlite_sync');
      for (const r of allRows.rows) {
        if (r.data) {
          const tmpFile = `./data/tmp_${host}_${r.key}.db`;
          fs.writeFileSync(tmpFile, r.data);
          try {
            const db = new DatabaseSync(tmpFile);
            const teams = db.prepare('SELECT count(*) as c FROM teams').get().c;
            const matches = db.prepare('SELECT count(*) as c FROM matches').get().c;
            const finished = db.prepare("SELECT count(*) as c FROM matches WHERE status = 'finished'").get().c;
            console.log(`   Key: ${r.key} (Updated: ${r.updated_at}) => Teams: ${teams}, Matches: ${matches}, Finished Matches: ${finished}`);
            if (teams >= 10 || matches >= 20) {
              const teamList = db.prepare('SELECT name FROM teams').all().map(t => t.name);
              console.log(`   Teams List (${teams}):`, teamList.join(', '));
            }
          } catch(e) {
            console.log(`   Key: ${r.key} invalid sqlite: ${e.message}`);
          }
        }
      }
      await client.end();
    } catch(e) {
      console.error(`Error connecting to ${host}:`, e.message);
    }
  }
}

main().catch(err => console.error(err));
