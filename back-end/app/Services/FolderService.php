<?php

namespace App\Services;

use App\Repositories\FolderRepository;
use App\Services\Contracts\FolderServiceInterface;
use App\DTOs\CreateFolderDTO;
use App\Http\Resources\FolderResource;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Exceptions\HttpResponseException;

class FolderService implements FolderServiceInterface
{
    public function __construct(
        protected FolderRepository $repository
    ) {}

    public function getAllFolders(int $userId): Collection
    {
        return $this->repository->getByUser($userId);
    }

    public function getFolderById(int $userId, int $folderId): ?FolderResource
    {
        $exists = $this->repository->existsForUser($userId, $folderId);
        if (!$exists) return null;
        
        $folder = $this->repository->find($folderId);
        return FolderResource::make($folder);
    }

    public function createFolder(int $userId, CreateFolderDTO $dto): FolderResource
    {
        $data = $dto->toArray();
        $data['user_id'] = $userId;
        
        try {
            $folder = $this->repository->create($data);
            return FolderResource::make($folder);
        } catch (UniqueConstraintViolationException $e) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'You have created this foldername before',
                    'errors' => ['name' => ['Name is used before']]
                ], 422)
            );
        }
    }

    public function updateFolder(int $userId, int $folderId, array $data): ?FolderResource
    {
        $exists = $this->repository->existsForUser($userId, $folderId);
        if (!$exists) return null;
        
        try {
            $this->repository->update($folderId, $data);
            $folder = $this->repository->find($folderId);
            return FolderResource::make($folder);
        } catch (UniqueConstraintViolationException $e) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'You have created this foldername before',
                    'errors' => ['name' => ['Name is used before']]
                ], 422)
            );
        }
    }

    public function deleteFolder(int $userId, int $folderId): bool
    {
        $exists = $this->repository->existsForUser($userId, $folderId);
        if (!$exists) return false;
        
        return $this->repository->delete($folderId);
    }

    public function forceDeleteFolder(int $userId, int $folderId): bool
    {
        $exists = $this->repository->existsForUser($userId, $folderId);
        if (!$exists) return false;
        
        return $this->repository->forceDelete($folderId);
    }
}