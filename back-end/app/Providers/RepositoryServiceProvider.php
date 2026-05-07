<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\TaskRepository;
use App\Repositories\FolderRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \App\Repositories\TaskRepository::class,
            fn ($app) => new TaskRepository(new \App\Models\Task())
        );

        $this->app->bind(
            \App\Repositories\FolderRepository::class,
            fn ($app) => new FolderRepository(new \App\Models\Folder())
        );
    }

    public function boot(): void
    {
        //
    }
}