<?php

namespace App\Enums;

enum SponsorTier: string
{
    case DIAMOND = 'diamond';
    case GOLD = 'gold';
    case SILVER = 'silver';
    case PARTNER = 'partner';
}
