import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Inspecting schemas and tables in ep-royal-paper-azh7uc1w...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
  `);

  console.log('📋 Existing tables:');
  console.table(tables.rows);

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
