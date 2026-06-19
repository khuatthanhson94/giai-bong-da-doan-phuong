<?php

namespace Tests\Unit;

use App\Enums\MatchStatus;
use App\Enums\TournamentFormat;
use App\Models\FootballMatch;
use App\Models\Season;
use App\Models\Standing;
use App\Models\Team;
use App\Models\Tournament;
use App\Services\StandingsCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StandingsCalculatorTest extends TestCase
{
    use RefreshDatabase;

    private StandingsCalculatorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(StandingsCalculatorService::class);
    }

    public function test_calculates_standings_by_points(): void
    {
        $season = Season::query()->create([
            'name' => 'Test Season', 'year' => 2026, 'status' => 'active',
        ]);

        $tournament = Tournament::query()->create([
            'season_id' => $season->id,
            'name' => 'Test Tournament',
            'slug' => 'test-tournament',
            'format' => TournamentFormat::ROUND_ROBIN,
            'points_config' => ['win' => 3, 'draw' => 1, 'loss' => 0],
        ]);

        $teamA = Team::query()->create(['tournament_id' => $tournament->id, 'name' => 'Team A', 'seed' => 1]);
        $teamB = Team::query()->create(['tournament_id' => $tournament->id, 'name' => 'Team B', 'seed' => 2]);
        $teamC = Team::query()->create(['tournament_id' => $tournament->id, 'name' => 'Team C', 'seed' => 3]);

        // Team A thắng B 2-0
        FootballMatch::query()->create([
            'tournament_id' => $tournament->id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'home_score' => 2, 'away_score' => 0,
            'status' => MatchStatus::FINISHED,
            'is_published' => true,
        ]);

        // Team A hòa C 1-1
        FootballMatch::query()->create([
            'tournament_id' => $tournament->id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamC->id,
            'home_score' => 1, 'away_score' => 1,
            'status' => MatchStatus::FINISHED,
            'is_published' => true,
        ]);

        // Team B thua C 0-1
        FootballMatch::query()->create([
            'tournament_id' => $tournament->id,
            'home_team_id' => $teamB->id,
            'away_team_id' => $teamC->id,
            'home_score' => 0, 'away_score' => 1,
            'status' => MatchStatus::FINISHED,
            'is_published' => true,
        ]);

        $result = $this->service->calculate($tournament);

        $this->assertCount(3, $result);

        $leader = Standing::query()
            ->where('tournament_id', $tournament->id)
            ->orderBy('position')
            ->first();

        $this->assertEquals($teamA->id, $leader->team_id);
        $this->assertEquals(1, $leader->position);
        $this->assertEquals(4, $leader->points); // 3 + 1
        $this->assertEquals(2, $leader->won);
        $this->assertEquals(1, $leader->drawn);
    }

    public function test_tiebreaker_by_goal_difference(): void
    {
        $season = Season::query()->create([
            'name' => 'Tiebreaker', 'year' => 2026, 'status' => 'active',
        ]);

        $tournament = Tournament::query()->create([
            'season_id' => $season->id,
            'name' => 'Tiebreaker Cup',
            'slug' => 'tiebreaker-cup',
            'format' => TournamentFormat::LEAGUE,
            'tiebreaker_rules' => ['points', 'goal_difference', 'goals_for'],
        ]);

        $teamA = Team::query()->create(['tournament_id' => $tournament->id, 'name' => 'Alpha']);
        $teamB = Team::query()->create(['tournament_id' => $tournament->id, 'name' => 'Beta']);

        FootballMatch::query()->create([
            'tournament_id' => $tournament->id,
            'home_team_id' => $teamA->id, 'away_team_id' => $teamB->id,
            'home_score' => 3, 'away_score' => 0,
            'status' => MatchStatus::FINISHED, 'is_published' => true,
        ]);

        $this->service->calculate($tournament);

        $standingA = Standing::query()->where('team_id', $teamA->id)->first();
        $this->assertEquals(1, $standingA->position);
        $this->assertEquals(3, $standingA->goal_difference);
    }
}
