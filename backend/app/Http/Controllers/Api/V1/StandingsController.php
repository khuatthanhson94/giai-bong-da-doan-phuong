<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Standing;
use App\Models\Tournament;
use App\Services\StandingsCalculatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StandingsController extends Controller
{
    public function __construct(private readonly StandingsCalculatorService $standingsCalculator)
    {
    }

    public function index(Request $request, Tournament $tournament): JsonResponse
    {
        $groupId = $request->input('group_id');

        $standings = Standing::query()
            ->with('team')
            ->where('tournament_id', $tournament->id)
            ->when($groupId, fn ($q) => $q->where('tournament_group_id', $groupId))
            ->orderBy('position')
            ->get();

        return response()->json($standings);
    }

    public function recalculate(Tournament $tournament, Request $request): JsonResponse
    {
        $group = $request->input('group_id')
            ? $tournament->groups()->find($request->group_id)
            : null;

        $result = $this->standingsCalculator->calculate($tournament, $group);

        return response()->json([
            'message' => 'Đã tính lại bảng xếp hạng.',
            'standings' => $result,
        ]);
    }
}
