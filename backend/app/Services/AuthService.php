<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    public function login(array $credentials, ?string $deviceName = null): array
    {
        $token = auth('api')->attempt($credentials);

        if (! $token) {
            throw new \InvalidArgumentException('Email hoặc mật khẩu không đúng.');
        }

        /** @var User $user */
        $user = auth('api')->user();

        if (! $user->is_active) {
            auth('api')->logout();
            throw new \InvalidArgumentException('Tài khoản đã bị vô hiệu hóa.');
        }

        $user->update(['last_login_at' => now()]);
        $refreshTokenObj = $this->createRefreshToken($user, $deviceName);

        $this->auditLogService->log(AuditAction::LOGIN, $user);

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'refresh_token' => $refreshTokenObj->token,
            'user' => $user,
        ];
    }

    public function refresh(string $refreshToken): array
    {
        $token = RefreshToken::query()
            ->where('token', hash('sha256', $refreshToken))
            ->first();

        if (! $token || ! $token->isValid()) {
            throw new \InvalidArgumentException('Refresh token không hợp lệ hoặc đã hết hạn.');
        }

        $user = $token->user;
        $accessToken = JWTAuth::fromUser($user);

        return [
            'access_token' => $accessToken,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'user' => $user,
        ];
    }

    public function logout(User $user, ?string $refreshToken = null): void
    {
        auth('api')->logout();

        if ($refreshToken) {
            RefreshToken::query()
                ->where('user_id', $user->id)
                ->where('token', hash('sha256', $refreshToken))
                ->update(['revoked_at' => now()]);
        }

        $this->auditLogService->log(AuditAction::LOGOUT, $user);
    }

    public function register(array $data): User
    {
        return User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'] ?? 'viewer',
        ]);
    }

    private function createRefreshToken(User $user, ?string $deviceName): object
    {
        $plainToken = Str::random(64);

        RefreshToken::query()->create([
            'user_id' => $user->id,
            'token' => hash('sha256', $plainToken),
            'device_name' => $deviceName,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'expires_at' => now()->addMinutes(config('jwt.refresh_ttl')),
        ]);

        return (object) ['token' => $plainToken];
    }
}
