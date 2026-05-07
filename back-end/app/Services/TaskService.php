<?php

namespace App\Services;

use App\Repositories\TaskRepository;
use App\Services\Contracts\TaskServiceInterface;
use App\DTOs\CreateTaskDTO;
use App\DTOs\UpdateTaskDTO;
use App\Http\Resources\TaskResource;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class TaskService implements TaskServiceInterface
{
    public function __construct(
        protected TaskRepository $repository
    ) {}

    public function getAllTasks(int $userId, array $filters = []): LengthAwarePaginator
    {
        return $this->repository->getByUser($userId, $filters);
    }

    public function getTaskById(int $userId, int $taskId): ?TaskResource
    {
        $task = $this->repository->find($taskId);
        
        $exists = $task !== null;
        $authorized = $exists && $task->user_id === $userId;
        
        if (!$authorized) {
            return null;
        }
        
        return TaskResource::make($task->load('folder'));
    }

    public function createTask(int $userId, CreateTaskDTO $dto): TaskResource
    {
        $data = $dto->toArray();
        $data['user_id'] = $userId;
        
        $task = $this->repository->create($data);
        
        Cache::forget("user_{$userId}_stats");
        
        return TaskResource::make($task->fresh(['folder']));
    }

    public function updateTask(int $userId, int $taskId, UpdateTaskDTO $dto): ?TaskResource
    {
        $exists = $this->repository->existsForUser($userId, $taskId);
        if (!$exists) {
            return null;
        }
        
        $data = $dto->toArray();
        $this->repository->update($taskId, $data);
        
        Cache::forget("user_{$userId}_stats");
        
        $task = $this->repository->find($taskId);
        return TaskResource::make($task->load('folder'));
    }

    public function deleteTask(int $userId, int $taskId): bool
    {
        $exists = $this->repository->existsForUser($userId, $taskId);
        if (!$exists) {
            return false;
        }
        
        $result = $this->repository->delete($taskId);
        
        if ($result) {
            Cache::forget("user_{$userId}_stats");
        }
        
        return $result;
    }

    public function restoreTask(int $userId, int $taskId): bool
    {
        $task = $this->repository->find($taskId);
        if (!$task || $task->user_id !== $userId) {
            return false;
        }

        return $this->repository->restore($taskId);
    }

    public function forceDeleteTask(int $userId, int $taskId): bool
    {
        $task = $this->repository->find($taskId);
        if (!$task || $task->user_id !== $userId) {
            return false;
        }

        return $this->repository->forceDelete($taskId);
    }

    public function getStats(int $userId): array
    {
        return Cache::remember("user_{$userId}_stats", 300, function () use ($userId) {
            return $this->repository->getStats($userId);
        });
    }
}