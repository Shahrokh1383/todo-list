<?php

namespace App\Http\Controllers\Api\User\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Requests\Auth\UpdateAvatarRequest;
use App\Http\Resources\UserResource;
use App\Services\Contracts\AuthServiceInterface;
use App\DTOs\RegisterDTO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        protected AuthServiceInterface $authService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $dto = RegisterDTO::fromArray($request->validated());
        $result = $this->authService->register($dto);

        return $this->created(
            ['user' => UserResource::make($result['user']), 'token' => $result['token']],
            'User signedup successfully'
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only(['email', 'password']);
        $remember = $request->boolean('remember');

        $result = $this->authService->login($credentials, $remember);

        return $this->success(
            ['user' => UserResource::make($result['user']), 'token' => $result['token']],
            'Login successfully'
        );
    }

    public function logout(): JsonResponse
    {
        $this->authService->logout();

        return $this->success(null, 'Logout successfully');
    }

    public function me(): JsonResponse
    {
        return $this->success(UserResource::make($this->authService->me()));
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->authService->updateProfile(auth()->user(), $request->validated());

        return $this->success(UserResource::make($user), 'Profile updated');
    }

    public function uploadAvatar(UpdateAvatarRequest $request): JsonResponse
    {
        $file = $request->file('avatar');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $filename, 'public');
        
        $user = $this->authService->uploadAvatar(auth()->user(), $path);
        
        return $this->success(
            ['avatar_url' => $user->avatar_url],
            'Profile image uploaded successfully'
        );
    }

    public function deleteAvatar(): JsonResponse
    {
        $this->authService->deleteAvatar(auth()->user());

        return $this->success(null, 'Profile image deleted successfully');
    }

    public function getAvatar(string $filename): \Symfony\Component\HttpFoundation\Response
    {
        $filename = basename($filename);
        $path = 'avatars/' . $filename;

        if (!Storage::disk('public')->exists($path)) {
            abort(404, 'Image not found');
        }

        return response()->file(Storage::disk('public')->path($path));
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $data = $this->authService->sendPasswordResetLink($request->email);

        return $this->success($data, 'Reset token generated successfully');
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'min:8', 'confirmed'],
        ]);

        $this->authService->resetPassword($request->only('email', 'password', 'password_confirmation', 'token'));

        return $this->success(null, 'Password changed successfully');
    }
}