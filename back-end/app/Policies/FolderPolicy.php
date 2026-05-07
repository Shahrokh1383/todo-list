<?php

namespace App\Policies;

use App\Models\Folder;
use App\Models\User;

class FolderPolicy
{
    /**
     * Determine if the user can view any folders.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine if the user can view the folder.
     */
    public function view(User $user, Folder $folder): bool
    {
        return $user->id === $folder->user_id;
    }

    /**
     * Determine if the user can create folders.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine if the user can update the folder.
     */
    public function update(User $user, Folder $folder): bool
    {
        return $user->id === $folder->user_id;
    }

    /**
     * Determine if the user can delete the folder.
     */
    public function delete(User $user, Folder $folder): bool
    {
        return $user->id === $folder->user_id;
    }

    /**
     * Determine if the user can restore the folder.
     */
    public function restore(User $user, Folder $folder): bool
    {
        return $user->id === $folder->user_id;
    }

    /**
     * Determine if the user can permanently delete the folder.
     */
    public function forceDelete(User $user, Folder $folder): bool
    {
        return $user->id === $folder->user_id;
    }
}