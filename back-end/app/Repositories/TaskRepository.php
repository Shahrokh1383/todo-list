<?php

namespace App\Repositories;

use App\Models\Task;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

class TaskRepository
{
    public function __construct(
        protected Task $model
    ) {}

    public function find(int $id): ?Model
    {
        return $this->model->with(['folder'])->withTrashed()->find($id);
    }

    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data): bool
    {
        $task = $this->model->find($id);
        if (!$task) return false;
        
        return $task->update($data);
    }

    // Soft Delete
    public function delete(int $id): bool
    {
        $task = $this->model->find($id);
        if (!$task) return false;
        
        return $task->delete();
    }

    // Force Delete
    public function forceDelete(int $id): bool
    {
        $task = $this->model->withTrashed()->find($id);
        if (!$task) return false;
        
        return $task->forceDelete();
    }

    // Restore
    public function restore(int $id): bool
    {
        $task = $this->model->withTrashed()->find($id);
        if (!$task) return false;
        
        return $task->restore();
    }

    public function getByUser(int $userId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->query()
            ->where('user_id', $userId)
            ->with(['folder']);

        if (isset($filters['status'])) {
            $query->byStatus($filters['status']);
        }

        if (isset($filters['priority'])) {
            $query->byPriority($filters['priority']);
        }

        if (isset($filters['folder_id'])) {
            $query->where('folder_id', $filters['folder_id']);
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $search = '%' . addcslashes($filters['search'], '%_') . '%';
            $query->where('title', 'like', $search);
        }

        if (isset($filters['overdue']) && $filters['overdue']) {
            $query->overdue();
        }

        return $query->paginate($perPage);
    }

    public function getStats(int $userId): array
    {
        return [
            'total' => $this->model->where('user_id', $userId)->count(),
            'completed' => $this->model->where('user_id', $userId)->completed()->count(),
            'pending' => $this->model->where('user_id', $userId)->pending()->count(),
            'overdue' => $this->model->where('user_id', $userId)->overdue()->count(),
            'today' => $this->model->where('user_id', $userId)->today()->count(),
        ];
    }

    public function existsForUser(int $userId, int $taskId): bool
    {
        return $this->model->where('id', $taskId)->where('user_id', $userId)->exists();
    }
}