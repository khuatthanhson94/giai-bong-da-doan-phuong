<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\Contracts\MatchRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\TournamentGroup;
use App\Models\FootballMatch;
use App\Models\SiteSetting;
use App\Models\Standing;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class MatchController extends Controller
{
    public function __construct(private readonly MatchRepositoryInterface $matchRepository)
    {
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->has('tournament_id')) {
            return response()->json(
                $this->matchRepository->getByTournament(
                    (int) $request->tournament_id,
                    $request->input('group_id')
                )
            );
        }

        return response()->json($this->matchRepository->paginate());
    }

    private function translateLegacyPayload(Request $request)
    {
        if ($request->has('team_a_id') && !$request->has('home_team_id')) {
            $request->merge(['home_team_id' => $request->input('team_a_id')]);
        }
        if ($request->has('team_b_id') && !$request->has('away_team_id')) {
            $request->merge(['away_team_id' => $request->input('team_b_id')]);
        }
        if ($request->has('match_date') && !$request->has('scheduled_at')) {
            $time = $request->input('match_time', '00:00') ?: '00:00';
            $request->merge(['scheduled_at' => Carbon::parse($request->input('match_date') . ' ' . $time)]);
        }
        if ($request->has('round')) {
            $roundVal = $request->input('round');
            if (!is_numeric($roundVal)) {
                $request->merge(['bracket_position' => $roundVal]);
                $num = 1;
                if (preg_match('/\d+/', $roundVal, $matches)) {
                    $num = (int)$matches[0];
                } elseif (stripos($roundVal, 'semi') !== false) {
                    $num = 2;
                } elseif (stripos($roundVal, 'quarter') !== false) {
                    $num = 3;
                }
                $request->merge(['round' => $num]);
            }
        }
        if (!$request->has('tournament_id')) {
            $activeTournament = \App\Models\Tournament::where('status', 'active')->first()
                ?? \App\Models\Tournament::orderByDesc('id')->first();
            if ($activeTournament) {
                $request->merge(['tournament_id' => $activeTournament->id]);
            }
        }
    }

    public function store(Request $request): JsonResponse
    {
        $this->translateLegacyPayload($request);

        $data = $request->validate([
            'tournament_id' => 'required|exists:tournaments,id',
            'home_team_id' => 'required|exists:teams,id',
            'away_team_id' => 'required|exists:teams,id|different:home_team_id',
            'scheduled_at' => 'nullable|date',
            'venue' => 'nullable|string',
            'round' => 'nullable|integer',
            'bracket_position' => 'nullable|string',
        ]);

        return response()->json($this->matchRepository->create($data), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(
            $this->matchRepository->findOrFail($id, ['homeTeam', 'awayTeam', 'events', 'tournament'])
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->translateLegacyPayload($request);
        return response()->json($this->matchRepository->update($id, $request->all()));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->matchRepository->delete($id);

        return response()->json(['message' => 'Đã xóa trận đấu.']);
    }

    public function generateGroupSchedule(Request $request): JsonResponse
    {
        $request->validate([
            'group_id' => 'required|integer|exists:tournament_groups,id',
        ]);

        $groupId = $request->input('group_id');
        $group = TournamentGroup::findOrFail($groupId);
        $tournament = $group->tournament;

        if (!$tournament) {
            return response()->json(['error' => 'Giải đấu không hợp lệ'], 400);
        }

        DB::beginTransaction();
        try {
            // Delete all matches in the group where status != 'finished'
            FootballMatch::where('tournament_group_id', $group->id)
                ->where('status', '!=', 'finished')
                ->delete();

            $groupTeams = DB::table('group_team')
                ->where('tournament_group_id', $group->id)
                ->pluck('team_id')
                ->toArray();

            if (count($groupTeams) < 2) {
                DB::rollBack();
                return response()->json(['error' => 'Bảng đấu cần tối thiểu 2 đội để tạo lịch'], 400);
            }

            // Berger Round Robin Rotation
            $list = $groupTeams;
            if (count($list) % 2 !== 0) {
                $list[] = null; // bye
            }
            $numTeams = count($list);
            $numRounds = $numTeams - 1;
            $half = $numTeams / 2;
            $startDate = Carbon::today();

            for ($round = 0; $round < $numRounds; $round++) {
                $dateStr = $startDate->copy()->addDays($round * 7)->toDateString();

                $matchIdx = 0;
                for ($i = 0; $i < $half; $i++) {
                    $teamA = $list[$i];
                    $teamB = $list[$numTeams - 1 - i];

                    if ($teamA !== null && $teamB !== null) {
                        $timeStr = '08:00';
                        if ($matchIdx === 1) $timeStr = '10:00';
                        else if ($matchIdx === 2) $timeStr = '15:00';
                        else if ($matchIdx === 3) $timeStr = '17:00';
                        else if ($matchIdx > 3) $timeStr = '19:00';

                        FootballMatch::create([
                            'tournament_id' => $tournament->id,
                            'tournament_group_id' => $group->id,
                            'home_team_id' => $teamA,
                            'away_team_id' => $teamB,
                            'round' => $round + 1,
                            'bracket_position' => "Lượt " . ($round + 1),
                            'venue' => 'Sân bóng Phường',
                            'scheduled_at' => Carbon::parse($dateStr . ' ' . $timeStr),
                            'status' => 'scheduled',
                            'is_published' => false,
                        ]);
                        $matchIdx++;
                    }
                }
                // Rotate circle list
                $list = array_merge([$list[0]], [$list[$numTeams - 1]], array_slice($list, 1, $numTeams - 2));
            }

            DB::commit();
            return response()->json(['message' => 'Tạo lịch thi đấu vòng bảng tự động thành công']);
        } catch (\Exception $err) {
            DB::rollBack();
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }

    public function generateKnockout(Request $request): JsonResponse
    {
        $request->validate([
            'config' => 'required|array',
            'config.startingRound' => 'required|string',
            'config.startingMatches' => 'required|array',
        ]);

        $config = $request->input('config');
        
        // Find tournament_id from group of starting matches if possible, or fallback to active tournament
        $tournamentId = null;
        if (isset($config['startingMatches'][0]['home']['groupId'])) {
            $grp = TournamentGroup::find($config['startingMatches'][0]['home']['groupId']);
            if ($grp) {
                $tournamentId = $grp->tournament_id;
            }
        }
        if (!$tournamentId) {
            $tournament = DB::table('tournaments')->where('status', 'active')->first();
            if ($tournament) {
                $tournamentId = $tournament->id;
            }
        }
        if (!$tournamentId) {
            return response()->json(['error' => 'Không tìm thấy giải đấu hoạt động'], 400);
        }

        $tournament = DB::table('tournaments')->where('id', $tournamentId)->first();

        DB::beginTransaction();
        try {
            // 1. Save config to settings
            SiteSetting::updateOrCreate(
                ['key' => 'knockout_bracket_config'],
                [
                    'value' => json_encode($config),
                    'type' => 'json',
                    'group' => 'tournament',
                    'is_public' => true,
                ]
            );

            // 2. Collect all knockout rounds in this configuration
            $koRounds = [$config['startingRound']];
            if (isset($config['nextRounds']) && is_array($config['nextRounds'])) {
                foreach ($config['nextRounds'] as $r) {
                    $koRounds[] = $r['round'];
                }
            }

            // 3. Delete scheduled (not finished) matches in these rounds
            FootballMatch::where('tournament_id', $tournamentId)
                ->whereIn('bracket_position', $koRounds)
                ->where('status', '!=', 'finished')
                ->delete();

            // 4. Resolve starting round teams and insert matches
            $resolveTeam = function ($source) use ($tournamentId) {
                if ($source['type'] === 'team') {
                    return (int) $source['teamId'];
                }
                if ($source['type'] === 'rank') {
                    $groupId = (int) $source['groupId'];
                    $rank = (int) $source['rank'];

                    $standing = Standing::where('tournament_id', $tournamentId)
                        ->where('tournament_group_id', $groupId)
                        ->orderBy('position')
                        ->skip($rank - 1)
                        ->first();

                    if (!$standing) {
                        throw new \Exception("Không tìm thấy đội bóng ở vị trí xếp hạng {$rank} của bảng đấu ID {$groupId}. Hãy hoàn thành vòng bảng hoặc phân bảng đầy đủ.");
                    }
                    return $standing->team_id;
                }
                throw new \Exception("Kiểu nguồn đội không hợp lệ: " . $source['type']);
            };

            foreach ($config['startingMatches'] as $m) {
                $teamAId = $resolveTeam($m['home']);
                $teamBId = $resolveTeam($m['away']);
                if ($teamAId === $teamBId) {
                    throw new \Exception("Hai đội đấu nhau trong một trận không thể trùng nhau.");
                }
                $notes = "KO_ID: {$m['id']}" . (isset($m['notes']) && $m['notes'] ? ' | ' . $m['notes'] : '');

                $roundName = $config['startingRound'];
                $roundNum = 1;
                if (stripos($roundName, 'semi') !== false) {
                    $roundNum = 2;
                } elseif (stripos($roundName, 'quarter') !== false) {
                    $roundNum = 3;
                }

                FootballMatch::create([
                    'tournament_id' => $tournamentId,
                    'home_team_id' => $teamAId,
                    'away_team_id' => $teamBId,
                    'round' => $roundNum,
                    'bracket_position' => $roundName,
                    'venue' => $m['venue'] ?? 'Sân bóng Phường',
                    'scheduled_at' => isset($m['match_date']) && $m['match_date']
                        ? Carbon::parse($m['match_date'] . ' ' . ($m['match_time'] ?? '08:00'))
                        : null,
                    'status' => 'scheduled',
                    'notes' => $notes,
                    'is_published' => false,
                ]);
            }

            DB::commit();
            return response()->json(['message' => 'Khởi tạo vòng loại trực tiếp và cấu hình nhánh đấu thành công']);
        } catch (\Exception $err) {
            DB::rollBack();
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }
}
