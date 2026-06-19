<?php

namespace App\Services;

use App\Models\RecycleBin;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class RecycleBinService
{
    public function trackDeletion(Model $model): RecycleBin
    {
        $retentionDays = config('permissions.recycle_bin.retention_days', 30);

        return RecycleBin::query()->updateOrCreate(
            [
                'recyclable_type' => $model->getMorphClass(),
                'recyclable_id' => $model->getKey(),
            ],
            [
                'deleted_by' => Auth::id(),
                'deleted_at' => now(),
                'expires_at' => now()->addDays($retentionDays),
                'snapshot' => $model->toArray(),
            ]
        );
    }

    public function list(array $filters = [], int $perPage = 20)
    {
        $query = RecycleBin::query()
            ->with(['recyclable', 'deletedByUser'])
            ->where('expires_at', '>', now())
            ->orderByDesc('deleted_at');

        if (! empty($filters['type'])) {
            $query->where('recyclable_type', $filters['type']);
        }

        return $query->paginate($perPage);
    }

    public function restore(int $recycleBinId): Model
    {
        $entry = RecycleBin::query()->findOrFail($recycleBinId);

        if ($entry->isExpired()) {
            throw new \RuntimeException('Mục đã hết hạn khôi phục (30 ngày).');
        }

        $model = $entry->recyclable;

        if (! $model) {
            throw new \RuntimeException('Không tìm thấy dữ liệu gốc.');
        }

        $model->restore();
        $entry->delete();

        return $model;
    }

    public function forceDelete(int $recycleBinId): bool
    {
        $entry = RecycleBin::query()->findOrFail($recycleBinId);
        $model = $entry->recyclable;

        if ($model) {
            $model->forceDelete();
        }

        return (bool) $entry->delete();
    }

    public function purgeExpired(): int
    {
        $expired = RecycleBin::query()->where('expires_at', '<=', now())->get();
        $count = 0;

        foreach ($expired as $entry) {
            if ($entry->recyclable) {
                $entry->recyclable->forceDelete();
            }
            $entry->delete();
            $count++;
        }

        return $count;
    }
}
