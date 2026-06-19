<?php

namespace App\Services;

use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentGroup;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentWizardService
{
    public const TOTAL_STEPS = 8;

    public function __construct(
        private readonly FixtureGeneratorService $fixtureGenerator,
        private readonly StandingsCalculatorService $standingsCalculator,
        private readonly TournamentService $tournamentService
    ) {
    }

    /**
     * Wizard 8 bước:
     * 1. Thông tin cơ bản
     * 2. Cấu hình điểm & tiebreaker
     * 3. Tạo bảng đấu
     * 4. Gán đội (manual/random/seed/ranking)
     * 5. Sinh lịch thi đấu
     * 6. Tính bảng xếp hạng
     * 7. Tạo bracket knockout
     * 8. Xuất bản giải
     */
    public function executeStep(Tournament $tournament, int $step, array $payload = []): array
    {
        if ($step < 1 || $step > self::TOTAL_STEPS) {
            throw new \InvalidArgumentException('Bước wizard không hợp lệ (1-8).');
        }

        $result = match ($step) {
            1 => $this->stepBasicInfo($tournament, $payload),
            2 => $this->stepPointsConfig($tournament, $payload),
            3 => $this->stepCreateGroups($tournament, $payload),
            4 => $this->stepAssignTeams($tournament, $payload),
            5 => $this->stepGenerateFixtures($tournament, $payload),
            6 => $this->stepCalculateStandings($tournament, $payload),
            7 => $this->stepGenerateBracket($tournament, $payload),
            8 => $this->stepPublish($tournament, $payload),
            default => [],
        };

        $tournament->update(['wizard_step' => max($tournament->wizard_step, $step)]);

        return [
            'step' => $step,
            'total_steps' => self::TOTAL_STEPS,
            'tournament' => $tournament->fresh(['groups.teams', 'teams', 'matches']),
            'result' => $result,
        ];
    }

    private function stepBasicInfo(Tournament $tournament, array $payload): array
    {
        $this->tournamentService->update($tournament->id, $payload);

        return ['message' => 'Đã cập nhật thông tin giải đấu.'];
    }

    private function stepPointsConfig(Tournament $tournament, array $payload): array
    {
        $this->tournamentService->update($tournament->id, [
            'points_config' => $payload['points_config'] ?? ['win' => 3, 'draw' => 1, 'loss' => 0],
            'tiebreaker_rules' => $payload['tiebreaker_rules'] ?? ['points', 'goal_difference', 'goals_for', 'head_to_head'],
            'advancement_rules' => $payload['advancement_rules'] ?? ['teams_per_group' => 2],
        ]);

        return ['message' => 'Đã cấu hình điểm và tiebreaker.'];
    }

    private function stepCreateGroups(Tournament $tournament, array $payload): array
    {
        $groups = collect();
        $groupNames = $payload['groups'] ?? [['name' => 'Bảng A', 'code' => 'A']];

        foreach ($groupNames as $index => $groupData) {
            $groups->push(TournamentGroup::query()->updateOrCreate(
                [
                    'tournament_id' => $tournament->id,
                    'name' => $groupData['name'],
                ],
                [
                    'code' => $groupData['code'] ?? chr(65 + $index),
                    'sort_order' => $index + 1,
                    'teams_to_advance' => $groupData['teams_to_advance'] ?? 2,
                ]
            ));
        }

        return ['groups' => $groups, 'message' => 'Đã tạo bảng đấu.'];
    }

    private function stepAssignTeams(Tournament $tournament, array $payload): array
    {
        $method = $payload['method'] ?? 'manual';
        $teams = $tournament->teams()->get();

        if ($method === 'random') {
            $teams = $teams->shuffle();
        } elseif ($method === 'seed') {
            $teams = $teams->sortBy('seed');
        } elseif ($method === 'ranking') {
            $teams = $teams->sortBy('ranking');
        }

        $groups = $tournament->groups()->orderBy('sort_order')->get();

        if ($groups->isEmpty()) {
            throw new \InvalidArgumentException('Chưa có bảng đấu. Hoàn thành bước 3 trước.');
        }

        DB::transaction(function () use ($method, $teams, $groups, $payload) {
            if ($method === 'manual' && ! empty($payload['assignments'])) {
                foreach ($payload['assignments'] as $assignment) {
                    $group = $groups->firstWhere('id', $assignment['group_id']);
                    $team = Team::query()->findOrFail($assignment['team_id']);
                    $group->teams()->syncWithoutDetaching([
                        $team->id => [
                            'seed' => $assignment['seed'] ?? $team->seed,
                            'ranking' => $assignment['ranking'] ?? $team->ranking,
                            'sort_order' => $assignment['sort_order'] ?? 0,
                        ],
                    ]);
                }

                return;
            }

            // Phân bổ đều theo snake draft
            $groupIndex = 0;
            $direction = 1;
            foreach ($teams->values() as $index => $team) {
                $group = $groups[$groupIndex];
                $group->teams()->syncWithoutDetaching([
                    $team->id => [
                        'seed' => $team->seed ?? ($index + 1),
                        'ranking' => $team->ranking,
                        'sort_order' => $index + 1,
                    ],
                ]);

                if ($direction === 1 && $groupIndex >= $groups->count() - 1) {
                    $direction = -1;
                } elseif ($direction === -1 && $groupIndex <= 0) {
                    $direction = 1;
                } else {
                    $groupIndex += $direction;
                }
            }
        });

        return ['message' => "Đã gán đội theo phương thức: {$method}."];
    }

    private function stepGenerateFixtures(Tournament $tournament, array $payload): array
    {
        $fixtures = collect();

        if ($tournament->groups()->exists()) {
            foreach ($tournament->groups as $group) {
                $fixtures = $fixtures->merge(
                    $this->fixtureGenerator->generate($tournament, $group, $payload)
                );
            }
        } else {
            $fixtures = $this->fixtureGenerator->generate($tournament, null, $payload);
        }

        return [
            'fixtures_count' => $fixtures->count(),
            'message' => 'Đã sinh lịch thi đấu.',
        ];
    }

    private function stepCalculateStandings(Tournament $tournament, array $payload): array
    {
        $standings = collect();

        if ($tournament->groups()->exists()) {
            foreach ($tournament->groups as $group) {
                $standings = $standings->merge(
                    $this->standingsCalculator->calculate($tournament, $group)
                );
            }
        } else {
            $standings = $this->standingsCalculator->calculate($tournament);
        }

        return [
            'standings_count' => $standings->count(),
            'message' => 'Đã tính bảng xếp hạng.',
        ];
    }

    private function stepGenerateBracket(Tournament $tournament, array $payload): array
    {
        $advanceCount = $payload['teams_to_advance'] ?? 2;
        $qualified = collect();

        foreach ($tournament->groups as $group) {
            $top = $group->standings()
                ->with('team')
                ->orderBy('position')
                ->limit($advanceCount)
                ->get()
                ->pluck('team');

            $qualified = $qualified->merge($top);
        }

        if ($qualified->count() < 2) {
            $qualified = $tournament->teams()->orderBy('seed')->get();
        }

        $bracketFixtures = $this->fixtureGenerator->knockout($tournament, $qualified, null);

        return [
            'bracket_matches' => $bracketFixtures->count(),
            'qualified_teams' => $qualified->pluck('name'),
            'message' => 'Đã tạo bracket knockout.',
        ];
    }

    private function stepPublish(Tournament $tournament, array $payload): array
    {
        $this->tournamentService->publish($tournament->id);

        return ['message' => 'Giải đấu đã được xuất bản.'];
    }
}
