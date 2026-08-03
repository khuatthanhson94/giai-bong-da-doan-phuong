import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_E5KjxWXNAo2M@ep-soft-credit-azu5s02r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon (ep-soft-credit-azu5s02r)...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
  `);
  console.log('📋 All tables in Neon:', res.rows);

  const syncRes = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync');
  console.log('📋 sqlite_sync rows:', syncRes.rows);

  await client.end();
}

main().catch(err => console.error(err));
