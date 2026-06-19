<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AiContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(private readonly AiContentService $aiContentService)
    {
    }

    public function generateNews(Request $request): JsonResponse
    {
        $context = $request->validate([
            'topic' => 'required|string',
            'tournament_id' => 'nullable|exists:tournaments,id',
            'match_id' => 'nullable|exists:matches,id',
        ]);

        return response()->json($this->aiContentService->generateNews($context));
    }

    public function generateMatchReport(int $matchId): JsonResponse
    {
        return response()->json($this->aiContentService->generateMatchReport($matchId));
    }
}
