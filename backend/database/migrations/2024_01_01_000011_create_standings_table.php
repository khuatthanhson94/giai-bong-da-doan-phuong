<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('standings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tournament_group_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position')->default(0);
            $table->unsignedSmallInteger('played')->default(0);
            $table->unsignedSmallInteger('won')->default(0);
            $table->unsignedSmallInteger('drawn')->default(0);
            $table->unsignedSmallInteger('lost')->default(0);
            $table->unsignedSmallInteger('goals_for')->default(0);
            $table->unsignedSmallInteger('goals_against')->default(0);
            $table->smallInteger('goal_difference')->default(0);
            $table->unsignedSmallInteger('points')->default(0);
            $table->json('tiebreaker_data')->nullable();
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->unique(['tournament_id', 'tournament_group_id', 'team_id'], 'standings_unique');
            $table->index(['tournament_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('standings');
    }
};
