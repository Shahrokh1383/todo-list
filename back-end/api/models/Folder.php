<?php

class Folder
{
    private $conn;
    private $table_name = "folder"; 

    public $id;
    public $name;
    public $user_id;
    public $created_at;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->conn = $database->getConnection();
    }

    public function create(): int|false
    {
        $query = "INSERT INTO " . $this->table_name . " (name, user_id) VALUES (:name, :user_id)";
        $stmt = $this->conn->prepare($query);

        // Sanitize should ideally happen in the validator/controller before data reaches the model.
        // Data should already be clean here.

        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":user_id", $this->user_id);

        try {
            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return $this->id; // Return the ID of the newly created folder
            }
        } catch (PDOException $e) {
            // Log the specific PDO error
            error_log("Folder creation error (PDO): " . $e->getMessage());
        }
        return false;
    }

    public function findByUserId(int $user_id): array
    {
        $query = "SELECT id, name, user_id, created_at FROM " . $this->table_name . " WHERE user_id = :user_id ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findByIdAndUser(int $folder_id, int $user_id): ?array
    {
        $query = "SELECT id, name, user_id, created_at FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $folder_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null; // Return null if not found
    }

    public function update(int $folder_id, int $user_id, array $data): bool
    {
        $set_parts = [];
        $params = [
            ':id' => $folder_id,
            ':user_id' => $user_id
        ];

        if (isset($data['name'])) {
            $set_parts[] = "name = :name";
            // Sanitization assumed to be done in Validator/Controller
            $params[':name'] = $data['name'];
        }

        if (empty($set_parts)) {
            return false; // Nothing to update
        }

        $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $set_parts) . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            $param_type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($key, $value, $param_type);
        }

        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Folder update error: " . $e->getMessage());
            return false;
        }
    }

    public function delete(int $folder_id, int $user_id): bool
    {
        // First, check if the folder exists and belongs to the user
        $existingFolder = $this->findByIdAndUser($folder_id, $user_id);
        if (!$existingFolder) {
            return false; // Folder not found or not owned by user
        }

        // Instantiate Task model to delete associated tasks.
        $taskModel = new Task(); 
        // Pass folder_id and user_id directly to the Task model's delete method (deleteByFolder)
        $taskModel->deleteByFolder($folder_id, $user_id); // Assuming this method exists and is correct

        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $folder_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);

        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Folder deletion error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Deletes all folders and their associated tasks for a given user.
     * Called when a user account is deleted (e.g., from UserController).
     */
    public function deleteAllByUser(int $user_id): bool
    {
        // First, delete all tasks belonging to this user
        $taskModel = new Task(); 
        // Call deleteAllByUser directly with user_id on Task model
        $taskModel->deleteAllByUser($user_id); // Assuming this method exists and is correct

        $query = "DELETE FROM " . $this->table_name . " WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Folders deleteAllByUser error: " . $e->getMessage());
            return false;
        }
    }

    public function exists(int $folder_id, int $user_id): bool
    {
        $query = "SELECT COUNT(*) FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $folder_id, PDO::PARAM_INT);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() > 0;
    }
}