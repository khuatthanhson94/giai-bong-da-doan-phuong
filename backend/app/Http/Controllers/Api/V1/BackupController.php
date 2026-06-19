<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BackupController extends Controller
{
    public function __construct(private readonly BackupService $backupService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->backupService->list());
    }

    public function store(Request $request): JsonResponse
    {
        $backup = $this->backupService->create($request->input('type', 'full'));

        return response()->json($backup, 201);
    }

    public function download(int $id)
    {
        return $this->backupService->download($id);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->backupService->delete($id);

        return response()->json(['message' => 'Đã xóa backup.']);
    }
}
