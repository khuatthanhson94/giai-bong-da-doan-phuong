-- =============================================================================
-- SCHEMA OVERVIEW — Giải Bóng đá Đoàn phường
-- Tài liệu tham chiếu cấu trúc database (PostgreSQL)
-- Laravel migrations là nguồn chính thức; file này mô tả thiết kế tổng thể
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CORE: Người dùng & Phân quyền
-- -----------------------------------------------------------------------------

-- users: Tài khoản quản trị
--   id UUID PK
--   username VARCHAR UNIQUE
--   email VARCHAR UNIQUE
--   password_hash VARCHAR
--   full_name VARCHAR
--   avatar VARCHAR NULL
--   is_active BOOLEAN DEFAULT true
--   last_login_at TIMESTAMP NULL
--   created_at, updated_at, deleted_at (soft delete)

-- roles: Vai trò hệ thống
--   id, name (super_admin|admin|organizer|scorekeeper|mc|media|editor|viewer)
--   display_name, description

-- role_user: Pivot user ↔ role (many-to-many)
-- permissions: Quyền chi tiết (RBAC)
-- permission_role: Pivot role ↔ permission

-- refresh_tokens: JWT refresh token rotation
--   id, user_id FK, token_hash, expires_at, revoked_at

-- -----------------------------------------------------------------------------
-- TOURNAMENT: Giải đấu & Mùa giải
-- -----------------------------------------------------------------------------

-- seasons: Mùa giải
--   id UUID PK
--   name VARCHAR (vd: "Mùa giải 2026")
--   year INTEGER
--   logo, banner VARCHAR NULL
--   description TEXT NULL
--   status ENUM(draft|active|completed|archived)
--   start_date, end_date DATE NULL
--   created_at, updated_at, deleted_at

-- tournaments: Giải đấu (nhiều giải song song)
--   id UUID PK
--   season_id FK → seasons
--   name VARCHAR (vd: "Giải bóng đá Thanh niên")
--   slug VARCHAR UNIQUE
--   logo, banner VARCHAR NULL
--   description TEXT NULL
--   format ENUM(round_robin|league|knockout|group_knockout|double_round)
--   points_win INTEGER DEFAULT 3
--   points_draw INTEGER DEFAULT 1
--   points_loss INTEGER DEFAULT 0
--   advance_count INTEGER DEFAULT 2  -- số đội đi tiếp mỗi bảng
--   status ENUM(draft|registration|active|completed)
--   settings JSONB  -- cấu hình mở rộng
--   created_at, updated_at, deleted_at

-- groups: Bảng đấu trong giải
--   id UUID PK
--   tournament_id FK
--   name VARCHAR (A, B, C...)
--   sort_order INTEGER

-- group_team: Pivot group ↔ team
--   group_id FK, team_id FK, seed INTEGER NULL

-- -----------------------------------------------------------------------------
-- TEAMS & PLAYERS
-- -----------------------------------------------------------------------------

-- teams: Đội bóng
--   id UUID PK
--   tournament_id FK
--   name VARCHAR
--   slug VARCHAR
--   logo, banner VARCHAR NULL
--   captain_name, coach_name VARCHAR NULL
--   jersey_color VARCHAR DEFAULT '#0066CC'
--   description TEXT NULL
--   created_at, updated_at, deleted_at

-- players: Cầu thủ
--   id UUID PK
--   team_id FK → teams (CASCADE DELETE)
--   full_name VARCHAR
--   dob DATE NULL
--   jersey_number INTEGER NULL
--   position ENUM(GK|DF|MF|FW) NULL
--   height_cm, weight_kg DECIMAL NULL
--   photo VARCHAR NULL
--   goals, assists, yellow_cards, red_cards INTEGER DEFAULT 0
--   created_at, updated_at, deleted_at

-- -----------------------------------------------------------------------------
-- MATCHES & RESULTS
-- -----------------------------------------------------------------------------

-- venues: Sân thi đấu
--   id, name, address, capacity, image

-- matches: Trận đấu
--   id UUID PK
--   tournament_id FK
--   group_id FK NULL
--   round VARCHAR (vd: "Vòng bảng", "Tứ kết")
--   round_number INTEGER
--   match_number INTEGER
--   match_date DATE
--   match_time TIME
--   venue_id FK NULL
--   team_home_id FK → teams
--   team_away_id FK → teams
--   score_home, score_away INTEGER NULL
--   status ENUM(scheduled|live|halftime|finished|postponed|cancelled)
--   motm_player_id FK NULL
--   notes TEXT NULL
--   is_published BOOLEAN DEFAULT false
--   live_started_at, live_ended_at TIMESTAMP NULL
--   created_at, updated_at, deleted_at

