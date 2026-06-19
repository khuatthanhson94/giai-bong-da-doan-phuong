<?php

namespace Tests\Unit;

use App\Enums\TournamentFormat;
use App\Models\Season;
use App\Models\Team;
use App\Models\Tournament;
use App\Services\FixtureGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FixtureGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private FixtureGeneratorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(FixtureGeneratorService::class);
    }

    public function test_generates_round_robin_fixtures_for_four_teams(): void
    {
        $season = Season::query()->create([
            'name' => 'Fixture Test', 'year' => 2026, 'status' => 'active',
        ]);

        $tournament = Tournament::query()->create([
            'season_id' => $season->id,
            'name' => 'Round Robin',
            'slug' => 'round-robin',
            'format' => TournamentFormat::ROUND_ROBIN,
        ]);

        foreach (['A', 'B', 'C', 'D'] as $i => $name) {
            Team::query()->create([
                'tournament_id' => $tournament->id,
                'name' => "Team {$name}",
                'seed' => $i + 1,
            ]);
        }

        $fixtures = $this->service->generate($tournament->fresh(['teams']));

        // 4 đội = 6 trận (n*(n-1)/2)
        $this->assertCount(6, $fixtures);

        $teamIds = $tournament->teams->pluck('id')->toArray();
        foreach ($fixtures as $match) {
            $this->assertContains($match->home_team_id, $teamIds);
            $this->assertContains($match->away_team_id, $teamIds);
            $this->assertNotEquals($match->home_team_id, $match->away_team_id);
        }
    }

    public function test_generates_knockout_bracket(): void
    {
        $season = Season::query()->create([
            'name' => 'Knockout', 'year' => 2026, 'status' => 'active',
        ]);

        $tournament = Tournament::query()->create([
            'season_id' => $season->id,
            'name' => 'Knockout Cup',
            'slug' => 'knockout-cup',
            'format' => TournamentFormat::KNOCKOUT,
        ]);

        foreach (range(1, 4) as $i) {
            Team::query()->create([
                'tournament_id' => $tournament->id,
                'name' => "Team {$i}",
                'seed' => $i,
            ]);
        }

        $teams = $tournament->fresh()->teams;
        $fixtures = $this->service->knockout($tournament, $teams, null);

        $this->assertCount(2, $fixtures);
        $this->assertEquals(1, $fixtures->first()->round);
    }
}
