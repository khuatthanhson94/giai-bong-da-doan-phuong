<?php

namespace App\Enums;

enum AuditAction: string
{
    case CREATE = 'create';
    case UPDATE = 'update';
    case DELETE = 'delete';
    case RESTORE = 'restore';
    case LOGIN = 'login';
    case LOGOUT = 'logout';
    case EXPORT = 'export';
    case IMPORT = 'import';
    case PUBLISH = 'publish';
}
