export type UserRole =
  | "super_admin"
  | "admin"
  | "organizer"
  | "scorekeeper"
  | "mc"
  | "media"
  | "editor"
  | "viewer";

export interface NewUser {
  username: string;
  password: string;
  role: UserRole;
}

export interface User {
  id: number;
  name?: string;
  email: string;
  username: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface Team {
  id: number;
  name: string;
  logo?: string | null;
  jersey_color?: string;
  description?: string;
  image?: string | null;
  created_at?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  points?: number;
  goals_for?: number;
  goals_against?: number;
  goal_diff?: number;
  players?: Player[];
}

export interface Player {
  id: number;
  team_id: number;
  name: string;
  dob?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  photo?: string | null;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  created_at?: string;
  team?: { id: number; name: string };
  team_name?: string;
  team_logo?: string;
}

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed";

export interface MatchTeam {
  id: number;
  name: string;
  logo?: string | null;
  jersey_color?: string;
}

export interface MatchEvent {
  id?: number;
  match_id?: number;
  player_id: number;
  player_name?: string;
  jersey_number?: number;
  team_name?: string;
  minute: number;
  is_own_goal?: number | boolean;
}

export interface Match {
  id: number;
  round: string;
  match_date: string;
  match_time: string;
  venue: string;
  team_a_id: number;
  team_b_id: number;
  score_a?: number | null;
  score_b?: number | null;
  status: MatchStatus;
  motm_player_id?: number | null;
  notes?: string;
  published?: number | boolean;
  created_at?: string;
  team_a?: MatchTeam;
  team_b?: MatchTeam;
  team_a_name?: string;
  team_a_logo?: string;
  team_b_name?: string;
  team_b_logo?: string;
  goals?: MatchEvent[];
  yellow_cards?: MatchEvent[];
  red_cards?: MatchEvent[];
  motm?: Player | null;
}

export interface Standing {
  team_id: number;
  name: string;
  logo?: string | null;
  jersey_color?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

export interface NewsItem {
  id: number;
  title: string;
  slug: string;
  content?: string;
  image?: string | null;
  video_url?: string | null;
  category?: string;
  published?: number | boolean;
  created_at?: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  image_url?: string | null;
  video_url?: string | null;
  album?: string;
  type?: "image" | "video";
  created_at?: string;
}

export interface Settings {
  [key: string]: string;
}

export interface HomeData {
  settings: Settings;
  latestMatch: Match | null;
  upcomingMatches: Match[];
  news: NewsItem[];
  standings: Standing[];
  topScorers: Player[];
  activeTournament?: { id: number; name: string; slug: string } | null;
}

export interface DashboardData {
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  finishedMatches: number;
  scheduledMatches: number;
  recentNews: NewsItem[];
  standings: Standing[];
  logs: ActivityLog[];
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface Statistics {
  topScorers: Player[];
  topAssists: Player[];
  cleanSheets: { team_name: string; count: number }[];
  totalGoals: number;
  totalMatches: number;
}

export interface GroupAssignment {
  groupId: number;
  teamIds: number[];
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ApiError {
  error: string;
}

export interface MatchResultInput {
  score_a: number;
  score_b: number;
  goals?: { player_id: number; minute: number; is_own_goal?: boolean }[];
  yellow_cards?: { player_id: number; minute: number }[];
  red_cards?: { player_id: number; minute: number }[];
  motm_player_id?: number | null;
  notes?: string;
}

export interface TournamentWizardState {
  step: number;
  seasonName: string;
  tournamentName: string;
  startDate: string;
  endDate: string;
  venue: string;
  format: "round-robin" | "knockout" | "group-knockout";
  numGroups: number;
  teams: Team[];
  groups: GroupAssignment[];
}
