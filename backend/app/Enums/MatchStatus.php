<?php

namespace App\Enums;

enum MatchStatus: string
{
    case SCHEDULED = 'scheduled';
    case LIVE = 'live';
    case HALFTIME = 'halftime';
    case FINISHED = 'finished';
    case POSTPONED = 'postponed';
    case CANCELLED = 'cancelled';
}
