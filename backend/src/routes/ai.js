import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/generate', authRequired, async (req, res) => {
  const { prompt, match_id } = req.body;

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
    if (keyRow) apiKey = keyRow.value;
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng cấu hình trong Cài đặt hệ thống.' });
  }

  let finalPrompt = prompt;

  if (match_id) {
    try {
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
      if (!match) return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
      
      const teamA = db.prepare('SELECT name FROM teams WHERE id = ?').get(match.team_a_id);
      const teamB = db.prepare('SELECT name FROM teams WHERE id = ?').get(match.team_b_id);

      const goals = db.prepare(`
        SELECT g.*, p.name as player_name, t.name as team_name
        FROM goals g
        JOIN players p ON g.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE g.match_id = ?
      `).all(match_id);

      const cards = db.prepare(`
        SELECT 'yellow' as type, y.minute, p.name as player_name, t.name as team_name
        FROM yellow_cards y
        JOIN players p ON y.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE y.match_id = ?
        UNION ALL
        SELECT 'red' as type, r.minute, p.name as player_name, t.name as team_name
        FROM red_cards r
        JOIN players p ON r.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        WHERE r.match_id = ?
      `).all(match_id, match_id);

      // Construct dynamic prompt for sports writing
      finalPrompt = `Hãy viết một bài báo đưa tin bóng đá hấp dẫn, kịch tính, phong cách nhà báo thể thao chuyên nghiệp về trận đấu sau:
Trận đấu giữa: ${teamA?.name || 'Đội A'} và ${teamB?.name || 'Đội B'}
Tỷ số chung cuộc: ${match.score_a} - ${match.score_b} (Trạng thái: ${match.status === 'finished' ? 'Đã kết thúc' : 'Đang diễn ra'})
Danh sách ghi bàn: ${goals.length > 0 ? goals.map(g => `${g.player_name} (${g.team_name} - phút ${g.minute})`).join(', ') : 'Không có'}
Thẻ phạt: ${cards.length > 0 ? cards.map(c => `${c.player_name} (${c.team_name} - ${c.type === 'yellow' ? 'Thẻ vàng' : 'Thẻ đỏ'} - phút ${c.minute})`).join(', ') : 'Không có'}
Ghi chú thêm: ${match.notes || 'Không có'}

Yêu cầu bài viết:
1. Có Tiêu đề bài báo hấp dẫn, thu hút người đọc.
2. Nội dung có mở bài, diễn biến trận đấu chi tiết, và kết luận/đánh giá cục diện giải đấu.
3. Độ dài khoảng 300-500 từ.
4. Trả về định dạng Markdown.
5. Viết bằng tiếng Việt.`;
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi khi chuẩn bị dữ liệu trận đấu: ' + err.message });
    }
  }

  if (!finalPrompt) {
    return res.status(400).json({ error: 'Thiếu câu lệnh (prompt) gợi ý viết bài' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: finalPrompt }]
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('Gemini không phản hồi hoặc định dạng phản hồi không hợp lệ');
    }

    logAction(req.user.username, 'AI_GENERATE_CONTENT', `Sinh nội dung bằng AI${match_id ? ' cho trận đấu ID ' + match_id : ''}`);
    res.json({ content: resultText });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi gọi Gemini API: ' + err.message });
  }
});

export default router;
