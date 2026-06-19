<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\RecycleBinService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecycleBinController extends Controller
{
    public function __construct(private readonly RecycleBinService $recycleBinService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->recycleBinService->list($request->all()));
    }

    public function restore(int $id): JsonResponse
    {
        $model = $this->recycleBinService->restore($id);

        return response()->json([
            'message' => 'Khôi phục thành công.',
            'data' => $model,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->recycleBinService->forceDelete($id);

        return response()->json(['message' => 'Đã xóa vĩnh viễn.']);
    }
}
