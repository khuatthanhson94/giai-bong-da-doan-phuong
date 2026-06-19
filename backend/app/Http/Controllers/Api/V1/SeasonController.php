<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SeasonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeasonController extends Controller
{
    public function __construct(private readonly SeasonService $seasonService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->seasonService->list($request->all()));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'year' => 'required|integer|min:2000|max:2100',
            'logo' => 'nullable|string',
            'banner' => 'nullable|string',
            'description' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $season = $this->seasonService->create($data);

        return response()->json($season, 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->seasonService->get($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $season = $this->seasonService->update($id, $request->all());

        return response()->json($season);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->seasonService->delete($id);

        return response()->json(['message' => 'Đã xóa mùa giải.']);
    }
}
