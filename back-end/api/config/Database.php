<?php
// back-end/api/config/database.php

class Database {
    private static $instance = null; // Stores the single instance of the Database class
    private $conn; // Stores the PDO connection object

    private $host = 'localhost';
    private $db_name = 'todo_list';
    private $username = 'root';
    private $password = '';

    // Private constructor to prevent direct instantiation
    private function __construct() {
        $this->conn = null; // Ensure fresh connection

        try {
            // Data Source Name (DSN) for MySQL with UTF8MB4 charset for full Unicode support
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";

            // PDO options for robust and secure connections
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch results as associative arrays
                PDO::ATTR_EMULATE_PREPARES   => false,                  // Crucial for SQL Injection prevention: Use real prepared statements
            ];

            // Create a new PDO instance
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
            error_log("DEBUG: Database connection successful to " . $this->db_name);

        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            // Instead of returning null, throw an exception that can be caught by the main index.php
            throw new Exception("Database connection failed: " . $exception->getMessage());
        }
    }

    /**
     * Get the single instance of the Database class.
     * @return Database The single instance.
     */
    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get the PDO database connection object.
     * @return PDO The PDO connection object.
     */
    public function getConnection(): PDO {
        return $this->conn;
    }
}