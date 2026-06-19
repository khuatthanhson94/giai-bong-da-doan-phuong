<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FootballMatch;
use App\Models\News;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'stats' => [
                'users' => User::query()->count(),
                'tournaments' => Tournament::query()->count(),
                'teams' => Team::query()->count(),
                'matches' => FootballMatch::query()->count(),
                'news' => News::query()->count(),
                'live_matches' => FootballMatch::query()->where('status', 'live')->count(),
            ],
            'recent_matches' => FootballMatch::query()
                ->with(['homeTeam', 'awayTeam'])
                ->orderByDesc('scheduled_at')
                ->limit(5)
                ->get(),
        ]);
    }
}
