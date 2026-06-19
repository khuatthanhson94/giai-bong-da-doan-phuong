import type { HomeData, Match, NewsItem, Player, Settings, Standing, Team, User } from "./types";

/** Laravel API response shapes (snake_case) */
interface LaravelMatch {
  id: number;
  round?: number | string;
  bracket_position?: string;
  scheduled_at?: string;
  venue?: string;
  home_team_id?: number;
  away_team_id?: number;
  home_score?: number | null;
  away_score?: number | null;
  status?: string;
  mvp_player_id?: number | null;
  notes?: string;
  is_published?: boolean;
  home_team?: { id: number; name: string; logo?: string | null; jersey_color?: string };
  away_team?: { id: number; name: string; logo?: string | null; jersey_color?: string };
}

interface LaravelStanding {
  team_id: number;
  team?: { id: number; name: string; logo?: string | null; jersey_color?: string };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

interface LaravelHome {
  seasons?: unknown[];
  active_tournament?: { id: number; name: string; slug: string } | null;
  upcoming_matches?: LaravelMatch[];
  latest_matches?: LaravelMatch[];
  standings?: LaravelStanding[];
  top_scorers?: LaravelPlayer[];
  featured_news?: LaravelNews[];
  settings?: Record<string, unknown>;
}

interface LaravelPlayer {
  id: number;
  team_id: number;
  name: string;
  dob?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  photo?: string | null;
  goals?: number;
  assists?: number;
  team?: { id: number; name: string; logo?: string | null };
}

interface LaravelNews {
  id: number;
  title: string;
  slug: string;
  content?: string;
  featured_image?: string | null;
  video_url?: string | null;
  category?: string;
  status?: string;
  published_at?: string;
  created_at?: string;
}

interface LaravelUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

function splitDateTime(iso?: string): { match_date: string; match_time: string } {
  if (!iso) return { match_date: "", match_time: "00:00" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { match_date: iso.slice(0, 10), match_time: "00:00" };
  return {
    match_date: d.toISOString().slice(0, 10),
    match_time: d.toTimeString().slice(0, 5),
  };
}

export function adaptMatch(raw: LaravelMatch): Match {
  const { match_date, match_time } = splitDateTime(raw.scheduled_at);
  return {
    id: raw.id,
    round: raw.bracket_position || String(raw.round ?? ""),
    match_date,
    match_time,
    venue: raw.venue ?? "",
    team_a_id: raw.home_team_id ?? raw.home_team?.id ?? 0,
    team_b_id: raw.away_team_id ?? raw.away_team?.id ?? 0,
    score_a: raw.home_score,
    score_b: raw.away_score,
    status: (raw.status as Match["status"]) ?? "scheduled",
    motm_player_id: raw.mvp_player_id,
    notes: raw.notes,
    published: raw.is_published,
    team_a: raw.home_team,
    team_b: raw.away_team,
    team_a_name: raw.home_team?.name,
    team_a_logo: raw.home_team?.logo ?? undefined,
    team_b_name: raw.away_team?.name,
    team_b_logo: raw.away_team?.logo ?? undefined,
  };
}

export function adaptStanding(raw: LaravelStanding): Standing {
  return {
    team_id: raw.team_id,
    name: raw.team?.name ?? "",
    logo: raw.team?.logo,
    jersey_color: raw.team?.jersey_color,
    played: raw.played,
    won: raw.won,
    drawn: raw.drawn,
    lost: raw.lost,
    goals_for: raw.goals_for,
    goals_against: raw.goals_against,
    goal_diff: raw.goal_difference,
    points: raw.points,
  };
}

export function adaptPlayer(raw: LaravelPlayer): Player {
  return {
    id: raw.id,
    team_id: raw.team_id,
    name: raw.name,
    dob: raw.dob,
    jersey_number: raw.jersey_number,
    position: raw.position,
    photo: raw.photo,
    goals: raw.goals,
    assists: raw.assists,
    team: raw.team,
    team_name: raw.team?.name,
    team_logo: raw.team?.logo ?? undefined,
  };
}

export function adaptNews(raw: LaravelNews): NewsItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    image: raw.featured_image,
    video_url: raw.video_url,
    category: raw.category,
    published: raw.status === "published",
    created_at: raw.published_at ?? raw.created_at,
  };
}

export function adaptUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name || raw.username || "",
    email: raw.email || `${raw.username || "user"}@example.com`,
    username: raw.username || raw.email || "",
    role: raw.role as User["role"],
    created_at: raw.created_at,
  };
}

export function adaptSettings(raw: Record<string, unknown> = {}): Settings {
  const out: Settings = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}

export function adaptHome(raw: LaravelHome): HomeData {
  const upcoming = (raw.upcoming_matches ?? []).map(adaptMatch);
  const latest = (raw.latest_matches ?? []).map(adaptMatch);

  return {
    settings: adaptSettings(raw.settings as Record<string, unknown>),
    latestMatch: latest[0] ?? null,
    upcomingMatches: upcoming,
    news: (raw.featured_news ?? []).map(adaptNews),
    standings: (raw.standings ?? []).map(adaptStanding),
    topScorers: (raw.top_scorers ?? []).map(adaptPlayer),
    activeTournament: raw.active_tournament ?? null,
  };
}

export function adaptTeam(raw: any): Team {
  return raw as unknown as Team;
}
