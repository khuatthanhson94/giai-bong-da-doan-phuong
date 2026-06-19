<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Sponsor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SponsorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Sponsor::query()->where('is_active', true)->orderBy('sort_order');

        if ($request->has('tournament_id')) {
            $query->where('tournament_id', $request->tournament_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'tier' => 'required|string',
            'logo' => 'nullable|string',
            'website_url' => 'nullable|url',
            'season_id' => 'nullable|exists:seasons,id',
            'tournament_id' => 'nullable|exists:tournaments,id',
        ]);

        return response()->json(Sponsor::query()->create($data), 201);
    }

    public function update(Request $request, Sponsor $sponsor): JsonResponse
    {
        $sponsor->update($request->all());

        return response()->json($sponsor);
    }

    public function destroy(Sponsor $sponsor): JsonResponse
    {
        $sponsor->delete();

        return response()->json(['message' => 'Đã xóa nhà tài trợ.']);
    }
}
