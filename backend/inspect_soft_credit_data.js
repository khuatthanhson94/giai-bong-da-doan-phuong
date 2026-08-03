import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/soft_credit_download.db');

console.log('=== TEAMS IN SOFT CREDIT ===');
console.table(db.prepare('SELECT id, name FROM teams').all());

console.log('=== GROUPS IN SOFT CREDIT ===');
console.table(db.prepare('SELECT id, name FROM groups').all());

console.log('=== GROUP TEAMS IN SOFT CREDIT ===');
console.table(db.prepare(`
  SELECT g.name as group_name, t.id as team_id, t.name as team_name
  FROM group_teams gt
  JOIN groups g ON gt.group_id = g.id
  JOIN teams t ON gt.team_id = t.id
`).all());

console.log('=== MATCHES IN SOFT CREDIT ===');
console.table(db.prepare(`
  SELECT m.id, m.round, m.match_date, m.match_time, ta.name as team_a, tb.name as team_b, m.score_a, m.score_b, m.status 
  FROM matches m
  LEFT JOIN teams ta ON m.team_a_id = ta.id
  LEFT JOIN teams tb ON m.team_b_id = tb.id
`).all());

console.log('=== PLAYERS COUNT ===', db.prepare('SELECT count(*) as c FROM players').get().c);
console.log('=== GOALS COUNT ===', db.prepare('SELECT count(*) as c FROM goals').get().c);
