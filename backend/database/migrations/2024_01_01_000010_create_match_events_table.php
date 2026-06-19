<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('player_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('related_player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->string('type', 30);
            $table->unsignedTinyInteger('minute')->nullable();
            $table->unsignedTinyInteger('extra_minute')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['match_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_events');
    }
};
