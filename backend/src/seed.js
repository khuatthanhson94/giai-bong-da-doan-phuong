import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';

initDatabase();

const settings = [
  ['tournament_name', 'Giải Bóng đá Thanh niên Đoàn phường 2026'],
  ['slogan', 'Đoàn kết - Kỷ luật - Sáng tạo - Thành công'],
  ['banner', ''],
  ['union_logo', ''],
  ['contact_phone', '0123 456 789'],
  ['contact_email', 'doanphuong@example.com'],
  ['contact_address', 'UBND Phường, Quận/Huyện, Tỉnh/TP'],
  ['about', 'Giải bóng đá Thanh niên do Đoàn phường tổ chức nhằm tạo sân chơi lành mạnh, rèn luyện thể chất và tinh thần đoàn kết cho thanh niên trên địa bàn phường.'],
  ['livestream_url', ''],
];

const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of settings) upsert.run(k, v);

const adminHash = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, role) VALUES ('admin', ?, 'super_admin')
`).run(adminHash);

db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, role) VALUES ('bientap', ?, 'editor')
`).run(bcrypt.hashSync('bientap123', 10));

db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, role) VALUES ('nhapketqua', ?, 'scorekeeper')
`).run(bcrypt.hashSync('ketqua123', 10));

const teams = [
  { name: 'Thanh niên Phường A', color: '#0066CC', desc: 'Đội bóng trẻ năng động của phường A' },
  { name: 'Liên chi ĐH Kinh tế', color: '#00A651', desc: 'Sinh viên đam mê bóng đá' },
  { name: 'CLB Thể thao 26/3', color: '#FF6600', desc: 'Câu lạc bộ thể thao truyền thống' },
  { name: 'Đoàn Khu phố 1', color: '#CC0000', desc: 'Đội bóng khu phố mạnh mẽ' },
  { name: 'FC Thanh Xuân', color: '#6600CC', desc: 'Đội bóng phong trào' },
  { name: 'Đoàn Khu phố 5', color: '#0099CC', desc: 'Tập hợp thanh niên nhiệt huyết' },
];

const insertTeam = db.prepare('INSERT INTO teams (name, jersey_color, description) VALUES (?, ?, ?)');
const teamIds = [];
for (const t of teams) {
  const r = insertTeam.run(t.name, t.color, t.desc);
  teamIds.push(r.lastInsertRowid);
}

const positions = ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'];
const names = [
  ['Nguyễn Văn An', 'Trần Minh Bảo', 'Lê Hoàng Cường', 'Phạm Đức Dũng', 'Hoàng Văn Em'],
  ['Vũ Thành Phong', 'Đặng Quốc Huy', 'Bùi Minh Khang', 'Ngô Văn Long', 'Dương Thế Mạnh'],
  ['Trịnh Văn Nam', 'Lý Quốc Oanh', 'Mai Văn Phúc', 'Cao Đình Quân', 'Tạ Hoàng Sơn'],
  ['Võ Minh Tài', 'Đinh Văn Uy', 'Hồ Quang Vinh', 'Lương Văn Xuân', 'Chu Minh Yên'],
  ['Bạch Văn Anh', 'Kiều Minh Bình', 'Phan Hoàng Chi', 'Quách Văn Dũng', 'Tô Minh Đức'],
  ['Lâm Văn Hải', 'Mạc Quốc Hùng', 'Nghiêm Văn Kiên', 'Ông Minh Lâm', 'Phùng Văn Mạnh'],
];

const insertPlayer = db.prepare(`
  INSERT INTO players (team_id, name, jersey_number, position) VALUES (?, ?, ?, ?)
`);
for (let i = 0; i < teamIds.length; i++) {
  for (let j = 0; j < 5; j++) {
    insertPlayer.run(teamIds[i], names[i][j], j + 1, positions[j % 4]);
  }
}

const rounds = ['Vòng bảng - Lượt 1', 'Vòng bảng - Lượt 2', 'Bán kết', 'Chung kết'];
const venues = ['Sân Phường A', 'Sân Trung tâm', 'Sân Khu phố 3'];
const insertMatch = db.prepare(`
  INSERT INTO matches (round, match_date, match_time, venue, team_a_id, team_b_id, score_a, score_b, status, published, motm_player_id, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const finished = [
  ['2026-06-01', '08:00', 0, 1, 2, 1, 1, 1, 'Trận đấu kịch tính'],
  ['2026-06-01', '10:00', 2, 3, 1, 0, 1, 1, null],
  ['2026-06-08', '08:00', 0, 2, 3, 2, 1, 1, null],
  ['2026-06-08', '10:00', 4, 5, 2, 1, 1, 1, null],
];

for (const [date, time, a, b, sa, sb, pub, note] of finished) {
  insertMatch.run(rounds[0], date, time, venues[a % 3], teamIds[a], teamIds[b], sa, sb, 'finished', pub, null, note || '');
}

const upcoming = [
  ['2026-06-15', '08:00', 1, 3],
  ['2026-06-15', '10:00', 0, 4],
  ['2026-06-22', '08:00', 2, 5],
  ['2026-06-22', '10:00', 3, 4],
];

for (const [date, time, a, b] of upcoming) {
  insertMatch.run(rounds[1], date, time, venues[a % 3], teamIds[a], teamIds[b], null, null, 'scheduled', 0, null, '');
}

const publishedMatches = db.prepare('SELECT id, team_a_id, team_b_id, score_a, score_b FROM matches WHERE published = 1').all();
const playersByTeam = {};
for (const tid of teamIds) {
  playersByTeam[tid] = db.prepare('SELECT id FROM players WHERE team_id = ?').all(tid).map((p) => p.id);
}

const insertGoal = db.prepare('INSERT INTO goals (match_id, player_id, minute) VALUES (?, ?, ?)');
for (const m of publishedMatches) {
  const scorerA = playersByTeam[m.team_a_id]?.[3];
  const scorerB = playersByTeam[m.team_b_id]?.[3];
  if (m.score_a > 0 && scorerA) insertGoal.run(m.id, scorerA, 23);
  if (m.score_b > 0 && scorerB) insertGoal.run(m.id, scorerB, 67);
}

db.prepare(`
  INSERT OR REPLACE INTO news (title, slug, content, category, published) VALUES
  ('Khai mạc Giải bóng đá Thanh niên 2026', 'khai-mac-2026',
   '<p>Giải bóng đá Thanh niên Đoàn phường 2026 chính thức khai mạc với sự tham gia của 6 đội bóng.</p>', 'khai-mac', 1),
  ('Kết quả Vòng bảng - Lượt 1', 'ket-qua-luot-1',
   '<p>Các trận đấu vòng bảng lượt 1 đã diễn ra sôi nổi với nhiều bàn thắng đẹp mắt.</p>', 'vong-dau', 1)
`).run();

console.log('Seed completed!');
console.log('Admin: admin / admin123');
console.log('Biên tập: bientap / bientap123');
console.log('Nhập kết quả: nhapketqua / ketqua123');
