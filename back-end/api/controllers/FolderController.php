<?php

class FolderController
{
    private $folderModel;

    public function __construct()
    {
        $this->folderModel = new Folder();
    }

    private function getUserId(): int
    {
        // Get user ID from the Auth class
        $user = Auth::user();
        if ($user && isset($user['id'])) {
            return (int)$user['id'];
        }
        // This case should ideally be caught by Auth::checkAuth() before reaching here.
        // If it reaches here, it means an authenticated route was accessed without a valid session.
        Response::error('Unauthorized: User ID not found in session.', 401);
    }

    /**
     * Handles creating a new folder.
     * Renamed from createFolder to 'create' for consistency with common API patterns and index.php routing.
     * @param array $data The input data (e.g., 'name') from the request body.
     */
    public function create(array $data) // Changed method name and explicitly accept $data
    {
        $userId = $this->getUserId(); // This will exit if not authenticated
        
        $fields = [
            'name' => ['value' => $data['name'] ?? null, 'rules' => ['required', 'min:1', 'max:255']]
        ];

        Validator::validate($fields); // Validator handles errors and exits

        $sanitizedData = Validator::getSanitizedData();

        $this->folderModel->name = $sanitizedData['name'];
        $this->folderModel->user_id = $userId;

        try {
            $folderId = $this->folderModel->create(); // Assumes create() returns the new folder ID or false
            if ($folderId) {
                // Fetch the newly created folder's details if available 
                $newFolder = $this->folderModel->findByIdAndUser($folderId, $userId);
                
                Response::success([
                    'message' => 'Folder created successfully.',
                    'folder' => [ // Nested 'folder' object
                        'id' => $newFolder['id'],
                        'name' => $newFolder['name'],
                        'user_id' => $newFolder['user_id'] // Or other relevant folder properties
                    ]
                ], 201);
            } else {
                Response::error('Failed to create folder. Database issue or duplicate name.', 500);
            }
        } catch (Exception $e) {
            error_log("FolderController create error: " . $e->getMessage());
            Response::error('An unexpected error occurred during folder creation.', 500);
        }
    }

    /**
     * Handles listing folders for the authenticated user.
     * Renamed from listFolders to 'getAll' for consistency with common API patterns.
     */
    public function getAll()
    {
        $userId = $this->getUserId();
        try {
            $folders = $this->folderModel->findByUserId($userId);
            // IMPORTANT CHANGE: Return 'folders' array directly, as expected by frontend
            Response::success(['folders' => $folders], 200); // 200 OK
        } catch (Exception $e) {
            error_log("FolderController getAll error: " . $e->getMessage());
            Response::error('An unexpected error occurred while fetching folders.', 500);
        }
    }

    public function getOne(int $folderId)
    {
        $userId = $this->getUserId();
        try {
            $folder = $this->folderModel->findByIdAndUser($folderId, $userId);

            if ($folder) {
                Response::success(['folder' => $folder], 200); // Return single 'folder' object
            } else {
                Response::error('Folder not found or you do not have access.', 404);
            }
        } catch (Exception $e) {
            error_log("FolderController getOne error: " . $e->getMessage());
            Response::error('An unexpected error occurred while fetching the folder.', 500);
        }
    }

    /**
     * Handles updating an existing folder.
     * @param int $folderId The ID of the folder to update.
     * @param array $data The input data (e.g., 'name') from the request body.
     */
    public function update(int $folderId, array $data)
    {
        $userId = $this->getUserId();
        // No need for json_decode here

        $fields = [
            'name' => ['value' => $data['name'] ?? null, 'rules' => ['required', 'min:1', 'max:255']]
            // Only 'name' is expected for update for now, add other fields if needed.
        ];

        Validator::validate($fields); // Validator handles errors and exits
        $sanitizedData = Validator::getSanitizedData();

        // Check if the folder exists and belongs to the user
        if (!$this->folderModel->exists($folderId, $userId)) {
            Response::error('Folder not found or you do not have access.', 404);
        }

        try {
            if ($this->folderModel->update($folderId, $userId, ['name' => $sanitizedData['name']])) {
                Response::success(['message' => 'Folder updated successfully.'], 200);
            } else {
                Response::error('Failed to update folder.', 500);
            }
        } catch (Exception $e) {
            error_log("FolderController update error: " . $e->getMessage());
            Response::error('An unexpected error occurred during folder update.', 500);
        }
    }

    /**
     * Handles deleting an existing folder.
     * @param int $folderId The ID of the folder to delete.
     */
    public function delete(int $folderId) // Changed method name
    {
        $userId = $this->getUserId();
        try {
            // The delete method in FolderModel should also handle unassigning tasks or deleting them.
            if ($this->folderModel->delete($folderId, $userId)) {
                Response::success(['message' => 'Folder and associated tasks deleted successfully.'], 200);
            } else {
                Response::error('Folder not found or you do not have access, or it has tasks that prevent deletion.', 404);
            }
        } catch (Exception $e) {
            error_log("FolderController delete error: " . $e->getMessage());
            Response::error('An unexpected error occurred during folder deletion.', 500);
        }
    }
}