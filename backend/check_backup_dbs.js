import { DatabaseSync } from 'node:sqlite';

const files = [
  './backend/data/backups/backup-2026-07-29T14-26-47.db',
  './backend/data/backups/backup-2026-07-30T22-55-29.db',
  './backend/tournament-export.db',
  './scratch/tournament_backup.db',
  './server/data/tournament.db'
];

for (const f of files) {
  try {
    const db = new DatabaseSync(f);
    const teams = db.prepare('SELECT count(*) as c FROM teams').get().c;
    const matches = db.prepare('SELECT count(*) as c FROM matches').get().c;
    console.log(`File ${f} => Teams: ${teams}, Matches: ${matches}`);
    if (teams >= 10) {
      const teamList = db.prepare('SELECT name FROM teams').all().map(t => t.name);
      console.log(`   Teams List (${teams}):`, teamList.join(', '));
    }
  } catch (e) {
    console.log(`File ${f} error:`, e.message);
  }
}
