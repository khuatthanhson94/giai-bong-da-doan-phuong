import { Router } from 'express';
import { db, logAction } from '../db.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

const adminOnly = [authRequired, requireRole('admin', 'super_admin')];

// GET: list all soft deleted items
router.get('/', adminOnly, (req, res) => {
  try {
    const teams = db.prepare('SELECT * FROM teams WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    const players = db.prepare(`
      SELECT p.*, t.name as team_name
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.deleted_at IS NOT NULL
      ORDER BY p.deleted_at DESC
    `).all();
    const matches = db.prepare(`
      SELECT m.*, ta.name as team_a_name, tb.name as team_b_name
      FROM matches m
      LEFT JOIN teams ta ON m.team_a_id = ta.id
      LEFT JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC
    `).all();
    const groups = db.prepare('SELECT * FROM groups WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    const news = db.prepare('SELECT * FROM news WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    const sponsors = db.prepare('SELECT * FROM sponsors WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    const seasons = db.prepare('SELECT * FROM seasons WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    const tournaments = db.prepare(`
      SELECT t.*, s.name as season_name
      FROM tournaments t
      LEFT JOIN seasons s ON t.season_id = s.id
      WHERE t.deleted_at IS NOT NULL
      ORDER BY t.deleted_at DESC
    `).all();

    res.json({ teams, players, matches, groups, news, sponsors, seasons, tournaments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: restore an item
router.post('/restore', adminOnly, (req, res) => {
  const { type, id } = req.body;
  if (!type || !id) return res.status(400).json({ error: 'Thiếu loại dữ liệu hoặc ID' });

  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      let itemName = id;

      switch (type) {
        case 'teams': {
          const item = db.prepare('SELECT name FROM teams WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy đội bóng');
          itemName = item.name;
          db.prepare('UPDATE teams SET deleted_at = NULL WHERE id = ?').run(id);
          // Auto restore players of this team that were deleted at/after team deletion
          db.prepare('UPDATE players SET deleted_at = NULL WHERE team_id = ? AND deleted_at IS NOT NULL').run(id);
          break;
        }
        case 'players': {
          const item = db.prepare('SELECT name, team_id FROM players WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy cầu thủ');
          itemName = item.name;
          // Verify if team is deleted. If so, block or restore team? Let's check:
          const team = db.prepare('SELECT deleted_at FROM teams WHERE id = ?').get(item.team_id);
          if (team && team.deleted_at) {
            throw new Error('Đội bóng của cầu thủ này đang nằm trong thùng rác. Hãy khôi phục đội bóng trước.');
          }
          db.prepare('UPDATE players SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        case 'matches': {
          const item = db.prepare('SELECT team_a_id, team_b_id, round FROM matches WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy trận đấu');
          const ta = db.prepare('SELECT name, deleted_at FROM teams WHERE id = ?').get(item.team_a_id);
          const tb = db.prepare('SELECT name, deleted_at FROM teams WHERE id = ?').get(item.team_b_id);
          if ((ta && ta.deleted_at) || (tb && tb.deleted_at)) {
            throw new Error('Một hoặc cả hai đội bóng trong trận đấu này đang ở trong thùng rác. Hãy khôi phục đội bóng trước.');
          }
          itemName = `${ta?.name || 'Đội A'} vs ${tb?.name || 'Đội B'}`;
          db.prepare('UPDATE matches SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        case 'groups': {
          const item = db.prepare('SELECT name FROM groups WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy bảng đấu');
          itemName = item.name;
          db.prepare('UPDATE groups SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        case 'news': {
          const item = db.prepare('SELECT title FROM news WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy tin tức');
          itemName = item.title;
          db.prepare('UPDATE news SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        case 'sponsors': {
          const item = db.prepare('SELECT name FROM sponsors WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy nhà tài trợ');
          itemName = item.name;
          db.prepare('UPDATE sponsors SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        case 'seasons': {
          const item = db.prepare('SELECT name FROM seasons WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy mùa giải');
          itemName = item.name;
          db.prepare('UPDATE seasons SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        case 'tournaments': {
          const item = db.prepare('SELECT name, season_id FROM tournaments WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy giải đấu');
          const season = db.prepare('SELECT deleted_at FROM seasons WHERE id = ?').get(item.season_id);
          if (season && season.deleted_at) {
            throw new Error('Mùa giải chứa giải đấu này đang ở trong thùng rác. Hãy khôi phục mùa giải trước.');
          }
          itemName = item.name;
          db.prepare('UPDATE tournaments SET deleted_at = NULL WHERE id = ?').run(id);
          break;
        }
        default:
          throw new Error('Loại dữ liệu không hợp lệ');
      }

      db.exec('COMMIT');
      logAction(req.user.username, 'RESTORE_ITEM', `Khôi phục thành công ${type}: ${itemName} (ID: ${id})`);
      res.json({ message: 'Khôi phục thành công' });
    } catch (e) {
      db.exec('ROLLBACK');
      res.status(400).json({ error: e.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: permanently delete (purge) an item from recycle bin
router.post('/purge', adminOnly, (req, res) => {
  const { type, id } = req.body;
  if (!type || !id) return res.status(400).json({ error: 'Thiếu loại dữ liệu hoặc ID' });

  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      let itemName = id;

      switch (type) {
        case 'teams': {
          const item = db.prepare('SELECT name FROM teams WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy đội bóng');
          itemName = item.name;
          
          // Cascading hard delete dependencies
          const playerIds = db.prepare('SELECT id FROM players WHERE team_id = ?').all(id).map(p => p.id);
          if (playerIds.length) {
            const ph = playerIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM goals WHERE player_id IN (${ph})`).run(...playerIds);
            db.prepare(`DELETE FROM yellow_cards WHERE player_id IN (${ph})`).run(...playerIds);
            db.prepare(`DELETE FROM red_cards WHERE player_id IN (${ph})`).run(...playerIds);
            db.prepare(`DELETE FROM player_votes WHERE player_id IN (${ph})`).run(...playerIds);
            db.prepare(`UPDATE matches SET motm_player_id = NULL WHERE motm_player_id IN (${ph})`).run(...playerIds);
          }
          db.prepare('DELETE FROM matches WHERE team_a_id = ? OR team_b_id = ?').run(id, id);
          db.prepare('DELETE FROM group_teams WHERE team_id = ?').run(id);
          db.prepare('DELETE FROM players WHERE team_id = ?').run(id);
          db.prepare('DELETE FROM users WHERE team_id = ?').run(id);
          db.prepare('DELETE FROM teams WHERE id = ?').run(id);
          break;
        }
        case 'players': {
          const item = db.prepare('SELECT name FROM players WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy cầu thủ');
          itemName = item.name;

          db.prepare('DELETE FROM goals WHERE player_id = ?').run(id);
          db.prepare('DELETE FROM yellow_cards WHERE player_id = ?').run(id);
          db.prepare('DELETE FROM red_cards WHERE player_id = ?').run(id);
          db.prepare('DELETE FROM player_votes WHERE player_id = ?').run(id);
          db.prepare('UPDATE matches SET motm_player_id = NULL WHERE motm_player_id = ?').run(id);
          db.prepare('DELETE FROM players WHERE id = ?').run(id);
          break;
        }
        case 'matches': {
          const item = db.prepare('SELECT team_a_id, team_b_id, round FROM matches WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy trận đấu');
          const ta = db.prepare('SELECT name FROM teams WHERE id = ?').get(item.team_a_id);
          const tb = db.prepare('SELECT name FROM teams WHERE id = ?').get(item.team_b_id);
          itemName = `${ta?.name || 'Đội A'} vs ${tb?.name || 'Đội B'}`;

          db.prepare('DELETE FROM goals WHERE match_id = ?').run(id);
          db.prepare('DELETE FROM yellow_cards WHERE match_id = ?').run(id);
          db.prepare('DELETE FROM red_cards WHERE match_id = ?').run(id);
          db.prepare('DELETE FROM player_votes WHERE match_id = ?').run(id);
          db.prepare('DELETE FROM matches WHERE id = ?').run(id);
          break;
        }
        case 'groups': {
          const item = db.prepare('SELECT name FROM groups WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy bảng đấu');
          itemName = item.name;
          
          db.prepare('DELETE FROM group_teams WHERE group_id = ?').run(id);
          db.prepare('DELETE FROM groups WHERE id = ?').run(id);
          break;
        }
        case 'news': {
          const item = db.prepare('SELECT title FROM news WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy tin tức');
          itemName = item.title;
          db.prepare('DELETE FROM news WHERE id = ?').run(id);
          break;
        }
        case 'sponsors': {
          const item = db.prepare('SELECT name FROM sponsors WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy nhà tài trợ');
          itemName = item.name;
          db.prepare('DELETE FROM sponsors WHERE id = ?').run(id);
          break;
        }
        case 'seasons': {
          const item = db.prepare('SELECT name FROM seasons WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy mùa giải');
          itemName = item.name;
          
          // Cascading hard delete tournaments
          const tourIds = db.prepare('SELECT id FROM tournaments WHERE season_id = ?').all(id).map(t => t.id);
          if (tourIds.length) {
            for (const tId of tourIds) {
              db.prepare('DELETE FROM teams WHERE tournament_id = ?').run(tId);
              db.prepare('DELETE FROM groups WHERE tournament_id = ?').run(tId);
              db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(tId);
              db.prepare('DELETE FROM news WHERE tournament_id = ?').run(tId);
              db.prepare('DELETE FROM gallery WHERE tournament_id = ?').run(tId);
              db.prepare('DELETE FROM sponsors WHERE tournament_id = ?').run(tId);
              db.prepare('DELETE FROM tournaments WHERE id = ?').run(tId);
            }
          }
          db.prepare('DELETE FROM seasons WHERE id = ?').run(id);
          break;
        }
        case 'tournaments': {
          const item = db.prepare('SELECT name FROM tournaments WHERE id = ?').get(id);
          if (!item) throw new Error('Không tìm thấy giải đấu');
          itemName = item.name;

          db.prepare('DELETE FROM teams WHERE tournament_id = ?').run(id);
          db.prepare('DELETE FROM groups WHERE tournament_id = ?').run(id);
          db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(id);
          db.prepare('DELETE FROM news WHERE tournament_id = ?').run(id);
          db.prepare('DELETE FROM gallery WHERE tournament_id = ?').run(id);
          db.prepare('DELETE FROM sponsors WHERE tournament_id = ?').run(id);
          db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
          break;
        }
        default:
          throw new Error('Loại dữ liệu không hợp lệ');
      }

      db.exec('COMMIT');
      logAction(req.user.username, 'PURGE_ITEM', `Xóa vĩnh viễn ${type}: ${itemName} (ID: ${id}) khỏi hệ thống`);
      res.json({ message: 'Đã xóa vĩnh viễn dữ liệu khỏi hệ thống' });
    } catch (e) {
      db.exec('ROLLBACK');
      res.status(400).json({ error: e.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
