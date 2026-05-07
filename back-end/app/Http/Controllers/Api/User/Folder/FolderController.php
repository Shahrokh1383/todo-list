<?php

namespace App\Http\Controllers\Api\User\Folder;

use App\Http\Controllers\Controller;
use App\Http\Requests\Folder\CreateFolderRequest;
use App\Http\Requests\Folder\UpdateFolderRequest;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\FolderResource;
use App\Services\Contracts\FolderServiceInterface;
use App\DTOs\CreateFolderDTO;
use Illuminate\Http\JsonResponse;

class FolderController extends Controller
{
    public function __construct(
        protected FolderServiceInterface $folderService
    ) {}

    public function index(): JsonResponse
    {
        $folders = $this->folderService->getAllFolders(auth()->id());
        return $this->success(CollectionResource::make($folders));
    }

    public function show(int $id): JsonResponse
    {
        $folder = $this->folderService->getFolderById(auth()->id(), $id);
        if (!$folder) {
            return $this->error('Folder is not found', 404);
        }
        return $this->success(FolderResource::make($folder));
    }

    public function store(CreateFolderRequest $request): JsonResponse
    {
        $dto = CreateFolderDTO::fromArray($request->validated());
        $folder = $this->folderService->createFolder(auth()->id(), $dto);
        return $this->created(FolderResource::make($folder), 'Folder created successfully');
    }

    public function update(UpdateFolderRequest $request, int $id): JsonResponse
    {
        $folder = $this->folderService->updateFolder(auth()->id(), $id, $request->validated());
        if (!$folder) {
            return $this->error('Folder is not found', 404);
        }
        return $this->success(FolderResource::make($folder), 'Folder updated');
    }

    public function destroy(int $id): JsonResponse
    {
        if (!$this->folderService->deleteFolder(auth()->id(), $id)) {
            return $this->error('Folder is not found', 404);
        }
        return $this->noContent();
    }
    
    // Force Delete (Permanent)
    public function forceDelete(int $id): JsonResponse
    {
        if (!$this->folderService->forceDeleteFolder(auth()->id(), $id)) {
            return $this->error('Folder is not found', 404);
        }
        return $this->noContent();
    }
}