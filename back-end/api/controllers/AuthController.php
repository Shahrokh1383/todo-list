<?php
// back-end/controllers/AuthController.php


/*
require_once PROJECT_ROOT . 'models/User.php';
require_once PROJECT_ROOT . 'utils/Auth.php';
require_once PROJECT_ROOT . 'utils/Response.php';
require_once PROJECT_ROOT . 'utils/Validator.php'; 
*/

class AuthController
{
    private $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    /**
     * Handles user registration.
     * @param array $data The input data (username, email, password) from the request body.
     */
    public function register(array $data) // Accept $data as an argument from index.php
    {
        // Prepare fields for Validator::validate() structure
        $fields = [
            'username' => ['value' => $data['username'] ?? null, 'rules' => ['required', 'min:3', 'max:50']],
            'email' => ['value' => $data['email'] ?? null, 'rules' => ['required', 'email', 'unique:user,email']], // 'user' is your table name
            'password' => ['value' => $data['password'] ?? null, 'rules' => ['required', 'min:6', 'passwordStrength']]
        ];

        // Validator::validate() will handle errors and exit if validation fails
        Validator::validate($fields);

        $sanitizedData = Validator::getSanitizedData();

        // Assign sanitized data to user model properties
        $this->userModel->username = $sanitizedData['username'];
        $this->userModel->email = $sanitizedData['email'];
        // Assign the HASHED password to the 'password' property of the User model
        $this->userModel->password = password_hash($sanitizedData['password'], PASSWORD_BCRYPT); 

        try {
            $userId = $this->userModel->create(); // Assumes create() returns the new user ID or false
            if ($userId) {
                Response::success(['message' => 'Registration successful. Please log in.'], 201); // 201 Created
            } else {
                Response::error('Failed to register user. Possible duplicate email or database issue.', 500);
            }
        } catch (Exception $e) {
            error_log("AuthController register error: " . $e->getMessage());
            Response::error('An unexpected server error occurred during registration.', 500);
        }
    }

    /**
     * Handles user login.
     * @param array $data The input data (email, password) from the request body.
     */
    public function login(array $data) // Accept $data as an argument from index.php
    {
        $fields = [
            'email' => ['value' => $data['email'] ?? null, 'rules' => ['required', 'email']],
            'password' => ['value' => $data['password'] ?? null, 'rules' => ['required']]
        ];

        Validator::validate($fields);

        $sanitizedData = Validator::getSanitizedData();
        $email = $sanitizedData['email'];
        $password = $sanitizedData['password'];

        try {
            // Auth::attempt handles finding the user and verifying password
            if (Auth::attempt($email, $password)) {
                $user = Auth::user(); // Get authenticated user data (from Auth's static property)
                Response::success(['message' => 'Login successful', 'user' => $user], 200);
            } else {
                Response::error('Invalid email or password.', 401); // Unauthorized
            }
        } catch (Exception $e) {
            error_log("AuthController login error: " . $e->getMessage());
            Response::error('An unexpected server error occurred during login.', 500);
        }
    }

      /**
     * Handles user logout.
     */
    public function logout() 
    {
        try {
            Auth::logout(); // Call the static logout method from Auth utility
            Response::success(['message' => 'Logged out successfully.'], 200);
        } catch (Exception $e) {
            error_log("AuthController logout error: " . $e->getMessage());
            Response::error('An unexpected server error occurred during logout.', 500);
        }
    }
}