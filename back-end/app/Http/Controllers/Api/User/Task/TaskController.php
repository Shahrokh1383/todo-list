<?php

namespace App\Http\Controllers\Api\User\Task;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\CreateTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\TaskResource;
use App\Services\Contracts\TaskServiceInterface;
use App\DTOs\CreateTaskDTO;
use App\DTOs\UpdateTaskDTO;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(
        protected TaskServiceInterface $taskService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'priority', 'folder_id', 'search', 'overdue', 'per_page']);
        $tasks = $this->taskService->getAllTasks(auth()->id(), $filters);

        return $this->success(CollectionResource::make($tasks));
    }

    public function show(int $id): JsonResponse
    {
        $task = $this->taskService->getTaskById(auth()->id(), $id);

        if (!$task) {
            return $this->error('Task is not found', 404);
        }

        return $this->success(TaskResource::make($task));
    }

    public function store(CreateTaskRequest $request): JsonResponse
    {
        $dto = CreateTaskDTO::fromArray($request->validated());
        $task = $this->taskService->createTask(auth()->id(), $dto);

        return $this->created(TaskResource::make($task), 'Task successfully created');
    }

    public function update(UpdateTaskRequest $request, int $id): JsonResponse
    {
        $dto = UpdateTaskDTO::fromArray($request->validated());
        $task = $this->taskService->updateTask(auth()->id(), $id, $dto);

        if (!$task) {
            return $this->error('Task is not fount', 404);
        }

        return $this->success(TaskResource::make($task), 'Task updated');
    }

    // Soft Delete
    public function destroy(int $id): JsonResponse
    {
        if (!$this->taskService->deleteTask(auth()->id(), $id)) {
            return $this->error('Task is not found', 404);
        }

        return $this->noContent();
    }

    // Restore
    public function restore(int $id): JsonResponse
    {
        if (!$this->taskService->restoreTask(auth()->id(), $id)) {
            return $this->error('Task cannot be restored or not found', 404);
        }

        return $this->success(null, 'Task restored successfully');
    }

    // Force Delete
    public function forceDelete(int $id): JsonResponse
    {
        if (!$this->taskService->forceDeleteTask(auth()->id(), $id)) {
            return $this->error('Task cannot be deleted permanently', 404);
        }

        return $this->noContent();
    }

    public function stats(): JsonResponse
    {
        return $this->success($this->taskService->getStats(auth()->id()));
    }
}