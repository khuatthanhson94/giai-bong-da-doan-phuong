<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Services\TournamentWizardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentWizardController extends Controller
{
    public function __construct(private readonly TournamentWizardService $wizardService)
    {
    }

    public function status(Tournament $tournament): JsonResponse
    {
        return response()->json([
            'current_step' => $tournament->wizard_step,
            'total_steps' => TournamentWizardService::TOTAL_STEPS,
            'tournament' => $tournament->load(['groups.teams', 'teams']),
        ]);
    }

    public function execute(Request $request, Tournament $tournament, int $step): JsonResponse
    {
        $result = $this->wizardService->executeStep(
            $tournament,
            $step,
            $request->all()
        );

        return response()->json($result);
    }
}
