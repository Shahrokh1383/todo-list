<?php

namespace App\Observers;

use App\Models\Task;
use App\Enums\TaskStatus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class TaskObserver
{
    public function creating(Task $task): void
    {
        if (!$task->user_id) {
            $task->user_id = auth()->id();
        }
    }

    public function created(Task $task): void
    {
        Log::info("Task created: {$task->id} by user {$task->user_id}");
        // ✅ Clear stats cache
        Cache::forget("user_{$task->user_id}_stats");
    }

    public function updated(Task $task): void
    {
        if ($task->wasChanged('status') && $task->status === TaskStatus::DONE) {
            Log::info("Task completed: {$task->id}");
        }

        if ($task->wasChanged('due_date') && $task->isOverdue()) {
            Log::warning("Task is overdue: {$task->id}");
        }
        
        // ✅ Clear stats cache
        Cache::forget("user_{$task->user_id}_stats");
    }

    public function deleted(Task $task): void
    {
        Log::info("Task soft deleted: {$task->id}");
        // ✅ Clear stats cache
        Cache::forget("user_{$task->user_id}_stats");
    }

    public function restored(Task $task): void
    {
        Log::info("Task restored: {$task->id}");
        Cache::forget("user_{$task->user_id}_stats");
    }

    public function forceDeleted(Task $task): void
    {
        Log::info("Task permanently deleted: {$task->id}");
        Cache::forget("user_{$task->user_id}_stats");
    }
}