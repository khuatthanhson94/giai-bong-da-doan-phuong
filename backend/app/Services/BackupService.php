<?php

namespace App\Services;

use App\Models\Backup;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BackupService
{
    public function create(string $type = 'full'): Backup
    {
        $filename = 'backup_' . now()->format('Y-m-d_His') . '_' . Str::random(6) . '.sql';
        $disk = config('backup.disk', env('BACKUP_DISK', 'local'));
        $path = 'backups/' . $filename;

        // Stub: thực tế dùng pg_dump hoặc spatie/laravel-backup
        $content = "-- Database backup stub\n-- Generated at " . now()->toIso8601String();
        Storage::disk($disk)->put($path, $content);

        return Backup::query()->create([
            'created_by' => Auth::id(),
            'filename' => $filename,
            'disk' => $disk,
            'path' => $path,
            'size' => strlen($content),
            'type' => $type,
            'status' => 'completed',
            'expires_at' => now()->addDays((int) env('BACKUP_RETENTION_DAYS', 30)),
        ]);
    }

    public function list(int $perPage = 15)
    {
        return Backup::query()
            ->with('creator')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function download(int $backupId)
    {
        $backup = Backup::query()->findOrFail($backupId);

        return Storage::disk($backup->disk)->download($backup->path, $backup->filename);
    }

    public function delete(int $backupId): bool
    {
        $backup = Backup::query()->findOrFail($backupId);
        Storage::disk($backup->disk)->delete($backup->path);

        return (bool) $backup->delete();
    }
}
