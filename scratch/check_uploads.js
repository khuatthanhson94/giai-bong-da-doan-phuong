import pg from "pg";
const { Client } = pg;

const url = process.env.SYNC_DATABASE_URL || "postgresql://neondb_owner:npg_AoSJ3em4aosj@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const res = await client.query("SELECT filename, length(data) as size, mime_type, created_at FROM uploaded_files");
    console.log("Uploaded files in Neon:");
    console.log(res.rows);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}

main();