-- match_events: Sự kiện trận đấu (bàn thắng, thẻ, thay người...)
--   id UUID PK
--   match_id FK CASCADE
--   player_id FK NULL
--   team_id FK
--   event_type ENUM(goal|own_goal|penalty|assist|yellow_card|red_card|substitution)
--   minute INTEGER
--   extra_minute INTEGER NULL
--   metadata JSONB NULL
--   created_at

-- match_lineups: Đội hình ra sân
--   match_id FK, player_id FK, team_id FK, is_starter BOOLEAN, position

-- player_votes: Bình chọn MVP công khai
--   match_id FK, player_id FK, voter_ip, created_at

-- standings: Bảng xếp hạng (materialized / computed)
--   tournament_id, group_id, team_id
--   played, won, drawn, lost
--   goals_for, goals_against, goal_diff, points
--   rank INTEGER
--   tiebreak_data JSONB

-- brackets: Nhánh knockout
--   tournament_id FK, round_name, match_id FK, position JSONB

-- -----------------------------------------------------------------------------
-- CONTENT: Tin tức, Thư viện, Nhà tài trợ
-- -----------------------------------------------------------------------------

-- news: Tin tức
--   id UUID PK
--   tournament_id FK NULL (null = tin chung)
--   title, slug UNIQUE
--   excerpt TEXT NULL
--   content TEXT (HTML/Markdown)
--   featured_image VARCHAR NULL
--   video_url VARCHAR NULL
--   category ENUM(general|match|team|announcement)
--   seo_title, seo_description, seo_keywords
--   author_id FK → users
--   is_published BOOLEAN DEFAULT false
--   published_at TIMESTAMP NULL
--   created_at, updated_at, deleted_at

-- gallery_albums: Album ảnh/video
--   id, tournament_id FK NULL, title, slug, cover_image, sort_order

-- gallery_items: Ảnh/video trong album
--   id, album_id FK, title, file_url, thumbnail_url
--   type ENUM(image|video), sort_order
--   created_at, updated_at, deleted_at

-- sponsors: Nhà tài trợ
--   id, tournament_id FK NULL
--   name, logo, website_url
--   tier ENUM(diamond|gold|silver|partner)
--   sort_order, is_active

-- pages: Trang tĩnh (Giới thiệu, Điều lệ...)
--   id, slug UNIQUE, title, content, is_published

-- settings: Cấu hình hệ thống (key-value)
--   key VARCHAR PK, value TEXT, group_name VARCHAR

-- -----------------------------------------------------------------------------
-- SYSTEM: Audit, Recycle Bin, Notifications
-- -----------------------------------------------------------------------------

-- audit.audit_logs: Nhật ký hệ thống
--   id BIGSERIAL PK
--   user_id FK NULL
--   action VARCHAR (create|update|delete|login|publish...)
--   entity_type VARCHAR (team|player|match|news...)
--   entity_id UUID
--   old_values JSONB NULL
--   new_values JSONB NULL
--   ip_address INET
--   user_agent TEXT
--   created_at TIMESTAMP

-- recycle_bin: Thùng rác (soft delete 30 ngày)
--   id UUID PK
--   entity_type, entity_id
--   entity_data JSONB  -- snapshot dữ liệu
--   deleted_by FK → users
--   deleted_at TIMESTAMP
--   expires_at TIMESTAMP  -- deleted_at + 30 days

-- notifications: Thông báo push/in-app
--   id, user_id FK NULL, type, title, body, data JSONB
--   read_at TIMESTAMP NULL, created_at

-- import_jobs: Theo dõi import Excel/CSV
--   id, user_id FK, file_path, status, errors JSONB, created_at

-- INDEXES (đề xuất)
-- CREATE INDEX idx_matches_tournament_date ON matches(tournament_id, match_date);
-- CREATE INDEX idx_players_team ON players(team_id);
-- CREATE INDEX idx_news_slug ON news(slug);
-- CREATE INDEX idx_audit_entity ON audit.audit_logs(entity_type, entity_id);
-- CREATE INDEX idx_teams_name_trgm ON teams USING gin(name gin_trgm_ops);
