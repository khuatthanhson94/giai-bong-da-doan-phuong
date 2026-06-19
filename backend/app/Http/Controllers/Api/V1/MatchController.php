<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\Contracts\MatchRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    public function __construct(private readonly MatchRepositoryInterface $matchRepository)
    {
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->has('tournament_id')) {
            return response()->json(
                $this->matchRepository->getByTournament(
                    (int) $request->tournament_id,
                    $request->input('group_id')
                )
            );
        }

        return response()->json($this->matchRepository->paginate());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tournament_id' => 'required|exists:tournaments,id',
            'home_team_id' => 'required|exists:teams,id',
            'away_team_id' => 'required|exists:teams,id|different:home_team_id',
            'scheduled_at' => 'nullable|date',
            'venue' => 'nullable|string',
            'round' => 'nullable|integer',
        ]);

        return response()->json($this->matchRepository->create($data), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(
            $this->matchRepository->findOrFail($id, ['homeTeam', 'awayTeam', 'events', 'tournament'])
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return response()->json($this->matchRepository->update($id, $request->all()));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->matchRepository->delete($id);

        return response()->json(['message' => 'Đã xóa trận đấu.']);
    }
}
