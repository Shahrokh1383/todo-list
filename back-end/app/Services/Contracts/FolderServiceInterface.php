<?php

namespace App\Services\Contracts;

use App\DTOs\CreateFolderDTO;
use App\Http\Resources\FolderResource;
use Illuminate\Database\Eloquent\Collection;

interface FolderServiceInterface
{
    public function getAllFolders(int $userId): Collection;
    public function getFolderById(int $userId, int $folderId): ?FolderResource;
    public function createFolder(int $userId, CreateFolderDTO $dto): FolderResource;
    public function updateFolder(int $userId, int $folderId, array $data): ?FolderResource;
    public function deleteFolder(int $userId, int $folderId): bool;
}