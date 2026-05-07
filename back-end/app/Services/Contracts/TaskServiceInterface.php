<?php

namespace App\Services\Contracts;

use App\DTOs\CreateTaskDTO;
use App\DTOs\UpdateTaskDTO;
use App\Http\Resources\TaskResource;
use Illuminate\Pagination\LengthAwarePaginator;

interface TaskServiceInterface
{
    public function getAllTasks(int $userId, array $filters = []): LengthAwarePaginator;
    public function getTaskById(int $userId, int $taskId): ?TaskResource;
    public function createTask(int $userId, CreateTaskDTO $dto): TaskResource;
    public function updateTask(int $userId, int $taskId, UpdateTaskDTO $dto): ?TaskResource;
    public function deleteTask(int $userId, int $taskId): bool;
    public function getStats(int $userId): array;
}