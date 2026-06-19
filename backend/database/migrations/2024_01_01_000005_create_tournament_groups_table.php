<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 10)->nullable();
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->unsignedTinyInteger('teams_to_advance')->default(2);
            $table->timestamps();

            $table->unique(['tournament_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_groups');
    }
};
