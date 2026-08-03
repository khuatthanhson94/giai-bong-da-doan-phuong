import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_BoQrt5haT7Fe@ep-rapid-rice-az2ir2s8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync');
  console.log('📋 Keys in sqlite_sync:');
  console.table(res.rows);

  await client.end();
}

main().catch(err => console.error(err));
