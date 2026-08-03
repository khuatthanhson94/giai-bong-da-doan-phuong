import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

console.log('=== FILE 1: tmp_ep-autumn-math (176128 bytes) ===');
const db1 = new DatabaseSync('./data/tmp_ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech_tournament.db.db');
console.log('Teams:', db1.prepare('SELECT id, name FROM teams').all());
console.log('Groups:', db1.prepare('SELECT id, name FROM groups').all());
console.log('Finished Matches:', db1.prepare("SELECT id, round, team_a_id, team_b_id, score_a, score_b FROM matches WHERE status='finished'").all());
console.log('Goals count:', db1.prepare('SELECT count(*) as c FROM goals').get().c);
console.log('Players count:', db1.prepare('SELECT count(*) as c FROM players').get().c);

console.log('\n=== FILE 2: backup-2026-07-30 (159744 bytes) ===');
const db2 = new DatabaseSync('./backend/data/backups/backup-2026-07-30T22-55-29.db');
console.log('Teams:', db2.prepare('SELECT id, name FROM teams').all());
console.log('Groups:', db2.prepare('SELECT id, name FROM groups').all());
console.log('Finished Matches:', db2.prepare("SELECT id, round, team_a_id, team_b_id, score_a, score_b FROM matches WHERE status='finished'").all());
console.log('Goals count:', db2.prepare('SELECT count(*) as c FROM goals').get().c);
console.log('Players count:', db2.prepare('SELECT count(*) as c FROM players').get().c);
