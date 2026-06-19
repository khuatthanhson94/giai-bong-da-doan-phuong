<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FootballMatch;
use App\Services\MatchResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchResultController extends Controller
{
    public function __construct(private readonly MatchResultService $matchResultService)
    {
    }

    public function updateScore(Request $request, FootballMatch $match): JsonResponse
    {
        $data = $request->validate([
            'home_score' => 'required|integer|min:0',
            'away_score' => 'required|integer|min:0',
            'home_penalty_score' => 'nullable|integer|min:0',
            'away_penalty_score' => 'nullable|integer|min:0',
            'status' => 'nullable|string',
        ]);

        return response()->json($this->matchResultService->updateScore($match, $data));
    }

    public function addEvent(Request $request, FootballMatch $match): JsonResponse
    {
        $data = $request->validate([
            'team_id' => 'required|exists:teams,id',
            'player_id' => 'nullable|exists:players,id',
            'related_player_id' => 'nullable|exists:players,id',
            'type' => 'required|string',
            'minute' => 'nullable|integer|min:0|max:120',
            'description' => 'nullable|string',
        ]);

        return response()->json($this->matchResultService->addEvent($match, $data), 201);
    }

    public function publish(Request $request, FootballMatch $match): JsonResponse
    {
        $data = $request->validate(['mvp_player_id' => 'nullable|exists:players,id']);

        return response()->json(
            $this->matchResultService->publishResult($match, $data['mvp_player_id'] ?? null)
        );
    }

    public function topScorers(Request $request): JsonResponse
    {
        $request->validate(['tournament_id' => 'required|exists:tournaments,id']);

        return response()->json(
            $this->matchResultService->getTopScorers((int) $request->tournament_id)
        );
    }
}
