<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ImportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportExportController extends Controller
{
    public function __construct(private readonly ImportExportService $importExportService)
    {
    }

    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,csv,xls',
            'type' => 'required|in:teams,players',
        ]);

        return response()->json(
            $this->importExportService->previewImport($request->file('file'), $request->type)
        );
    }

    public function importTeams(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,csv,xls',
            'tournament_id' => 'required|exists:tournaments,id',
        ]);

        return response()->json(
            $this->importExportService->importTeams(
                (int) $request->tournament_id,
                $request->file('file')
            )
        );
    }

    public function exportTeams(Request $request, int $tournamentId)
    {
        return $this->importExportService->exportTeams(
            $tournamentId,
            $request->input('format', 'xlsx')
        );
    }

    public function exportStandings(Request $request, int $tournamentId)
    {
        return $this->importExportService->exportStandings(
            $tournamentId,
            $request->input('format', 'xlsx')
        );
    }
}
