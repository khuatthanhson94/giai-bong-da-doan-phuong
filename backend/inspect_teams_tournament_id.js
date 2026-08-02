import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/tournament.db');
const teams = db.prepare('SELECT id, name, tournament_id, deleted_at FROM teams').all();
console.table(teams);
