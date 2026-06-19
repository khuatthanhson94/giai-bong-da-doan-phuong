<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Traits\Auditable;
use App\Traits\Recyclable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Auditable, HasFactory, Notifiable, Recyclable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'avatar',
        'phone', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'role' => UserRole::class,
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return ['role' => $this->role->value];
    }

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(RefreshToken::class);
    }

    public function hasPermission(string $permission): bool
    {
        $roles = config('permissions.roles', []);
        $roleConfig = $roles[$this->role->value] ?? ['permissions' => []];
        $permissions = $roleConfig['permissions'] ?? [];

        if (in_array('*', $permissions, true)) {
            return true;
        }

        foreach ($permissions as $allowed) {
            if ($allowed === $permission) {
                return true;
            }
            if (str_ends_with($allowed, '.*')) {
                $prefix = substr($allowed, 0, -2);
                if (str_starts_with($permission, $prefix)) {
                    return true;
                }
            }
        }

        return false;
    }
}
