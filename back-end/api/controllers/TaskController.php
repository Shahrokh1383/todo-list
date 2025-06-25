<?php

class TaskController
{
    private $taskModel;
    private $folderModel;

    public function __construct()
    {
        $this->taskModel = new Task();
        $this->folderModel = new Folder();
    }

    private function getUserId(): int
    {
        $user = Auth::user();
        if ($user && isset($user['id'])) {
            return (int)$user['id'];
        }
        // This case should ideally be caught by Auth::checkAuth() before reaching here.
        // If it reaches here, it means an authenticated route was accessed without a valid session.
        Response::error('Unauthorized: User ID not found in session.', 401);
    }

    /**
     * Handles creating a new task.
     * Renamed from createTask to 'create' for consistency with common API patterns and index.php routing.
     * @param array $data The input data (e.g., 'title', 'description', 'folder_id', etc.) from the request body.
     */
    public function create(array $data) 
    {
        $userId = $this->getUserId(); // This will exit if not authenticated
        
        $fields = [
            'title' => ['value' => $data['title'] ?? null, 'rules' => ['required', 'min:1', 'max:255']],
            'description' => ['value' => $data['description'] ?? null, 'rules' => ['nullable', 'max:1000']],
            // folder_id can be 0 or null from frontend, convert to null for DB if 0.
            'folder_id' => ['value' => $data['folder_id'] ?? null, 'rules' => ['nullable', 'numeric']],
            'status' => ['value' => $data['status'] ?? 'todo', 'rules' => ['required', 'in:todo,in_progress,done']], // Default to 'todo'
            'priority' => ['value' => $data['priority'] ?? 'medium', 'rules' => ['required', 'in:low,medium,high']], // Default to 'medium'
            'due_date' => ['value' => $data['due_date'] ?? null, 'rules' => ['nullable', 'date_format:Y-m-d']]
        ];

        Validator::validate($fields);
        $sanitizedData = Validator::getSanitizedData();

        // Check if folder_id is provided and if it exists and belongs to the user
        // Note: Sanitized data for nullable numeric will be null or int
        if ($sanitizedData['folder_id'] !== null && $sanitizedData['folder_id'] !== 0) {
            if (!$this->folderModel->exists($sanitizedData['folder_id'], $userId)) {
                Response::error('Invalid folder_id: Folder not found or you do not have access.', 400);
            }
        } else {
            // Explicitly set folder_id to null if it was 0 or not provided.
            $sanitizedData['folder_id'] = null;
        }

        $this->taskModel->title = $sanitizedData['title'];
        $this->taskModel->description = $sanitizedData['description'];
        $this->taskModel->folder_id = $sanitizedData['folder_id'];
        $this->taskModel->user_id = $userId;
        $this->taskModel->status = $sanitizedData['status'];
        $this->taskModel->priority = $sanitizedData['priority'];
        $this->taskModel->due_date = $sanitizedData['due_date'];

        try {
            $newTaskId = $this->taskModel->create();
            if ($newTaskId) {
                $newTask = $this->taskModel->findById($newTaskId, $userId); 
                if ($newTask) {
                    // Return the 'task' object directly, as expected by frontend
                    Response::success(['message' => 'Task created successfully', 'task' => $newTask], 201);
                } else {
                    Response::error('Task created but failed to retrieve full task data.', 500);
                }
            } else {
                Response::error('Failed to create task.', 500);
            }
        } catch (Exception $e) {
            error_log("TaskController create error: " . $e->getMessage());
            Response::error('An unexpected error occurred during task creation.', 500);
        }
    }

    /**
     * Handles listing tasks for the authenticated user, with optional filtering by folder_id and status.
     * Renamed from listTasks to 'getAll' for consistency.
     * @param int|null $folderId Optional folder ID to filter tasks.
     * @param string|null $status Optional status (e.g., 'todo', 'done') to filter tasks.
     */
    public function getAll(int $folderId = null, string $status = null) // Changed method name and added optional parameters
    {
        $userId = $this->getUserId();

        // If folderId is provided (and not null/0), verify it
        if ($folderId !== null && $folderId !== 0) {
            if (!$this->folderModel->exists($folderId, $userId)) {
                Response::error('Folder not found or you do not have access.', 404);
            }
        } else {
            $folderId = null; // Ensure it's null for 'all tasks' scenario in model
        }

        try {
            // The Task model's findByUserId should be flexible enough to handle folder_id and status filters
            $tasks = $this->taskModel->findByUserId($userId, $folderId, $status);
            Response::success(['tasks' => $tasks], 200); 
        } catch (Exception $e) {
            error_log("TaskController getAll error: " . $e->getMessage());
            Response::error('An unexpected error occurred while fetching tasks.', 500);
        }
    }


