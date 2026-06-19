<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tournament_group_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('home_team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('away_team_id')->constrained('teams')->cascadeOnDelete();
            $table->unsignedTinyInteger('round')->default(1);
            $table->unsignedTinyInteger('matchday')->nullable();
            $table->string('bracket_position', 20)->nullable();
            $table->string('venue')->nullable();
            $table->dateTime('scheduled_at')->nullable();
            $table->string('status', 20)->default('scheduled');
            $table->unsignedTinyInteger('home_score')->nullable();
            $table->unsignedTinyInteger('away_score')->nullable();
            $table->unsignedTinyInteger('home_penalty_score')->nullable();
            $table->unsignedTinyInteger('away_penalty_score')->nullable();
            $table->foreignId('mvp_player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tournament_id', 'status']);
            $table->index(['tournament_id', 'round']);
            $table->index('scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
