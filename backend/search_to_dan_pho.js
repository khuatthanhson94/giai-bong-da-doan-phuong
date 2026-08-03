import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dataDir = './data';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.db'));

console.log(`Searching ${files.length} db files in ./data/ for team names...`);

for (const f of files) {
  const p = path.join(dataDir, f);
  try {
    const db = new DatabaseSync(p);
    const teams = db.prepare('SELECT id, name FROM teams').all();
    console.log(`\n📄 ${f} (${teams.length} teams):`);
    console.log(teams.map(t => t.name).join(', '));
  } catch (e) {
    // console.error(f, e.message);
  }
}
