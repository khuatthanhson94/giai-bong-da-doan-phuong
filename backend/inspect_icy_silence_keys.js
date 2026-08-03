import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-icy-silence-azm8cc4x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to ep-icy-silence-azm8cc4x...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync');
  console.log('📋 Keys in sqlite_sync in ep-icy-silence:', res.rows);

  await client.end();
}

main().catch(err => console.error(err));
