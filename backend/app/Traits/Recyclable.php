<?php

namespace App\Traits;

use App\Models\RecycleBin;
use App\Services\RecycleBinService;
use Illuminate\Database\Eloquent\SoftDeletes;

trait Recyclable
{
    use SoftDeletes;

    public static function bootRecyclable(): void
    {
        static::deleted(function ($model) {
            if ($model->isForceDeleting()) {
                return;
            }

            app(RecycleBinService::class)->trackDeletion($model);
        });

        static::restored(function ($model) {
            RecycleBin::query()
                ->where('recyclable_type', $model->getMorphClass())
                ->where('recyclable_id', $model->getKey())
                ->delete();
        });
    }
}
