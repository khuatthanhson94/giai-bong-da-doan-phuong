<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;

class QrController extends Controller
{
    public function __construct(private readonly QrCodeService $qrCodeService)
    {
    }

    public function match(int $matchId): JsonResponse
    {
        return response()->json($this->qrCodeService->generateMatchQr($matchId));
    }

    public function team(int $teamId): JsonResponse
    {
        return response()->json($this->qrCodeService->generateTeamQr($teamId));
    }
}
