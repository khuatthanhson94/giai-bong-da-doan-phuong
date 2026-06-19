<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditLogService
{
    public function log(
        AuditAction $action,
        ?Model $model = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?User $user = null
    ): AuditLog {
        $request = request();

        return AuditLog::query()->create([
            'user_id' => ($user ?? Auth::user())?->id,
            'action' => $action,
            'auditable_type' => $model?->getMorphClass(),
            'auditable_id' => $model?->getKey(),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'device' => $this->parseDevice($request?->userAgent()),
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);
    }

    public function paginate(array $filters = [], int $perPage = 20)
    {
        $query = AuditLog::query()->with('user')->orderByDesc('created_at');

        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }
        if (! empty($filters['from'])) {
            $query->where('created_at', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->where('created_at', '<=', $filters['to']);
        }

        return $query->paginate($perPage);
    }

    private function parseDevice(?string $userAgent): ?string
    {
        if (! $userAgent) {
            return null;
        }

        if (str_contains($userAgent, 'Mobile')) {
            return 'mobile';
        }
        if (str_contains($userAgent, 'Tablet')) {
            return 'tablet';
        }

        return 'desktop';
    }
}
