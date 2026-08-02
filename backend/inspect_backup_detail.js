import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/data/backups/backup-2026-07-30T22-55-29.db');
const teams = db.prepare('SELECT * FROM teams').all();
console.log('--- Teams ---');
console.table(teams);

const matches = db.prepare('SELECT id, round, team_a_id, team_b_id, score_a, score_b, status FROM matches').all();
console.log('--- Matches ---');
console.table(matches);

const groups = db.prepare('SELECT id, name FROM groups').all();
console.log('--- Groups ---');
console.table(groups);
