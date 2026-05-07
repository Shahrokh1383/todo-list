<?php

namespace App\Services\Contracts;

use App\DTOs\RegisterDTO;
use App\Http\Resources\UserResource;
use App\Models\User;

interface AuthServiceInterface
{
    public function register(RegisterDTO $dto): array;
    public function login(array $credentials, bool $remember = false): array;
    public function logout(): void;
    public function me(): User;
    public function updateProfile(User $user, array $data): User;
    public function uploadAvatar(User $user, string $path): User;
    public function deleteAvatar(User $user): void;
    public function sendPasswordResetLink(string $email): array;
    public function resetPassword(array $data): void;
}