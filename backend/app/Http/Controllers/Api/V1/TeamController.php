<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\Contracts\TeamRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function __construct(private readonly TeamRepositoryInterface $teamRepository)
    {
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->has('tournament_id')) {
            return response()->json(
                $this->teamRepository->getByTournament((int) $request->tournament_id)
            );
        }

        return response()->json($this->teamRepository->paginate());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tournament_id' => 'required|exists:tournaments,id',
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:10',
            'logo' => 'nullable|string',
            'coach_name' => 'nullable|string',
            'seed' => 'nullable|integer',
        ]);

        return response()->json($this->teamRepository->create($data), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->teamRepository->findOrFail($id, ['players', 'tournament']));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return response()->json($this->teamRepository->update($id, $request->all()));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->teamRepository->delete($id);

        return response()->json(['message' => 'Đã xóa đội bóng.']);
    }
}
