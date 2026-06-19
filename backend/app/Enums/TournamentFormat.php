<?php

namespace App\Enums;

enum TournamentFormat: string
{
    case ROUND_ROBIN = 'round_robin';
    case LEAGUE = 'league';
    case KNOCKOUT = 'knockout';
    case GROUP_KNOCKOUT = 'group_knockout';
    case DOUBLE_ROUND = 'double_round';
}
