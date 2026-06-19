<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Enums\MatchStatus;
use App\Models\FootballMatch;
use App\Models\News;
use App\Models\Page;
use App\Models\Player;
use App\Models\Season;
use App\Models\SiteSetting;
use App\Models\Sponsor;
use App\Models\Team;
use App\Models\Tournament;
use App\Repositories\Contracts\MatchRepositoryInterface;
use App\Services\MatchResultService;
use App\Services\SeasonService;
use App\Services\TournamentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function __construct(
        private readonly SeasonService $seasonService,
        private readonly TournamentService $tournamentService,
        private readonly MatchRepositoryInterface $matchRepository,
        private readonly MatchResultService $matchResultService
    ) {
    }

    public function home(): JsonResponse
    {
        $tournament = $this->activeTournament();
        $settings = SiteSetting::query()
            ->where('is_public', true)
            ->get()
            ->mapWithKeys(fn ($s) => [$s->key => $s->getCastedValue()]);

        if ($tournament) {
            $settings = $settings->merge([
                'tournament_name' => $tournament->name,
                'tournament_slug' => $tournament->slug,
                'season_name' => $tournament->season?->name,
            ]);
        }

        return response()->json([
            'seasons' => $this->seasonService->getActive(),
            'active_tournament' => $tournament,
            'upcoming_matches' => $this->matchRepository->getUpcoming(5),
            'latest_matches' => FootballMatch::query()
                ->with(['homeTeam', 'awayTeam'])
                ->where('status', MatchStatus::FINISHED)
                ->where('is_published', true)
                ->when($tournament, fn ($q) => $q->where('tournament_id', $tournament->id))
                ->orderByDesc('scheduled_at')
                ->limit(5)
                ->get(),
            'standings' => $tournament
                ? $tournament->standings()->with('team')->orderBy('position')->get()
                : [],
            'top_scorers' => $tournament
                ? $this->matchResultService->getTopScorers($tournament->id)
                : [],
            'featured_news' => News::query()
                ->where('status', 'published')
                ->where('is_featured', true)
                ->orderByDesc('published_at')
                ->limit(3)
                ->get(),
            'settings' => $settings,
        ]);
    }

    public function teams(Request $request): JsonResponse
    {
        $tournamentId = $request->integer('tournament_id') ?: $this->activeTournament()?->id;

        $query = Team::query()->withCount('players');

        if ($tournamentId) {
            $query->where('tournament_id', $tournamentId);
        }

        if ($search = $request->input('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function team(int $id): JsonResponse
    {
        return response()->json(
            Team::query()->with(['players', 'tournament'])->findOrFail($id)
        );
    }

    public function players(Request $request): JsonResponse
    {
        $query = Player::query()->with('team');

        if ($teamId = $request->integer('team_id')) {
            $query->where('team_id', $teamId);
        } elseif ($tournamentId = $request->integer('tournament_id') ?: $this->activeTournament()?->id) {
            $query->whereHas('team', fn ($q) => $q->where('tournament_id', $tournamentId));
        }

        if ($search = $request->input('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function player(int $id): JsonResponse
    {
        return response()->json(
            Player::query()->with('team')->findOrFail($id)
        );
    }

    public function statistics(Request $request): JsonResponse
    {
        $tournamentId = $request->integer('tournament_id') ?: $this->activeTournament()?->id;

        if (! $tournamentId) {
            return response()->json(['top_scorers' => [], 'total_goals' => 0, 'total_matches' => 0]);
        }

        $topScorers = $this->matchResultService->getTopScorers($tournamentId);
        $totalMatches = FootballMatch::query()
            ->where('tournament_id', $tournamentId)
            ->where('status', MatchStatus::FINISHED)
            ->count();

        return response()->json([
            'top_scorers' => $topScorers,
            'total_goals' => collect($topScorers)->sum('goals'),
            'total_matches' => $totalMatches,
        ]);
    }

    private function activeTournament(): ?Tournament
    {
        return Tournament::query()
            ->with('season')
            ->where('is_published', true)
            ->where('status', 'active')
            ->orderByDesc('updated_at')
            ->first();
    }

    public function seasons(): JsonResponse
    {
        return response()->json($this->seasonService->getActive());
    }

    public function tournament(string $slug): JsonResponse
    {
        $tournament = $this->tournamentService->getBySlug($slug);

        if (! $tournament || ! $tournament->is_published) {
            return response()->json(['message' => 'Không tìm thấy giải đấu.'], 404);
        }

        return response()->json($tournament);
    }

    public function standings(Tournament $tournament): JsonResponse
    {
        return response()->json(
            $tournament->standings()->with('team')->orderBy('position')->get()
        );
    }

    public function fixtures(Tournament $tournament): JsonResponse
    {
        return response()->json($this->matchRepository->getByTournament($tournament->id));
    }

    public function news(Request $request): JsonResponse
    {
        return response()->json(
            News::query()
                ->where('status', 'published')
                ->orderByDesc('published_at')
                ->paginate($request->input('per_page', 12))
        );
    }

    public function newsDetail(string $slug): JsonResponse
    {
        $article = News::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();
        $article->increment('view_count');

        return response()->json($article);
    }

    public function sponsors(Request $request): JsonResponse
    {
        return response()->json(
            Sponsor::query()
                ->where('is_active', true)
                ->when($request->tournament_id, fn ($q, $id) => $q->where('tournament_id', $id))
                ->orderBy('sort_order')
                ->get()
        );
    }

    public function page(string $slug): JsonResponse
    {
        return response()->json(
            Page::query()->where('slug', $slug)->where('is_published', true)->firstOrFail()
        );
    }
}
