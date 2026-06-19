<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_team', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('seed')->nullable();
            $table->unsignedInteger('ranking')->nullable();
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['tournament_group_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_team');
    }
};
