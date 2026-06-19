<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sponsors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('season_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('tournament_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('logo')->nullable();
            $table->string('website_url')->nullable();
            $table->string('tier', 20)->default('partner');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsors');
    }
};
