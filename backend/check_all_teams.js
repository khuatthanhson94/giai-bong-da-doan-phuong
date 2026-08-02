import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/tournament.db');
const teams = db.prepare('SELECT id, name, deleted_at FROM teams').all();
console.log('All Teams in Database (Count:', teams.length, '):');
console.table(teams);

const matches = db.prepare('SELECT id, round, team_a_id, team_b_id, score_a, score_b, status FROM matches').all();
console.log('\nAll Matches in Database (Count:', matches.length, '):');
console.table(matches);

const groups = db.prepare('SELECT id, name FROM groups').all();
console.log('\nAll Groups in Database (Count:', groups.length, '):');
console.table(groups);
