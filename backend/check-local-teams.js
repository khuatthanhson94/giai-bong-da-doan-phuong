import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');

const db = new DatabaseSync(DB_FILE);
const teams = db.prepare('SELECT id, name, logo FROM teams').all();

console.log('📋 Local database teams:');
for (const team of teams) {
  console.log(`  Team ${team.id}: name="${team.name}", logo="${team.logo}"`);
}

db.close();
