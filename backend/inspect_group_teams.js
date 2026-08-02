import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/tournament.db');

const list = db.prepare(`
  SELECT g.name as group_name, t.id as team_id, t.name as team_name
  FROM group_teams gt
  JOIN groups g ON gt.group_id = g.id
  JOIN teams t ON gt.team_id = t.id
  ORDER BY g.id, t.id
`).all();

console.table(list);
