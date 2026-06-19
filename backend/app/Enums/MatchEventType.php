<?php

namespace App\Enums;

enum MatchEventType: string
{
    case GOAL = 'goal';
    case ASSIST = 'assist';
    case YELLOW_CARD = 'yellow_card';
    case RED_CARD = 'red_card';
    case PENALTY_SCORED = 'penalty_scored';
    case PENALTY_MISSED = 'penalty_missed';
    case OWN_GOAL = 'own_goal';
    case SUBSTITUTION = 'substitution';
    case MVP = 'mvp';
}
