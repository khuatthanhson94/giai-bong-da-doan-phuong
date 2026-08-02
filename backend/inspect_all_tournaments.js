import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/tournament.db');

console.log('--- Tournaments ---');
console.table(db.prepare('SELECT id, name, status, deleted_at FROM tournaments').all());

console.log('--- Groups ---');
console.table(db.prepare('SELECT id, name, tournament_id, deleted_at FROM groups').all());

console.log('--- Teams Count Per Group ---');
const groupTeams = db.prepare(`
  SELECT g.id as group_id, g.name as group_name, g.tournament_id, count(gt.team_id) as team_count
  FROM groups g
  LEFT JOIN group_teams gt ON g.id = gt.group_id
  GROUP BY g.id
`).all();
console.table(groupTeams);

console.log('--- Teams ---');
const teams = db.prepare('SELECT id, name, deleted_at FROM teams').all();
console.table(teams);

console.log('--- Matches Count Per Tournament ---');
console.table(db.prepare('SELECT tournament_id, count(*) as total_matches, sum(case when status="finished" then 1 else 0 end) as finished_matches FROM matches GROUP BY tournament_id').all());
