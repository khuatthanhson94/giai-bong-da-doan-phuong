<?php

namespace App\Traits;

use App\Enums\AuditAction;
use App\Services\AuditLogService;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            app(AuditLogService::class)->log(
                AuditAction::CREATE,
                $model,
                null,
                $model->getAttributes()
            );
        });

        static::updated(function ($model) {
            if ($model->wasChanged()) {
                app(AuditLogService::class)->log(
                    AuditAction::UPDATE,
                    $model,
                    $model->getOriginal(),
                    $model->getChanges()
                );
            }
        });

        static::deleted(function ($model) {
            if (! $model->isForceDeleting()) {
                app(AuditLogService::class)->log(
                    AuditAction::DELETE,
                    $model,
                    $model->getAttributes(),
                    null
                );
            }
        });
    }
}
