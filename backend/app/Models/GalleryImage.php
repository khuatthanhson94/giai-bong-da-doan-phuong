<?php

namespace App\Models;

use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GalleryImage extends Model
{
    use Recyclable;

    protected $fillable = [
        'album_id', 'title', 'image_path', 'thumbnail_path',
        'caption', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function album(): BelongsTo
    {
        return $this->belongsTo(Album::class);
    }
}
