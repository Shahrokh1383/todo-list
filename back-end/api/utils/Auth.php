<?php
// back-end/api/utils/Auth.php

class Auth
{
    private static $user_data = null; // Stores currently authenticated user data (excluding sensitive password hash)
    private static $sessionInitialized = false; // Flag to ensure init() runs only once

    /**
     * Initializes the session and tries to load user data if authenticated.
     * This method MUST be called once at the very beginning of the application 
     *
     * IMPORTANT: session_set_cookie_params() and session_start() are now handled
     * directly in index.php BEFORE Auth::init() is called,
     * as per PHP's requirement that cookie parameters be set before session starts.
     */
    public static function init()
    {
        if (!self::$sessionInitialized) {

            self::$sessionInitialized = true; // Mark as initialized

            // Attempt to load user data from session if available
            if (isset($_SESSION['user_id'])) {
                // Ensure the User model is available (through autoloader)
                $userModel = new User();
                // findById will return the safe user data (without password hash)
                $foundUser = $userModel->findById($_SESSION['user_id']); 
                if ($foundUser) {
                    // Populate static user_data directly from $foundUser (which is already safe)
                    self::$user_data = $foundUser;
                    // error_log("DEBUG: Auth::init - User data loaded from session for ID: " . $_SESSION['user_id']); // Uncomment for debugging
                } else {
                    // User ID in session but not found in DB (e.g., user deleted)
                    self::logout(); // Clear the invalid session
                    // error_log("DEBUG: Auth::init - User ID in session not found in DB. Session cleared."); // Uncomment for debugging
                }
            } else {
                // error_log("DEBUG: Auth::init - No user_id in session."); // Uncomment for debugging
            }
        }
    }

    /**
     * Attempts to log in a user with given email and password.
     * @param string $email
     * @param string $password
     * @return bool True on successful login, false otherwise.
     */
    public static function attempt(string $email, string $password): bool
    {
        $userModel = new User();
        // findByEmail will return the user data array, including the hashed password
        $foundUser = $userModel->findByEmail($email); 

        if ($foundUser) {
            // Verify the provided password against the hashed password from the database
            if (password_verify($password, $foundUser['password'])) { // Access 'password' key from the fetched array
                // Login successful. Pass the user data (excluding password hash) to loginUser.
                // We fetch the safe user data (without password hash) to store in session/static property.
                $safeUserData = $userModel->findById($foundUser['id']); 
                if ($safeUserData) {
                    self::loginUser($safeUserData); // Call the static loginUser method with the safe user array
                    return true;
                }
            }
        }
        // error_log("DEBUG: Auth::attempt - Login failed for email: " . $email); // Uncomment for debugging
        return false;
    }

    /**
     * Stores user data in the session after successful authentication.
     * @param array $user_data An associative array containing non-sensitive user data (id, username, email).
     */
    public static function loginUser(array $user_data)
    {
        // Ensure session is started before setting variables. init() handles this (implicitly by being called after session_start).
        $_SESSION['user_id'] = $user_data['id']; // Store only ID for security and easy lookup

        // Populate static user_data (without password hash)
        self::$user_data = [
            'id' => $user_data['id'],
            'username' => $user_data['username'],
            'email' => $user_data['email']
            // Add other non-sensitive data you wish to store in session
        ];
        // Regenerate session ID for security against session fixation attacks
        session_regenerate_id(true); 
        // error_log("DEBUG: Auth::loginUser - User " . $user_data['email'] . " session set."); // Uncomment for debugging
    }

    /**
     * Returns the currently authenticated user's data.
     * @return array|null The user data as an associative array, or null if not authenticated.
     */
    public static function user(): ?array
    {
        // User data is populated in init() or loginUser()
        return self::$user_data;
    }

    /**
     * Checks if a user is currently authenticated.
     * @return bool True if authenticated, false otherwise.
     */
    public static function check(): bool
    {
        return self::$user_data !== null; // Check if static user_data is populated
    }

    /**
     * Helper method to check authentication and send an error response if not authenticated.
     * Used in index.php before protected routes.
     */
    public static function checkAuth()
    {
        if (!self::check()) {
            Response::error('Unauthorized: Please log in to access this resource.', 401);
            // Response::error() already calls exit(), so no need for 'return'
        }
    }

    /**
     * Logs out the current user by destroying the session.
     */
    public static function logout()
    {
        // error_log("DEBUG: Auth::logout() - Attempting to log out user."); // Uncomment for debugging

        $_SESSION = []; // Clear all session variables
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, // Set expiration time to past
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy(); // Destroy the session itself
        self::$user_data = null; // Clear static user data
        error_log("DEBUG: Auth::logout() - Session destroyed and cookie expired."); // Uncomment for debugging
    }
}