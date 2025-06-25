<?php
// back-end/models/User.php

class User
{
    private $conn;
    private $table_name = "user";

    // Public properties to hold user data.
    // 'password' here will specifically hold the HASHED password from the database.
    public $id;
    public $username;
    public $email;
    public $password; // This property will store the HASHED password from the DB
    public $created_at;

    public function __construct()
    {
        try {
            $database = Database::getInstance();
            $this->conn = $database->getConnection();

            if ($this->conn === null) {
                // Log and re-throw if connection is truly null, though Database::getInstance() should handle it.
                error_log("User model __construct error: Database connection is null.");
                throw new Exception("Failed to establish database connection for User model.");
            }
        } catch (Exception $e) {
            error_log("User model __construct error: " . $e->getMessage());
            // Re-throw so higher-level code (index.php's try-catch) can handle and respond with 500
            throw $e; 
        }
    }

    /**
     * Creates a new user record in the database.
     * The password should already be hashed when set to $this->password.
     * @return int|false Returns the ID of the new user on success, or false on failure.
     */
    public function create(): int|false
    {
        // SQL query to insert record
        $sql = 'INSERT INTO `' . $this->table_name . '` (username, email, password) VALUES (:username, :email, :password)';

        try {
            $stmt = $this->conn->prepare($sql);
            if ($stmt === false) {
                error_log("User create PDO prepare failed: " . print_r($this->conn->errorInfo(), true) . " SQL: " . $sql);
                return false;
            }

            // Bind values directly from object properties.
            // These properties should be set in the controller before calling create().
            $stmt->bindParam(':username', $this->username);
            $stmt->bindParam(':email', $this->email);
            $stmt->bindParam(':password', $this->password); //hashed already from AuthController

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return (int)$this->id; // Return the ID of the newly created user as an integer
            } else {
                error_log("User create PDO execute failed for email: " . $this->email . " ErrorInfo: " . print_r($stmt->errorInfo(), true));
                return false;
            }
        } catch (PDOException $e) {
            // Check for duplicate entry error (e.g., email unique constraint)
            if ($e->getCode() == '23000') { // SQLSTATE for Integrity Constraint Violation
                error_log("User create PDOException (Duplicate Entry): " . $e->getMessage() . " (Email: " . $this->email . ")");
            } else {
                error_log("User create PDOException caught: " . $e->getMessage() . " (Email: " . $this->email . ")");
            }
            return false;
        } catch (Exception $e) {
            error_log("User create general Exception caught: " . $e->getMessage() . " (Email: " . $this->email . ")");
            return false;
        }
    }

    /**
     * Finds a user by their email address.
     * @param string $email The email to search for.
     * @return array|null Returns the user data as an associative array (including password hash) if found, otherwise null.
     */
    public function findByEmail(string $email): ?array
    {
        try {
            $query = "SELECT id, username, email, password, created_at FROM `" . $this->table_name . "` WHERE email = :email LIMIT 1";

            $stmt = $this->conn->prepare($query);
            if ($stmt === false) {
                error_log("findByEmail PDO prepare failed: " . print_r($this->conn->errorInfo(), true) . " Query: " . $query);
                return null;
            }
            $stmt->bindParam(':email', $email);

            if ($stmt->execute()) {
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                // Populate object properties
                if ($row) {
                    $this->id = $row['id'];
                    $this->username = $row['username'];
                    $this->email = $row['email'];
                    $this->password = $row['password']; // This is the hashed password from DB
                    $this->created_at = $row['created_at'];
                    return $row; // Return the associative array
                }
            }
            return null; // User not found or execution failed
        } catch (Exception $e) {
            error_log("findByEmail general Exception: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Finds a user by their ID.
     * @param int $id The user ID.
     * @return array|null The user data as an associative array (excluding password hash) if found, otherwise null.
     */
    public function findById(int $id): ?array
    {
        try {
            // Exclude password from general fetch for security
            $query = "SELECT id, username, email, created_at FROM `" . $this->table_name . "` WHERE id = :id LIMIT 1"; 
            $stmt = $this->conn->prepare($query);
            if ($stmt === false) {
                error_log("findById PDO prepare failed: " . print_r($this->conn->errorInfo(), true) . " Query: " . $query);
                return null;
            }
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                // Optionally populate current object
                if ($row) {
                    $this->id = $row['id'];
                    $this->username = $row['username'];
                    $this->email = $row['email'];
                    $this->created_at = $row['created_at'];
                }
                return $row; // Return the associative array
            }
            return null; // User not found or execution failed
        } catch (Exception $e) {
            error_log("findById general Exception: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Updates an existing user record in the database.
     * Accepts user_id and an array of data to update.
     * @param int $user_id The ID of the user to update.
     * @param array $data An associative array of data to update (e.g., ['username' => 'new_name', 'email' => 'new@email.com', 'password' => 'new_password']).
     * @return bool True on success, false on failure.
     */
    public function update(int $user_id, array $data): bool
    {
        $set_parts = [];
        $params = [':id' => $user_id];

        if (isset($data['username'])) {
            $set_parts[] = "username = :username";
            $params[':username'] = $data['username'];
        }
        if (isset($data['email'])) {
            $set_parts[] = "email = :email";
            $params[':email'] = $data['email'];
        }
        // Hash password only if it's provided in the update data and not empty
        if (isset($data['password']) && !empty($data['password'])) {
            $set_parts[] = "password = :password"; // Ensure 'password' is the column name
            $params[':password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        if (empty($set_parts)) {
            return false; // Nothing to update
        }

        $query = "UPDATE " . $this->table_name . " SET " . implode(", ", $set_parts) . " WHERE id = :id";

        try {
            $stmt = $this->conn->prepare($query);
            if ($stmt === false) {
                error_log("User update PDO prepare failed: " . print_r($this->conn->errorInfo(), true) . " SQL: " . $query);
                return false;
            }

            // Bind parameters
            foreach ($params as $key => $value) {
                $param_type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($key, $value, $param_type);
            }

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("User update PDOException caught: " . $e->getMessage() . " (User ID: " . $user_id . ")");
            return false;
        } catch (Exception $e) {
            error_log("User update general Exception caught: " . $e->getMessage() . " (User ID: " . $user_id . ")");
            return false;
        }
    }

    /**
     * Deletes a user record from the database.
     * Includes deletion of related tasks and folders for data integrity.
     * @param int $user_id The ID of the user to delete.
     * @return bool True on success, false on failure.
     */
    public function delete(int $user_id): bool
    {
        // These classes should also be loaded by the autoloader.
        // If not, ensure they are required like this:
        // require_once __DIR__ . '/Task.php';
        // require_once __DIR__ . '/Folder.php';

        try {
            $taskModel = new Task();
            $taskModel->deleteAllByUser($user_id); // Pass user_id directly

            $folderModel = new Folder();
            $folderModel->deleteAllByUser($user_id); // Pass user_id directly

            $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            if ($stmt === false) {
                error_log("User delete PDO prepare failed: " . print_r($this->conn->errorInfo(), true) . " SQL: " . $query);
                return false;
            }
            $stmt->bindParam(':id', $user_id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("User delete PDOException caught: " . $e->getMessage() . " (User ID: " . $user_id . ")");
            return false;
        } catch (Exception $e) {
            error_log("User delete general Exception caught: " . $e->getMessage() . " (User ID: " . $user_id . ")");
            return false;
        }
    }

    /**
     * Returns an associative array of the current user object's data, excluding sensitive information.
     * This is useful for passing user data to Auth::login() or to the frontend.
     * @return array|null The user data, or null if essential properties are not set.
     */
    public function getData(): ?array
    {
        if (isset($this->id) && isset($this->username) && isset($this->email)) {
            return [
                'id' => $this->id,
                'username' => $this->username,
                'email' => $this->email,
                'created_at' => $this->created_at // Include if available
            ];
        }
        return null;
    }
}