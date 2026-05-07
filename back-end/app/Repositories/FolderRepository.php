<?php

namespace App\Repositories;

use App\Models\Folder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class FolderRepository
{
    public function __construct(
        protected Folder $model
    ) {}

    public function find(int $id): ?Model
    {
        return $this->model->withCount('tasks')->find($id);
    }

    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data): bool
    {
        $folder = $this->find($id);
        if (!$folder) return false;
        
        return $folder->update($data);
    }

    public function delete(int $id): bool
    {
        $folder = $this->find($id);
        if (!$folder) return false;
        
        return $folder->delete();
    }

    public function forceDelete(int $id): bool
    {
        // find without soft delete scope
        $folder = $this->model->withTrashed()->find($id);
        if (!$folder) return false;
        
        return $folder->forceDelete();
    }

    public function getByUser(int $userId): Collection
    {
        return $this->model->where('user_id', $userId)
            ->withCount('tasks')
            ->get();
    }

    public function existsForUser(int $userId, int $folderId): bool
    {
        return $this->model->where('id', $folderId)->where('user_id', $userId)->exists();
    }
}