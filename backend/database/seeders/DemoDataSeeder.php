<?php

namespace Database\Seeders;

use App\Enums\SeasonStatus;
use App\Enums\SponsorTier;
use App\Enums\TournamentFormat;
use App\Models\Page;
use App\Models\Player;
use App\Models\Season;
use App\Models\SiteSetting;
use App\Models\Sponsor;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $season = Season::query()->updateOrCreate(
            ['name' => 'Mùa giải 2026', 'year' => 2026],
            [
                'description' => 'Giải bóng đá đoàn phường mùa 2026',
                'status' => SeasonStatus::ACTIVE,
                'sort_order' => 1,
            ]
        );

        $tournament = Tournament::query()->updateOrCreate(
            ['slug' => 'giai-bong-da-doan-phuong-2026'],
            [
                'season_id' => $season->id,
                'name' => 'Giải Bóng Đá Đoàn Phường 2026',
                'format' => TournamentFormat::GROUP_KNOCKOUT,
                'points_config' => ['win' => 3, 'draw' => 1, 'loss' => 0],
                'tiebreaker_rules' => ['points', 'goal_difference', 'goals_for', 'head_to_head'],
                'advancement_rules' => ['teams_per_group' => 2],
                'status' => 'active',
                'is_published' => true,
                'wizard_step' => 8,
            ]
        );

        $groupA = TournamentGroup::query()->updateOrCreate(
            ['tournament_id' => $tournament->id, 'name' => 'Bảng A'],
            ['code' => 'A', 'sort_order' => 1, 'teams_to_advance' => 2]
        );

        $groupB = TournamentGroup::query()->updateOrCreate(
            ['tournament_id' => $tournament->id, 'name' => 'Bảng B'],
            ['code' => 'B', 'sort_order' => 2, 'teams_to_advance' => 2]
        );

        $teamNames = [
            ['name' => 'FC Đoàn Kết', 'short_name' => 'DK', 'seed' => 1],
            ['name' => 'FC Hữu Nghị', 'short_name' => 'HN', 'seed' => 2],
            ['name' => 'FC Thống Nhất', 'short_name' => 'TN', 'seed' => 3],
            ['name' => 'FC Tiến Bộ', 'short_name' => 'TB', 'seed' => 4],
            ['name' => 'FC Phong Độ', 'short_name' => 'PD', 'seed' => 5],
            ['name' => 'FC Chiến Thắng', 'short_name' => 'CT', 'seed' => 6],
            ['name' => 'FC Anh Hùng', 'short_name' => 'AH', 'seed' => 7],
            ['name' => 'FC Quyết Thắng', 'short_name' => 'QT', 'seed' => 8],
        ];

        $teams = collect();
        foreach ($teamNames as $index => $teamData) {
            $team = Team::query()->updateOrCreate(
                ['tournament_id' => $tournament->id, 'name' => $teamData['name']],
                [
                    'short_name' => $teamData['short_name'],
                    'seed' => $teamData['seed'],
                    'coach_name' => 'HLV ' . $teamData['short_name'],
                ]
            );
            $teams->push($team);

            // Gán vào bảng A/B xen kẽ
            $group = $index % 2 === 0 ? $groupA : $groupB;
            $group->teams()->syncWithoutDetaching([
                $team->id => ['seed' => $teamData['seed'], 'sort_order' => $index + 1],
            ]);

            // Tạo 5 cầu thủ mẫu mỗi đội
            for ($i = 1; $i <= 5; $i++) {
                Player::query()->updateOrCreate(
                    ['team_id' => $team->id, 'jersey_number' => $i],
                    [
                        'name' => "Cầu thủ {$i} - {$teamData['short_name']}",
                        'position' => $i === 1 ? 'GK' : ($i <= 3 ? 'DF' : 'FW'),
                        'is_captain' => $i === 1,
                    ]
                );
            }
        }

        Sponsor::query()->updateOrCreate(
            ['name' => 'Nhà tài trợ Kim Cương'],
            [
                'season_id' => $season->id,
                'tournament_id' => $tournament->id,
                'tier' => SponsorTier::DIAMOND,
                'sort_order' => 1,
            ]
        );

        SiteSetting::query()->updateOrCreate(
            ['key' => 'site_name'],
            ['group' => 'general', 'value' => 'Giải Bóng Đá Đoàn Phường', 'is_public' => true]
        );

        SiteSetting::query()->updateOrCreate(
            ['key' => 'contact_email'],
            ['group' => 'contact', 'value' => 'contact@giaibongda.local', 'is_public' => true]
        );

        foreach (['about', 'rules', 'contact'] as $slug) {
            Page::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => ucfirst($slug),
                    'content' => "<p>Nội dung trang {$slug}.</p>",
                    'is_published' => true,
                ]
            );
        }
    }
}
