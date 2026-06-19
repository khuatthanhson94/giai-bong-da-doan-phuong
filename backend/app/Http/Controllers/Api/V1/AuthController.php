<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RefreshTokenRequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');
        if (empty($credentials['email']) && $request->filled('username')) {
            $credentials['email'] = $request->input('username');
        }
        $result = $this->authService->login($credentials, $request->input('device_name'));


        return response()->json($result);
    }

    public function refresh(RefreshTokenRequest $request): JsonResponse
    {
        $result = $this->authService->refresh($request->input('refresh_token'));

        return response()->json($result);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout(
            $request->user(),
            $request->input('refresh_token')
        );

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }
}
