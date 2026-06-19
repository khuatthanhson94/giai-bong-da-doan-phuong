<?php

use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BackupController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\GalleryController;
use App\Http\Controllers\Api\V1\ImportExportController;
use App\Http\Controllers\Api\V1\MatchController;
use App\Http\Controllers\Api\V1\MatchResultController;
use App\Http\Controllers\Api\V1\NewsController;
use App\Http\Controllers\Api\V1\PlayerController;
use App\Http\Controllers\Api\V1\PublicController;
use App\Http\Controllers\Api\V1\QrController;
use App\Http\Controllers\Api\V1\RecycleBinController;
use App\Http\Controllers\Api\V1\SeasonController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SponsorController;
use App\Http\Controllers\Api\V1\StandingsController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\TournamentController;
use App\Http\Controllers\Api\V1\TournamentWizardController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public API - website công khai
    Route::prefix('public')->group(function () {
        Route::get('home', [PublicController::class, 'home']);
        Route::get('seasons', [PublicController::class, 'seasons']);
        Route::get('tournaments/{slug}', [PublicController::class, 'tournament']);
        Route::get('tournaments/{tournament}/standings', [PublicController::class, 'standings']);
        Route::get('tournaments/{tournament}/fixtures', [PublicController::class, 'fixtures']);
        Route::get('news', [PublicController::class, 'news']);
        Route::get('news/{slug}', [PublicController::class, 'newsDetail']);
        Route::get('sponsors', [PublicController::class, 'sponsors']);
        Route::get('pages/{slug}', [PublicController::class, 'page']);
        Route::get('teams', [PublicController::class, 'teams']);
        Route::get('teams/{id}', [PublicController::class, 'team']);
        Route::get('players', [PublicController::class, 'players']);
        Route::get('players/{id}', [PublicController::class, 'player']);
        Route::get('statistics', [PublicController::class, 'statistics']);
    });

    // Health check endpoint
    Route::get('health', fn() => response()->json(['status' => 'ok']));
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::middleware('auth:api')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });
    });

    // Protected routes
    Route::middleware('auth:api')->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])
            ->middleware('permission:dashboard.view');

        Route::apiResource('seasons', SeasonController::class);
        Route::apiResource('tournaments', TournamentController::class);
        Route::post('tournaments/{id}/publish', [TournamentController::class, 'publish']);

        Route::prefix('tournaments/{tournament}/wizard')->group(function () {
            Route::get('status', [TournamentWizardController::class, 'status']);
            Route::post('step/{step}', [TournamentWizardController::class, 'execute']);
        });

        Route::apiResource('teams', TeamController::class);
        Route::apiResource('players', PlayerController::class);
        Route::apiResource('matches', MatchController::class);
        Route::post('matches/generate-group-schedule', [MatchController::class, 'generateGroupSchedule']);
        Route::post('matches/generate-knockout', [MatchController::class, 'generateKnockout']);

        Route::prefix('matches/{match}')->group(function () {
            Route::put('score', [MatchResultController::class, 'updateScore']);
            Route::post('events', [MatchResultController::class, 'addEvent']);
            Route::post('publish', [MatchResultController::class, 'publish']);
        });
        Route::get('top-scorers', [MatchResultController::class, 'topScorers']);

        Route::get('tournaments/{tournament}/standings', [StandingsController::class, 'index']);
        Route::post('tournaments/{tournament}/standings/recalculate', [StandingsController::class, 'recalculate']);

        Route::apiResource('news', NewsController::class);

        Route::prefix('gallery')->group(function () {
            Route::get('albums', [GalleryController::class, 'albums']);
            Route::post('albums', [GalleryController::class, 'storeAlbum']);
            Route::get('albums/{album}', [GalleryController::class, 'showAlbum']);
            Route::post('albums/{album}/images', [GalleryController::class, 'storeImage']);
            Route::get('videos', [GalleryController::class, 'videos']);
            Route::post('videos', [GalleryController::class, 'storeVideo']);
        });

        Route::apiResource('sponsors', SponsorController::class)->except(['show']);

        Route::prefix('recycle-bin')->group(function () {
            Route::get('/', [RecycleBinController::class, 'index']);
            Route::post('{id}/restore', [RecycleBinController::class, 'restore']);
            Route::delete('{id}', [RecycleBinController::class, 'destroy']);
        });

        Route::prefix('import-export')->group(function () {
            Route::post('preview', [ImportExportController::class, 'preview']);
            Route::post('teams/import', [ImportExportController::class, 'importTeams']);
            Route::get('teams/{tournamentId}/export', [ImportExportController::class, 'exportTeams']);
            Route::get('standings/{tournamentId}/export', [ImportExportController::class, 'exportStandings']);
        });

        Route::get('settings', [SettingsController::class, 'index']);
        Route::put('settings', [SettingsController::class, 'update']);
        Route::get('pages', [SettingsController::class, 'pages']);
        Route::put('pages/{slug}', [SettingsController::class, 'updatePage']);

        Route::get('audit-logs', [AuditLogController::class, 'index']);

        Route::apiResource('backups', BackupController::class)->only(['index', 'store', 'destroy']);
        Route::get('backups/{id}/download', [BackupController::class, 'download']);

        Route::post('ai/news', [AiController::class, 'generateNews']);
        Route::get('ai/match-report/{matchId}', [AiController::class, 'generateMatchReport']);

        Route::get('qr/match/{matchId}', [QrController::class, 'match']);
        Route::get('qr/team/{teamId}', [QrController::class, 'team']);
    });
});
