<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\TournamentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentController extends Controller
{
    public function __construct(private readonly TournamentService $tournamentService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->tournamentService->list($request->all()));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'season_id' => 'required|exists:seasons,id',
            'name' => 'required|string|max:255',
            'format' => 'nullable|string',
            'logo' => 'nullable|string',
            'banner' => 'nullable|string',
            'points_config' => 'nullable|array',
            'advancement_rules' => 'nullable|array',
        ]);

        $tournament = $this->tournamentService->create($data);

        return response()->json($tournament, 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->tournamentService->get($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return response()->json($this->tournamentService->update($id, $request->all()));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->tournamentService->delete($id);

        return response()->json(['message' => 'Đã xóa giải đấu.']);
    }

    public function publish(int $id): JsonResponse
    {
        return response()->json($this->tournamentService->publish($id));
    }
}
