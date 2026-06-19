<?php

namespace App\Providers;

use App\Repositories\Contracts\MatchRepositoryInterface;
use App\Repositories\Contracts\SeasonRepositoryInterface;
use App\Repositories\Contracts\TeamRepositoryInterface;
use App\Repositories\Contracts\TournamentRepositoryInterface;
use App\Repositories\MatchRepository;
use App\Repositories\SeasonRepository;
use App\Repositories\TeamRepository;
use App\Repositories\TournamentRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SeasonRepositoryInterface::class, SeasonRepository::class);
        $this->app->bind(TournamentRepositoryInterface::class, TournamentRepository::class);
        $this->app->bind(TeamRepositoryInterface::class, TeamRepository::class);
        $this->app->bind(MatchRepositoryInterface::class, MatchRepository::class);
    }
}
