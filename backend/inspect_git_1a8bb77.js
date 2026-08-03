import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./data/git_1a8bb77_tournament.db');

console.log('=== TEAMS IN 16.8 MB DB ===');
console.table(db.prepare('SELECT id, name FROM teams').all());

console.log('=== GROUPS IN 16.8 MB DB ===');
console.table(db.prepare('SELECT id, name FROM groups').all());

console.log('=== GROUP TEAMS IN 16.8 MB DB ===');
console.table(db.prepare(`
  SELECT g.name as group_name, t.id as team_id, t.name as team_name
  FROM group_teams gt
  JOIN groups g ON gt.group_id = g.id
  JOIN teams t ON gt.team_id = t.id
`).all());

console.log('=== MATCHES COUNT IN 16.8 MB DB ===');
console.log('Total matches:', db.prepare('SELECT count(*) as c FROM matches').get().c);
console.log('Finished matches:', db.prepare("SELECT count(*) as c FROM matches WHERE status = 'finished'").get().c);
console.log('Players count:', db.prepare('SELECT count(*) as c FROM players').get().c);
console.log('Goals count:', db.prepare('SELECT count(*) as c FROM goals').get().c);
