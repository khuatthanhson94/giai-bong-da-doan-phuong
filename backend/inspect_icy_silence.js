import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const icySilenceUrl = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-icy-silence-azm8cc4x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon database (ep-icy-silence-azm8cc4x)...');
  const client = new Client({ connectionString: icySilenceUrl });
  await client.connect();

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length === 0 || !res.rows[0].data) {
    console.log('⚠️ No sqlite_sync row in ep-icy-silence-azm8cc4x');
    await client.end();
    return;
  }

  const buf = res.rows[0].data;
  console.log(`📥 Downloaded ${buf.length} bytes from ep-icy-silence (Updated at: ${res.rows[0].updated_at})`);

  fs.writeFileSync('./backend/icy_silence_download.db', buf);
  const db = new DatabaseSync('./backend/icy_silence_download.db');

  console.log('\n=== TEAMS IN ICY SILENCE ===');
  console.table(db.prepare('SELECT id, name FROM teams').all());

  console.log('\n=== ALL MATCHES IN ICY SILENCE ===');
  const matches = db.prepare(`
    SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
  `).all();
  console.table(matches);

  console.log(`Total Matches: ${matches.length}`);
  const finishedMatches = matches.filter(x => x.score_a !== null || x.score_b !== null || x.status === 'finished');
  console.log(`Finished Matches Count: ${finishedMatches.length}`);
  console.table(finishedMatches);

  const playersCount = db.prepare('SELECT count(*) as c FROM players').get().c;
  const goalsCount = db.prepare('SELECT count(*) as c FROM goals').get().c;
  console.log('\n=== STATS ===');
  console.log('Players count:', playersCount);
  console.log('Goals count:', goalsCount);

  if (matches.length >= 18) {
    console.log('✅ Found 18+ matches! Updating local tournament.db and syncing to all Neon nodes...');
    fs.writeFileSync('./backend/tournament.db', buf);
    if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/tournament.db', buf);

    const neonUrls = [
      icySilenceUrl,
      'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-spring-surf-az37ejml-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-late-field-azr87wgo-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_E5KjxWXNAo2M@ep-soft-credit-azu5s02r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-wispy-breeze-azkn20cn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    ];

    for (const nUrl of neonUrls) {
      try {
        const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
        console.log(`📡 Uploading 18-match DB to Neon [${dbHost}]...`);
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

        console.log(`🎉 Successfully synced 18-match DB to Neon [${dbHost}]!`);
        await nClient.end();
      } catch (e) {
        console.error(`❌ Sync error for ${nUrl}:`, e.message);
      }
    }
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
