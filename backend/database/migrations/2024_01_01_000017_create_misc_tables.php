<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('filename');
            $table->string('disk', 30)->default('local');
            $table->string('path');
            $table->unsignedBigInteger('size')->default(0);
            $table->string('type', 20)->default('full');
            $table->string('status', 20)->default('completed');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('page_type', 50);
            $table->unsignedBigInteger('page_id')->nullable();
            $table->string('url');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('referrer')->nullable();
            $table->string('session_id', 64)->nullable();
            $table->timestamp('viewed_at');
            $table->timestamps();

            $table->index(['page_type', 'page_id']);
            $table->index('viewed_at');
        });

        Schema::create('livestream_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->string('platform', 30)->default('youtube');
            $table->string('stream_url')->nullable();
            $table->string('embed_code')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->unique('match_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livestream_configs');
        Schema::dropIfExists('page_views');
        Schema::dropIfExists('backups');
        Schema::dropIfExists('notifications');
    }
};
