<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\User\Auth\AuthController;
use App\Http\Controllers\Api\User\Task\TaskController;
use App\Http\Controllers\Api\User\Folder\FolderController;

// Public Routes
Route::prefix('user')->middleware(['throttle:5,1'])->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

Route::prefix('user')->group(function () {
    Route::get('/auth/avatar/{filename}', [AuthController::class, 'getAvatar'])
        ->where('filename', '.*');
});

// Protected Routes
Route::prefix('user')->middleware(['throttle:30,1', 'auth:sanctum'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);
    Route::delete('/auth/avatar', [AuthController::class, 'deleteAvatar']);

    Route::get('/tasks/stats', [TaskController::class, 'stats']);
    Route::post('/tasks/{id}/restore', [TaskController::class, 'restore']);
    Route::delete('/tasks/{id}/force', [TaskController::class, 'forceDelete']);
    Route::apiResource('tasks', TaskController::class);

    Route::delete('/folders/{id}/force', [FolderController::class, 'forceDelete']);
    Route::apiResource('folders', FolderController::class);
});