<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class News extends Model
{
    use Auditable, Recyclable;

    protected $table = 'news';

    protected $fillable = [
        'season_id', 'tournament_id', 'author_id', 'title', 'slug',
        'excerpt', 'content', 'featured_image', 'meta_title',
        'meta_description', 'meta_keywords', 'og_image',
        'status', 'is_featured', 'view_count', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_featured' => 'boolean',
            'view_count' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
