import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/tournament.db');

console.log('=== ALL TEAMS (INCLUDING DELETED) ===');
console.table(db.prepare('SELECT id, name, tournament_id, deleted_at FROM teams').all());

console.log('=== ALL GROUPS (INCLUDING DELETED) ===');
console.table(db.prepare('SELECT id, name, tournament_id, deleted_at FROM groups').all());

console.log('=== ALL PLAYERS (INCLUDING DELETED) ===');
console.table(db.prepare('SELECT id, name, team_id, deleted_at FROM players WHERE deleted_at IS NOT NULL').all());

console.log('=== ALL MATCHES (INCLUDING DELETED) ===');
console.table(db.prepare('SELECT id, round, match_date, team_a_id, team_b_id, deleted_at FROM matches WHERE deleted_at IS NOT NULL').all());
