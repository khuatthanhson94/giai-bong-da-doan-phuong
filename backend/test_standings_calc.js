import { computeStandings } from './src/services/standings.js';

const s = computeStandings(1);
console.log('Total Teams in Standings:', s.length);
console.table(s.map(x => ({ team_id: x.team_id, name: x.name, group: x.group_name, P: x.played, W: x.won, D: x.drawn, L: x.lost, GF: x.goals_for, GA: x.goals_against, GD: x.goal_diff, Pts: x.points })));
