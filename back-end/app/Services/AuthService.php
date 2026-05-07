<?php

namespace App\Services;

use App\Models\User;
use App\Services\Contracts\AuthServiceInterface;
use App\DTOs\RegisterDTO;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Exceptions\HttpResponseException;

use function Symfony\Component\Clock\now;

class AuthService implements AuthServiceInterface
{
    public function register(RegisterDTO $dto): array
    {
        return DB::transaction(function () use ($dto) {
            $data = $dto->toArray();
            $data['password'] = Hash::make($dto->password);
            $data['email_verified_at'] = now();
            $data['remember_token'] = Str::random(60);
            
            $user = User::create($data);
            
            // For sending a real email link system
            //event(new Registered($user));
            
            $token = $user->createToken('auth_token')->plainTextToken;

            return [
                'user' => $user,
                'token' => $token,
            ];
        });
    }

    public function login(array $credentials, bool $remember = false): array
    {
        if (!auth()->attempt($credentials, $remember)) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'Informations are invalid'
                ], 401)
            );
        }

        $user = auth()->user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    public function logout(): void
    {
        auth()->user()->currentAccessToken()->delete();
    }

    public function me(): User
    {
        return auth()->user();
    }

    public function updateProfile(User $user, array $data): User
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        
        return $user->fresh();
    }

    public function uploadAvatar(User $user, string $path): User
    {
        $user->update(['avatar' => $path]);
        
        return $user->fresh();
    }

    public function deleteAvatar(User $user): void
    {
        DB::transaction(function () use ($user) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $user->update(['avatar' => null]);
        });
    }

    public function sendPasswordResetLink(string $email): array
    {
        //For sending to a real user
        //$status = Password::sendResetLink(['email' => $email]);

        //Since we are testing our serveices we use the method below
        $user = User::where('email', $email)->first();

        if (!$user) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404)
            );
        }

        $token = Password::createToken($user);

        return [
            'token' => $token,
            'email' => $user->email
        ];

    }

    public function resetPassword(array $data): void
    {
        $status = Password::reset($data, function ($user, $password) {
            $user->password = Hash::make($password);
            $user->setRememberToken(Str::random(60));
            $user->save();
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => __($status)
                ], 400)
            );
        }
    }
}