<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('jersey_number')->nullable();
            $table->string('position', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('avatar')->nullable();
            $table->boolean('is_captain')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('goals')->default(0);
            $table->unsignedSmallInteger('assists')->default(0);
            $table->unsignedSmallInteger('yellow_cards')->default(0);
            $table->unsignedSmallInteger('red_cards')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'jersey_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
