import { db } from './src/db.js';

const tId = 1;

const config = {
  startingRound: 'Tứ kết',
  advancingCount: 8,
  startingMatches: [
    { id: 'QF1', home: { type: 'rank', groupId: 117, rank: 1 }, away: { type: 'rank', groupId: 119, rank: 2 }, match_date: '2026-08-03', match_time: '08:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' },
    { id: 'QF2', home: { type: 'rank', groupId: 118, rank: 1 }, away: { type: 'best_third', rank: 1 }, match_date: '2026-08-03', match_time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện' },
    { id: 'QF3', home: { type: 'rank', groupId: 119, rank: 1 }, away: { type: 'best_third', rank: 2 }, match_date: '2026-08-03', match_time: '15:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' },
    { id: 'QF4', home: { type: 'rank', groupId: 117, rank: 2 }, away: { type: 'rank', groupId: 118, rank: 2 }, match_date: '2026-08-03', match_time: '15:00', venue: 'Sân 2 - Sân bóng Tùng Thiện' }
  ],
  nextRounds: [
    {
      round: 'Bán kết',
      matches: [
        { id: 'SF1', home: { type: 'winner', matchId: 'QF1' }, away: { type: 'winner', matchId: 'QF2' }, match_date: '2026-08-05', match_time: '08:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' },
        { id: 'SF2', home: { type: 'winner', matchId: 'QF3' }, away: { type: 'winner', matchId: 'QF4' }, match_date: '2026-08-05', match_time: '15:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' }
      ]
    },
    {
      round: 'Chung kết',
      matches: [
        { id: 'F1', home: { type: 'winner', matchId: 'SF1' }, away: { type: 'winner', matchId: 'SF2' }, match_date: '2026-08-07', match_time: '15:00', venue: 'Sân 1 - Sân bóng Tùng Thiện' }
      ]
    }
  ]
};

// 1. Save config to settings table
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`knockout_bracket_config_${tId}`, JSON.stringify(config));

// 2. Delete existing non-finished knockout matches
db.prepare("DELETE FROM matches WHERE round IN ('Tứ kết', 'Bán kết', 'Chung kết') AND status != 'finished' AND tournament_id = ?").run(tId);

// 3. Insert the 4 Quarter-final matches
const qfMatches = [
  { round: 'Tứ kết', match_date: '2026-08-03', match_time: '08:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', team_a_id: 103, team_b_id: 107, notes: 'KO_ID: QF1' },
  { round: 'Tứ kết', match_date: '2026-08-03', match_time: '08:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', team_a_id: 100, team_b_id: 111, notes: 'KO_ID: QF2' },
  { round: 'Tứ kết', match_date: '2026-08-03', match_time: '15:00', venue: 'Sân 1 - Sân bóng Tùng Thiện', team_a_id: 104, team_b_id: 108, notes: 'KO_ID: QF3' },
  { round: 'Tứ kết', match_date: '2026-08-03', match_time: '15:00', venue: 'Sân 2 - Sân bóng Tùng Thiện', team_a_id: 102, team_b_id: 101, notes: 'KO_ID: QF4' }
];

for (const m of qfMatches) {
  db.prepare(`
    INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, tournament_id, status, notes, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 1)
  `).run(m.round, m.match_date, m.match_time, m.venue, m.team_a_id, m.team_b_id, tId, m.notes);
}

console.log('🎉 Successfully created 4 Quarter-final knockout matches!');
