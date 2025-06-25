<?php

class Task
{
    private $conn;
    private $table_name = "tasks"; 

    public $id;
    public $title;
    public $description;
    public $folder_id;
    public $user_id;
    public $status; // 'todo', 'in_progress', 'done'
    public $priority; // 'low', 'medium', 'high'
    public $due_date;
    public $created_at;
    public $updated_at;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->conn = $database->getConnection();
    }

    public function create(): int|false
    {
        $query = "INSERT INTO " . $this->table_name . " (title, description, folder_id, user_id, status, priority, due_date) VALUES (:title, :description, :folder_id, :user_id, :status, :priority, :due_date)";
        $stmt = $this->conn->prepare($query);

        // Sanitize should ideally happen in the Validator/Controller before data reaches the model.
        // Data should already be clean here.

        // Bind values from object properties
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":folder_id", $this->folder_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $this->user_id, PDO::PARAM_INT);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":priority", $this->priority);
        // Bind due_date as null if it's an empty string or null, otherwise as string
        $stmt->bindValue(":due_date", empty($this->due_date) ? null : $this->due_date, empty($this->due_date) ? PDO::PARAM_NULL : PDO::PARAM_STR);

        try {
            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return $this->id; // Return the ID of the newly created task
            }
        } catch (PDOException $e) {
            error_log("Task creation error (PDO): " . $e->getMessage());
        }
        return false;
    }

    /**
     * Finds tasks by user ID, with optional filtering by folder_id and status.
     * @param int $user_id The ID of the user.
     * @param int|null $folder_id Optional folder ID to filter tasks. Null means all tasks for the user.
     * A specific integer means tasks within that folder.
     * 0 or a specific indicator could mean tasks with NULL folder_id.
     * @param string|null $status Optional status ('todo', 'in_progress', 'done') to filter tasks.
     * @return array An array of task data.
     */
    public function findByUserId(int $user_id, int $folder_id = null, string $status = null): array
    {
        // Start with the base query for the user
        $query = "SELECT t.*, f.name as folder_name FROM " . $this->table_name . " t LEFT JOIN folder f ON t.folder_id = f.id WHERE t.user_id = :user_id";
        $params = [':user_id' => $user_id];
        $param_types = [':user_id' => PDO::PARAM_INT];

        // Adjust logic for folder_id filter
        // If folder_id is explicitly 0 (from frontend 'all-tasks-folder' mapping to 0 for unassigned tasks)
        // or if it's null (meaning the "All Tasks" view where we want ALL tasks regardless of folder)
        // If $folder_id is explicitly passed as null, it means "All Tasks" view in frontend, so don't filter by folder_id.
        // If $folder_id is 0, it means unassigned tasks (folder_id IS NULL in DB)
        // If $folder_id is a positive integer, it means tasks within that specific folder.
        
        // This is the core change:
        if ($folder_id !== null) { // If a folder ID was provided (could be an actual ID or 0 for unassigned)
            if ($folder_id === 0) { // Special case: frontend maps 'all-tasks-folder' to 0 for unassigned
                $query .= " AND t.folder_id IS NULL"; // Only tasks not in any folder
            } else { // It's a specific folder ID
                $query .= " AND t.folder_id = :folder_id";
                $params[':folder_id'] = $folder_id;
                $param_types[':folder_id'] = PDO::PARAM_INT;
            }
        }
        // If $folder_id is null, no folder filtering is applied, retrieving ALL tasks for the user.

        // Add status filter if provided
        if ($status !== null) {
            $query .= " AND t.status = :status";
            $params[':status'] = $status;
            $param_types[':status'] = PDO::PARAM_STR;
        }

        $query .= " ORDER BY t.created_at DESC";

        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, $param_types[$key]);
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


    public function findById(int $task_id, int $user_id): ?array
    {
        $query = "SELECT t.*, f.name as folder_name FROM " . $this->table_name . " t LEFT JOIN folder f ON t.folder_id = f.id WHERE t.id = :id AND t.user_id = :user_id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $task_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null; // Return null if not found
    }

    // Modified update method to accept data array and id, user_id
    public function update(int $task_id, int $user_id, array $data): bool
    {
        $set_parts = [];
        $params = [
            ':id' => $task_id,
            ':user_id' => $user_id
        ];

        if (array_key_exists('title', $data)) {
            $set_parts[] = "title = :title";
            $params[':title'] = $data['title'];
        }
        if (array_key_exists('description', $data)) {
            $set_parts[] = "description = :description";
            $params[':description'] = $data['description'];
        }
        if (array_key_exists('folder_id', $data)) {
            $set_parts[] = "folder_id = :folder_id";
            // Convert 0 to null for database storage if task is being moved out of a folder
            $params[':folder_id'] = ($data['folder_id'] === 0) ? null : $data['folder_id'];
        }
        if (array_key_exists('status', $data)) {
            $set_parts[] = "status = :status";
            $params[':status'] = $data['status'];
        }
        if (array_key_exists('priority', $data)) {
            $set_parts[] = "priority = :priority";
            $params[':priority'] = $data['priority'];
        }
        if (array_key_exists('due_date', $data)) {
            $set_parts[] = "due_date = :due_date";
            // Bind due_date as null if it's an empty string or null, otherwise as string
            $params[':due_date'] = empty($data['due_date']) ? null : $data['due_date'];
        }

        if (empty($set_parts)) {
            return false; // Nothing to update
        }

        $set_parts[] = "updated_at = NOW()"; // Always update timestamp
        $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $set_parts) . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            // Determine type for binding, specifically handling null for folder_id and due_date
            if (($key === ':folder_id' || $key === ':due_date') && $value === null) {
                $stmt->bindValue($key, null, PDO::PARAM_NULL);
            } else {
                $param_type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($key, $value, $param_type);
            }
        }

        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Task update error (PDO): " . $e->getMessage());
            return false;
        }
    }

    public function delete(int $task_id, int $user_id): bool
    {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $task_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);

        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Task deletion error (PDO): " . $e->getMessage());
            return false;
        }
    }

    public function deleteByFolder(int $folder_id, int $user_id): bool
    {
        // This is called by Folder model to delete tasks when a folder is deleted
        // Note: It deletes ALL tasks within that specific folder for that user.
        $query = "DELETE FROM " . $this->table_name . " WHERE folder_id = :folder_id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":folder_id", $folder_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Tasks deletion by folder error (PDO): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Deletes all tasks for a given user.
     * Called when a user account is deleted.
     */
    public function deleteAllByUser(int $user_id): bool
    {
        $query = "DELETE FROM " . $this->table_name . " WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Tasks deleteAllByUser error (PDO): " . $e->getMessage());
            return false;
        }
    }

    public function exists(int $task_id, int $user_id): bool
    {
        $query = "SELECT COUNT(*) FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $task_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() > 0;
    }
}