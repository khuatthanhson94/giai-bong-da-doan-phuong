<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Player::query()->with('team');

        if ($request->has('team_id')) {
            $query->where('team_id', $request->team_id);
        }

        return response()->json($query->paginate());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'team_id' => 'required|exists:teams,id',
            'name' => 'required|string|max:255',
            'jersey_number' => 'nullable|integer|min:1|max:99',
            'position' => 'nullable|string|max:20',
            'is_captain' => 'nullable|boolean',
        ]);

        return response()->json(Player::query()->create($data), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Player::query()->with('team')->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $player = Player::query()->findOrFail($id);
        $player->update($request->all());

        return response()->json($player);
    }

    public function destroy(int $id): JsonResponse
    {
        Player::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Đã xóa cầu thủ.']);
    }
}
