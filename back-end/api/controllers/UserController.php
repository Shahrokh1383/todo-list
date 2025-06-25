<?php

class UserController
{
    private $userModel;

    public function __construct()
    {
        $this->userModel = new User();
        // Validator is now static, no need to instantiate
    }

    private function getUserId(): int
    {
        $user = Auth::user();
        if ($user && isset($user['id'])) {
            return (int)$user['id'];
        }
        Response::error('Unauthorized: User ID not found in session.', 401);
    }

    public function getUser(int $id)
    {
        $userId = $this->getUserId();

        // Ensure the requested ID matches the authenticated user's ID
        if ($id !== $userId) {
            Response::error('Forbidden: You can only access your own user data.', 403);
        }

        try {
            $user = $this->userModel->findById($id);

            if ($user) {
                unset($user['password']); // Do not return the password hash
                Response::success(['data' => $user]);
            } else {
                Response::error('User not found.', 404);
            }
        } catch (Exception $e) {
            error_log("UserController getUser error: " . $e->getMessage());
            Response::error('An unexpected error occurred while fetching user data.', 500);
        }
    }

    public function updateUser(int $id)
    {
        $userId = $this->getUserId();

        // Ensure the requested ID matches the authenticated user's ID
        if ($id !== $userId) {
            Response::error('Forbidden: You can only update your own user data.', 403);
        }

        $data = json_decode(file_get_contents("php://input"), true);

        $fields = [];
        if (array_key_exists('username', $data)) {
            $fields['username'] = ['value' => $data['username'], 'rules' => ['required', 'min:3', 'max:50']];
        }
        if (array_key_exists('email', $data)) {
            // For unique email validation, pass the current user's ID to exclude it from the unique check
            $fields['email'] = ['value' => $data['email'], 'rules' => ['required', 'email', 'unique:users,email,except_id:' . $userId]];
        }
        if (array_key_exists('password', $data) && !empty($data['password'])) {
            $fields['password'] = ['value' => $data['password'], 'rules' => ['required', 'min:6', 'password_strength']];
        }

        if (empty($fields)) {
            Response::error('No data provided for update.', 400);
        }

        Validator::validate($fields); // Validator handles errors and exits
        $sanitizedData = Validator::getSanitizedData();

        // Check if user exists before attempting to update (though getUserId and Auth::checkAuth should cover this)
        if (!$this->userModel->findById($userId)) {
             Response::error('User not found.', 404);
        }

        try {
            if ($this->userModel->update($userId, $sanitizedData)) {
                Response::success(['message' => 'User updated successfully.']);
            } else {
                Response::error('Failed to update user.', 500);
            }
        } catch (Exception $e) {
            error_log("UserController updateUser error: " . $e->getMessage());
            Response::error('An unexpected error occurred during user update.', 500);
        }
    }

    public function deleteUser(int $id)
    {
        $userId = $this->getUserId();

        // Ensure the requested ID matches the authenticated user's ID
        if ($id !== $userId) {
            Response::error('Forbidden: You can only delete your own account.', 403);
        }

        // Check if user exists before attempting to delete
        if (!$this->userModel->findById($userId)) {
             Response::error('User not found.', 404);
        }

        try {
            if ($this->userModel->delete($userId)) {
                Auth::logout(); // Log out the user after successful deletion
                Response::success(['message' => 'User account and all associated data deleted successfully.']);
            } else {
                Response::error('Failed to delete user account.', 500);
            }
        } catch (Exception $e) {
            error_log("UserController deleteUser error: " . $e->getMessage());
            Response::error('An unexpected error occurred during user account deletion.', 500);
        }
    }
}