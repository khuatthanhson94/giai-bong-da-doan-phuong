import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;

const neonUrls = [
  'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-spring-surf-az37ejml-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-late-field-azr87wgo-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_E5KjxWXNAo2M@ep-soft-credit-azu5s02r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-wispy-breeze-azkn20cn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-icy-silence-azm8cc4x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

async function checkNeon() {
  for (const nUrl of neonUrls) {
    const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
    console.log(`📡 Đang kết nối tới Neon Cloud [${dbHost}]...`);
    const client = new Client({ connectionString: nUrl });
    
    try {
      await client.connect();
      const res = await client.query("SELECT key, length(data) as size, updated_at FROM sqlite_sync WHERE key = 'tournament.db'");
      
      if (res.rows.length === 0 || !res.rows[0].data) {
        console.log(`⚠️ Trống dữ liệu ở nút ${dbHost}.`);
        await client.end();
        continue;
      }

      const info = res.rows[0];
      console.log(`✅ Kết nối thành công tới ${dbHost}!`);
      console.log(`📌 Thời điểm cập nhật dữ liệu trên Neon: ${new Date(info.updated_at).toLocaleString('vi-VN')}`);
      console.log(`📦 Dung lượng tệp dữ liệu: ${(info.size / 1024 / 1024).toFixed(2)} MB`);

      const dataRes = await client.query("SELECT data FROM sqlite_sync WHERE key = 'tournament.db'");
      const buf = dataRes.rows[0].data;
      
      fs.writeFileSync('./backend/temp_check.db', buf);
      const db = new DatabaseSync('./backend/temp_check.db');

      console.log('\n🏆 --- DANH SÁCH CÁC ĐỘI BÓNG ---');
      const teams = db.prepare('SELECT id, name FROM teams').all();
      console.table(teams);

      console.log('\n⚽ --- CHI TIẾT CÁC TRẬN ĐẤU VÀ TỈ SỐ ---');
      const matches = db.prepare(`
        SELECT 
          m.id, 
          m.round as 'Vòng đấu', 
          m.match_date as 'Ngày', 
          m.match_time as 'Giờ', 
          COALESCE(ta.name, 'Chưa xác định') as 'Đội A', 
          COALESCE(m.score_a, '-') as 'Tỉ số A', 
          COALESCE(m.score_b, '-') as 'Tỉ số B', 
          COALESCE(tb.name, 'Chưa xác định') as 'Đội B', 
          m.status as 'Trạng thái'
        FROM matches m
        LEFT JOIN teams ta ON m.team_a_id = ta.id
        LEFT JOIN teams tb ON m.team_b_id = tb.id
        ORDER BY m.id ASC
      `).all();
      console.table(matches);

      const playersCount = db.prepare('SELECT count(*) as c FROM players').get().c;
      const goalsCount = db.prepare('SELECT count(*) as c FROM goals').get().c;
      
      console.log('\n📈 --- THỐNG KÊ TỔNG QUAN ---');
      console.log(`- Tổng số Đội bóng: ${teams.length}`);
      console.log(`- Tổng số Trận đấu: ${matches.length}`);
      console.log(`- Tổng số Bàn thắng đã ghi: ${goalsCount}`);
      console.log(`- Tổng số Cầu thủ đã đăng ký: ${playersCount}`);

      try { fs.unlinkSync('./backend/temp_check.db'); } catch (e) {}
      await client.end();
      return; // Success!

    } catch (err) {
      console.error(`❌ Lỗi từ nút ${dbHost}:`, err.message);
      await client.end();
    }
  }
}

checkNeon();
