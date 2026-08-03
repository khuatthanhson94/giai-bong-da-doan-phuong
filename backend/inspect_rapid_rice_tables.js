import pg from 'pg';
const { Client } = pg;

const url = 'postgresql://neondb_owner:npg_BoQrt5haT7Fe@ep-rapid-rice-az2ir2s8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Inspecting all tables in ep-rapid-rice-az2ir2s8...');
  const client = new Client({ connectionString: url });
  await client.connect();

  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
  `);

  console.log('📋 All tables:', tables.rows);

  for (const row of tables.rows) {
    const tName = row.table_name;
    const count = await client.query(`SELECT count(*) FROM "${tName}"`);
    console.log(`  - Table "${tName}": ${count.rows[0].count} rows`);
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