    /**
     * Handles getting a single task by ID.
     * @param int $taskId The ID of the task to retrieve.
     */
    public function getOne(int $taskId) 
    {
        $userId = $this->getUserId();
        try {
            $task = $this->taskModel->findById($taskId, $userId);

            if ($task) {
                // Return single 'task' object
                Response::success(['task' => $task], 200); 
            } else {
                Response::error('Task not found or you do not have access.', 404);
            }
        } catch (Exception $e) {
            error_log("TaskController getOne error: " . $e->getMessage());
            Response::error('An unexpected error occurred while fetching the task.', 500);
        }
    }

    /**
     * Handles updating an existing task.
     * @param int $taskId The ID of the task to update.
     * @param array $data The input data (e.g., 'title', 'status', 'folder_id') from the request body.
     */
    public function update(int $taskId, array $data) 
    {
        $userId = $this->getUserId();

        // Define fields for validation (only those expected for update)
        $fields = [];
        if (array_key_exists('title', $data)) {
            $fields['title'] = ['value' => $data['title'], 'rules' => ['required', 'min:1', 'max:255']];
        }
        if (array_key_exists('description', $data)) {
            $fields['description'] = ['value' => $data['description'], 'rules' => ['nullable', 'max:1000']];
        }
        if (array_key_exists('folder_id', $data)) {
            $fields['folder_id'] = ['value' => $data['folder_id'], 'rules' => ['nullable', 'numeric']];
        }
        if (array_key_exists('status', $data)) {
            $fields['status'] = ['value' => $data['status'], 'rules' => ['required', 'in:todo,in_progress,done']];
        }
        if (array_key_exists('priority', $data)) {
            $fields['priority'] = ['value' => $data['priority'], 'rules' => ['required', 'in:low,medium,high']];
        }
        if (array_key_exists('due_date', $data)) {
            $fields['due_date'] = ['value' => $data['due_date'], 'rules' => ['nullable', 'date_format:Y-m-d']];
        }

        if (empty($fields)) {
            Response::error('No data provided for update.', 400);
        }

        Validator::validate($fields); 
        $sanitizedData = Validator::getSanitizedData();

        // If folder_id is being updated, verify it
        if (array_key_exists('folder_id', $sanitizedData)) {
            // Convert 0 to null if it comes from frontend and needs to be null in DB
            if ($sanitizedData['folder_id'] === 0) {
                $sanitizedData['folder_id'] = null;
            } elseif ($sanitizedData['folder_id'] !== null) { // Only check if it's not null (i.e., it's a folder ID)
                if (!$this->folderModel->exists($sanitizedData['folder_id'], $userId)) {
                    Response::error('Invalid folder_id: Folder not found or you do not have access.', 400);
                }
            }
        }

        // Check if the task exists and belongs to the user
        if (!$this->taskModel->exists($taskId, $userId)) {
            Response::error('Task not found or you do not have access.', 404);
        }

        try {
            if ($this->taskModel->update($taskId, $userId, $sanitizedData)) {
                Response::success(['message' => 'Task updated successfully.'], 200);
            } else {
                Response::error('Failed to update task.', 500);
            }
        } catch (Exception $e) {
            error_log("TaskController update error: " . $e->getMessage());
            Response::error('An unexpected error occurred during task update.', 500);
        }
    }

    /**
     * Handles deleting an existing task.
     * @param int $taskId The ID of the task to delete.
     */
    public function delete(int $taskId) 
    {
        $userId = $this->getUserId();
        try {
            if ($this->taskModel->delete($taskId, $userId)) {
                Response::success(['message' => 'Task deleted successfully.'], 200);
            } else {
                Response::error('Task not found or you do not have access.', 404);
            }
        } catch (Exception $e) {
            error_log("TaskController delete error: " . $e->getMessage());
            Response::error('An unexpected error occurred during task deletion.', 500);
        }
    }
}