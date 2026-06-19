<?php

namespace App\Services;

use App\Enums\MatchStatus;
use App\Enums\TournamentFormat;
use App\Models\FootballMatch;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentGroup;
use Illuminate\Support\Collection;

class FixtureGeneratorService
{
    /**
     * Sinh lịch thi đấu theo thể thức giải.
     */
    public function generate(Tournament $tournament, ?TournamentGroup $group = null, array $options = []): Collection
    {
        $teams = $group
            ? $group->teams()->orderBy('group_team.sort_order')->get()
            : $tournament->teams()->orderBy('seed')->orderBy('name')->get();

        if ($teams->count() < 2) {
            throw new \InvalidArgumentException('Cần ít nhất 2 đội để sinh lịch thi đấu.');
        }

        return match ($tournament->format) {
            TournamentFormat::ROUND_ROBIN => $this->roundRobin($tournament, $teams, $group, false, $options),
            TournamentFormat::DOUBLE_ROUND => $this->roundRobin($tournament, $teams, $group, true, $options),
            TournamentFormat::LEAGUE => $this->roundRobin($tournament, $teams, $group, true, $options),
            TournamentFormat::KNOCKOUT => $this->knockout($tournament, $teams, $group),
            TournamentFormat::GROUP_KNOCKOUT => $this->roundRobin($tournament, $teams, $group, false, $options),
            default => $this->roundRobin($tournament, $teams, $group, false, $options),
        };
    }

    public function roundRobin(
        Tournament $tournament,
        Collection $teams,
        ?TournamentGroup $group,
        bool $doubleRound,
        array $options = []
    ): Collection {
        $teamList = $teams->values()->all();
        $count = count($teamList);

        // Thêm BYE nếu số đội lẻ
        if ($count % 2 !== 0) {
            $teamList[] = null;
            $count++;
        }

        $rounds = $count - 1;
        $matchesPerRound = $count / 2;
        $fixtures = collect();
        $roundNumber = 1;
        $matchday = 1;

        $rotation = $teamList;

        for ($round = 0; $round < $rounds; $round++) {
            for ($match = 0; $match < $matchesPerRound; $match++) {
                $home = $rotation[$match];
                $away = $rotation[$count - 1 - $match];

                if ($home === null || $away === null) {
                    continue;
                }

                $fixtures->push($this->createMatch(
                    $tournament,
                    $group,
                    $home,
                    $away,
                    $roundNumber,
                    $matchday,
                    $options['venue'] ?? null,
                    $options['start_date'] ?? null,
                    $matchday
                ));
            }

            // Xoay vòng (circle method)
            $fixed = array_shift($rotation);
            $last = array_pop($rotation);
            array_unshift($rotation, $last);
            array_unshift($rotation, $fixed);

            $roundNumber++;
            $matchday++;
        }

        if ($doubleRound) {
            $firstLegCount = $fixtures->count();
            $returnLegStart = $roundNumber;
            foreach ($fixtures as $index => $match) {
                $fixtures->push($this->createMatch(
                    $tournament,
                    $group,
                    $match->awayTeam ?? Team::query()->find($match->away_team_id),
                    $match->homeTeam ?? Team::query()->find($match->home_team_id),
                    $returnLegStart + (int) floor($index / max(1, $firstLegCount / max(1, $rounds))),
                    $matchday + $index,
                    $match->venue,
                    $match->scheduled_at?->copy()->addWeek()
                ));
            }
        }

        return $fixtures;
    }

    public function knockout(
        Tournament $tournament,
        Collection $teams,
        ?TournamentGroup $group
    ): Collection {
        $fixtures = collect();
        $sorted = $teams->sortBy('seed')->values();
        $round = 1;
        $pairCount = (int) ceil($sorted->count() / 2);

        for ($i = 0; $i < $pairCount; $i++) {
            $home = $sorted->get($i);
            $away = $sorted->get($sorted->count() - 1 - $i);

            if (! $home || ! $away || $home->id === $away->id) {
                continue;
            }

            $fixtures->push($this->createMatch(
                $tournament,
                $group,
                $home,
                $away,
                $round,
                $i + 1,
                null,
                null,
                null,
                true,
                "R{$round}-M" . ($i + 1)
            ));
        }

        return $fixtures;
    }

    private function createMatch(
        Tournament $tournament,
        ?TournamentGroup $group,
        Team $home,
        Team $away,
        int $round,
        int $matchday,
        ?string $venue = null,
        $startDate = null,
        ?int $dayOffset = null,
        bool $persist = true,
        ?string $bracketPosition = null
    ): FootballMatch {
        $scheduledAt = null;
        if ($startDate && $dayOffset) {
            $scheduledAt = \Carbon\Carbon::parse($startDate)->addDays($dayOffset - 1);
        }

        $data = [
            'tournament_id' => $tournament->id,
            'tournament_group_id' => $group?->id,
            'home_team_id' => $home->id,
            'away_team_id' => $away->id,
            'round' => $round,
            'matchday' => $matchday,
            'bracket_position' => $bracketPosition,
            'venue' => $venue,
            'scheduled_at' => $scheduledAt,
            'status' => MatchStatus::SCHEDULED,
        ];

        if ($persist) {
            return FootballMatch::query()->create($data);
        }

        $match = new FootballMatch($data);
        $match->setRelation('tournament', $tournament);
        $match->setRelation('group', $group);
        $match->setRelation('homeTeam', $home);
        $match->setRelation('awayTeam', $away);

        return $match;
    }
}
