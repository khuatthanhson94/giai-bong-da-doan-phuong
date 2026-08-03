import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-icy-silence-azm8cc4x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to ep-icy-silence-azm8cc4x...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
  `);
  console.log('📋 Existing tables in ep-icy-silence:', tables.rows);

  for (const row of tables.rows) {
    const tName = row.table_name;
    const countRes = await client.query(`SELECT count(*) FROM "${tName}"`);
    console.log(`  - Table "${tName}": ${countRes.rows[0].count} rows`);
  }

  await client.end();
}

main().catch(err => console.error(err));
