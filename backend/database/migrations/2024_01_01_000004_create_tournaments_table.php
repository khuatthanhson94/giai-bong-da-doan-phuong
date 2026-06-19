<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('season_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo')->nullable();
            $table->string('banner')->nullable();
            $table->string('format', 30)->default('round_robin');
            $table->json('points_config')->nullable();
            $table->json('advancement_rules')->nullable();
            $table->json('tiebreaker_rules')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedTinyInteger('wizard_step')->default(1);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['season_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
