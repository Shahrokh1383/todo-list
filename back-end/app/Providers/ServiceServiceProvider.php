<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\TaskService;
use App\Services\FolderService;
use App\Services\AuthService;
use App\Services\Contracts\TaskServiceInterface;
use App\Services\Contracts\FolderServiceInterface;
use App\Services\Contracts\AuthServiceInterface;

class ServiceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(TaskServiceInterface::class, TaskService::class);
        $this->app->bind(FolderServiceInterface::class, FolderService::class);
        $this->app->bind(AuthServiceInterface::class, AuthService::class);
    }

    public function boot(): void
    {
        //
    }
}