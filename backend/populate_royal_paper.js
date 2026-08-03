import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const buf = fs.readFileSync('./data/tmp_ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech_tournament.db.db');

console.log(`[Populate] Loaded ${buf.length} bytes database file...`);

// Overwrite local databases
fs.writeFileSync('./backend/tournament.db', buf);
fs.writeFileSync('./data/tournament.db', buf);

const royalPaperUrl = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Populating ep-royal-paper-azh7uc1w with 176128 bytes complete database...');
  const client = new Client({ connectionString: royalPaperUrl });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS sqlite_sync (
      key VARCHAR(255) PRIMARY KEY,
      data BYTEA,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.query(`
    INSERT INTO sqlite_sync (key, data, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW();
  `, ['tournament.db', buf]);

  console.log('🎉 Successfully populated ep-royal-paper-azh7uc1w!');
  await client.end();

  // Also populate all other Neon nodes
  const neonUrls = [
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  ];

  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`📡 Uploading database to Neon [${dbHost}]...`);
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
}

main().catch(err => console.error('❌ Error:', err));
