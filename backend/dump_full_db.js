import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/tournament.db');

console.log('=== SEASONS ===');
console.table(db.prepare('SELECT * FROM seasons').all());

console.log('=== TOURNAMENTS ===');
console.table(db.prepare('SELECT * FROM tournaments').all());

console.log('=== GROUPS ===');
console.table(db.prepare('SELECT * FROM groups').all());

console.log('=== TEAMS ===');
console.table(db.prepare('SELECT id, name, tournament_id, deleted_at FROM teams').all());

console.log('=== GROUP TEAMS ===');
console.table(db.prepare(`
  SELECT gt.id, g.name as group_name, t.id as team_id, t.name as team_name 
  FROM group_teams gt 
  JOIN groups g ON gt.group_id = g.id 
  JOIN teams t ON gt.team_id = t.id
`).all());

console.log('=== MATCHES ===');
console.table(db.prepare('SELECT id, round, match_date, match_time, team_a_id, team_b_id, score_a, score_b, status, tournament_id FROM matches').all());
