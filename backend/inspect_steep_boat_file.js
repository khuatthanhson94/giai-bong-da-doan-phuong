import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

const steepFile = './data/tmp_ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech_tournament.db.db';

if (!fs.existsSync(steepFile)) {
  console.log('File not found:', steepFile);
  process.exit(1);
}

const db = new DatabaseSync(steepFile);

console.log('=== STEEP BOAT TEAMS ===');
console.table(db.prepare('SELECT id, name FROM teams WHERE deleted_at IS NULL').all());

console.log('=== STEEP BOAT GROUPS ===');
console.table(db.prepare('SELECT id, name FROM groups WHERE deleted_at IS NULL').all());

console.log('=== STEEP BOAT GROUP TEAMS ===');
console.table(db.prepare(`
  SELECT gt.group_id, g.name as group_name, t.id as team_id, t.name as team_name
  FROM group_teams gt
  JOIN groups g ON gt.group_id = g.id
  JOIN teams t ON gt.team_id = t.id
`).all());

console.log('=== STEEP BOAT MATCHES ===');
console.table(db.prepare('SELECT id, round, match_date, match_time, team_a_id, team_b_id, score_a, score_b, status FROM matches').all());
