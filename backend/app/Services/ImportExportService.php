<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\Team;
use App\Models\Player;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class ImportExportService
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    /**
     * Xem trước dữ liệu import từ Excel/CSV.
     */
    public function previewImport(UploadedFile $file, string $type): array
    {
        $rows = Excel::toArray(new class implements \Maatwebsite\Excel\Concerns\ToArray
        {
            public function array(array $array): array
            {
                return $array;
            }
        }, $file)[0] ?? [];

        $headers = array_shift($rows) ?? [];
        $preview = [];
        $errors = [];

        foreach (array_slice($rows, 0, 10) as $index => $row) {
            $data = array_combine($headers, $row);
            $rowErrors = $this->validateImportRow($type, $data);

            $preview[] = [
                'row' => $index + 2,
                'data' => $data,
                'errors' => $rowErrors,
                'valid' => empty($rowErrors),
            ];

            if (! empty($rowErrors)) {
                $errors[] = ['row' => $index + 2, 'errors' => $rowErrors];
            }
        }

        return [
            'type' => $type,
            'headers' => $headers,
            'total_rows' => count($rows),
            'preview' => $preview,
            'errors' => $errors,
            'can_import' => empty($errors),
        ];
    }

    public function importTeams(int $tournamentId, UploadedFile $file): array
    {
        $rows = Excel::toArray(new class implements \Maatwebsite\Excel\Concerns\ToArray
        {
            public function array(array $array): array
            {
                return $array;
            }
        }, $file)[0] ?? [];

        $headers = array_shift($rows) ?? [];
        $imported = 0;

        foreach ($rows as $row) {
            $data = array_combine($headers, $row);
            if (empty($data['name'])) {
                continue;
            }

            Team::query()->create([
                'tournament_id' => $tournamentId,
                'name' => $data['name'],
                'short_name' => $data['short_name'] ?? null,
                'coach_name' => $data['coach_name'] ?? null,
                'seed' => $data['seed'] ?? null,
            ]);
            $imported++;
        }

        $this->auditLogService->log(AuditAction::IMPORT, null, null, [
            'type' => 'teams',
            'tournament_id' => $tournamentId,
            'count' => $imported,
        ]);

        return ['imported' => $imported];
    }

    public function exportTeams(int $tournamentId, string $format = 'xlsx'): mixed
    {
        $teams = Team::query()
            ->with('players')
            ->where('tournament_id', $tournamentId)
            ->get();

        $this->auditLogService->log(AuditAction::EXPORT, null, null, [
            'type' => 'teams',
            'format' => $format,
        ]);

        if ($format === 'csv') {
            return $this->toCsv($teams, ['name', 'short_name', 'coach_name', 'seed']);
        }

        if ($format === 'pdf') {
            return $this->toPdf($teams, 'Danh sách đội bóng');
        }

        return Excel::download(
            new class ($teams) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings
            {
                public function __construct(private Collection $teams)
                {
                }

                public function collection(): Collection
                {
                    return $this->teams->map(fn ($t) => [
                        $t->name, $t->short_name, $t->coach_name, $t->seed,
                    ]);
                }

                public function headings(): array
                {
                    return ['Tên đội', 'Tên viết tắt', 'HLV', 'Hạt giống'];
                }
            },
            'teams.xlsx'
        );
    }

    public function exportStandings(int $tournamentId, string $format = 'xlsx')
    {
        $standings = \App\Models\Standing::query()
            ->with('team')
            ->where('tournament_id', $tournamentId)
            ->orderBy('position')
            ->get();

        if ($format === 'pdf') {
            return $this->toPdf($standings, 'Bảng xếp hạng');
        }

        return Excel::download(
            new class ($standings) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings
            {
                public function __construct(private Collection $standings)
                {
                }

                public function collection(): Collection
                {
                    return $this->standings->map(fn ($s) => [
                        $s->position, $s->team->name, $s->played,
                        $s->won, $s->drawn, $s->lost,
                        $s->goals_for, $s->goals_against, $s->goal_difference, $s->points,
                    ]);
                }

                public function headings(): array
                {
                    return ['Hạng', 'Đội', 'Trận', 'Thắng', 'Hòa', 'Thua', 'BT', 'BB', 'HS', 'Điểm'];
                }
            },
            'standings.xlsx'
        );
    }

    private function validateImportRow(string $type, array $data): array
    {
        $errors = [];

        if ($type === 'teams' && empty($data['name'])) {
            $errors[] = 'Thiếu tên đội';
        }

        if ($type === 'players' && (empty($data['name']) || empty($data['team_name']))) {
            $errors[] = 'Thiếu tên cầu thủ hoặc tên đội';
        }

        return $errors;
    }

    private function toCsv(Collection $data, array $columns): string
    {
        $lines = [implode(',', $columns)];
        foreach ($data as $item) {
            $lines[] = implode(',', array_map(fn ($c) => $item->{$c} ?? '', $columns));
        }

        return implode("\n", $lines);
    }

    private function toPdf(Collection $data, string $title)
    {
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.table', [
            'title' => $title,
            'data' => $data,
        ]);

        return $pdf->download(Str::slug($title) . '.pdf');
    }
}
