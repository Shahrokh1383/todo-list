<?php
// back-end/api/index.php

// ** DEVELOPMENT ONLY: Enable full error reporting for debugging **
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// 'secure' should be true if your site uses HTTPS.
session_set_cookie_params([
    'lifetime' => 86400, // 1 day in seconds
    'path' => '/', // Available across the entire domain
    'domain' => '', // Empty for current domain (or specify 'localhost' for local dev)
    'secure' => isset($_SERVER['HTTPS']), // True if HTTPS, false otherwise
    'httponly' => true, // HttpOnly cookies prevent JavaScript access (good for security)
    'samesite' => 'Lax' // Helps mitigate CSRF attacks. 'Strict' is more secure but might require more testing.
]);

// Start the PHP session.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Define API_ROOT (points to your 'back-end/api/' directory)
define('API_ROOT', __DIR__ . DIRECTORY_SEPARATOR); // back-end/api/

// --- Autoloader ---
// are all directly within the 'back-end/api/' directory.
spl_autoload_register(function ($class_name) {
    $paths = [
        API_ROOT . 'controllers/',       // Controllers (AuthController.php, FolderController.php, TaskController.php)
        API_ROOT . 'models/',            // Models (User.php, Folder.php, Task.php)
        API_ROOT . 'utils/',             // Utilities (Auth.php, Response.php, Validator.php)
        API_ROOT . 'config/',            // Configs (Database.php)
    ];

    foreach ($paths as $path) {
        $file = $path . $class_name . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// Set the default timezone for date/time functions.
date_default_timezone_set('Asia/Tehran'); // Adjust to local timezone

// --- Initialize Database connection FIRST ---
// The database connection is crucial for Validator (for 'unique' rule) and models (User, Task, Folder).
try {
    $db = Database::getInstance()->getConnection();
} catch (Exception $e) {
    // If database connection fails, log the error and return a 500 Server Error response.
    error_log("Database connection failed: " . $e->getMessage());
    Response::error('Database connection error: ' . $e->getMessage(), 500);
}

// Set the database connection for the Validator class.
// This is critical for Validator's 'unique' rule to be able to query the database.
Validator::setDatabaseConnection($db);

// Initialize Auth utility.
// This method loads user data from the session if the user is already authenticated.
Auth::init();

// --- CORS Headers ---
// These headers are essential for allowing frontend
// to make requests to this backend API.
header("Access-Control-Allow-Origin: http://localhost/test"); // Adjust this to frontend URL
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With"); // X-Requested-With is common for AJAX
header("Access-Control-Allow-Credentials: true"); // Allows cookies/session to be sent with cross-origin requests

// Handle preflight OPTIONS requests.
// Browsers send an OPTIONS request before actual POST/PUT/DELETE requests to check CORS policies.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(); // Exit immediately after sending 200 OK for OPTIONS request
}

// Get the request method (GET, POST, PUT, DELETE) and the URI.
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$basePath = '/test/back-end/api'; 
if (strpos($requestUri, $basePath) === 0) {
    $route = substr($requestUri, strlen($basePath));
} else if ($basePath === '/') {
    $route = $requestUri; // If base path is root, use URI as is
} else {
    // If the base path does not match, it suggests a misconfigured request or URL.
    // For now, it will fall through to the default 404 route.
    $route = $requestUri; 
}
$route = trim($route, '/'); // Remove leading/trailing slashes for cleaner matching

// Decode JSON input for methods that typically send a body (POST, PUT, DELETE).
$input = null; // Initialize input to null
if (in_array($requestMethod, ['POST', 'PUT', 'DELETE'])) {
    $rawInput = file_get_contents("php://input");
    // Only attempt JSON decode if there's content in the request body.
    if (!empty($rawInput)) {
        $input = json_decode($rawInput, true);
        // If JSON parsing fails for a non-empty body, it's an invalid payload.
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON payload.', 400);
        }
    }
}

// Instantiate necessary controllers (instantiate once for efficiency).
$authController = new AuthController();
// $userController = new UserController();
$folderController = new FolderController(); 
$taskController = new TaskController();     

// --- Routing Logic ---
// This directs incoming requests to the appropriate controller method based on the route and method.
switch ($route) {
    // AUTHENTICATION ROUTES
    case 'register':
        if ($requestMethod === 'POST') {
            // Registration always expects a JSON payload.
            if ($input === null) { Response::error('Registration requires a JSON payload.', 400); }
            $authController->register($input); 
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;

    case 'login':
        if ($requestMethod === 'POST') {
            // Login always expects a JSON payload.
            if ($input === null) { Response::error('Login requires a JSON payload.', 400); }
            $authController->login($input); 
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;

    case 'logout':
        if ($requestMethod === 'POST') {
            // Call the logout method from AuthController.
            // AuthController's logout method will then call Auth::logout() and send the response.
            $authController->logout(); 
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;

    case 'check-auth': // A simple route to check if the user is currently authenticated
        if ($requestMethod === 'GET') {
            $authenticated = Auth::check();
            $user = null;
            if ($authenticated) {
                $user = Auth::user(); // Get non-sensitive user data
            }
            Response::success(['authenticated' => $authenticated, 'user' => $user], 200);
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;

    // --- PROTECTED ROUTES (Require Authentication) ---
    case 'folders':
        Auth::checkAuth(); // Protect this route, user must be logged in
        if ($requestMethod === 'POST') {
            if ($input === null) { Response::error('JSON payload required to create folder.', 400); }
            $folderController->create($input);
        } elseif ($requestMethod === 'GET') {
            $folderController->getAll();
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;
    case (preg_match('/^folders\/(\d+)$/', $route, $matches) ? $route : false): // Match /folders/{id}
        Auth::checkAuth();
        $folderId = $matches[1];
        if ($requestMethod === 'GET') {
            $folderController->getOne((int)$folderId);
        } elseif ($requestMethod === 'PUT') {
            if ($input === null) { Response::error('JSON payload required to update folder.', 400); }
            $folderController->update((int)$folderId, $input);
        } elseif ($requestMethod === 'DELETE') {
            $folderController->delete((int)$folderId);
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;
    
    case 'tasks':
        Auth::checkAuth(); // Protect this route, user must be logged in
        if ($requestMethod === 'POST') {
            if ($input === null) { Response::error('JSON payload required to create task.', 400); }
            $taskController->create($input);
        } elseif ($requestMethod === 'GET') {
            // Handle filtering by folder_id and status from query parameters
            $folderId = $_GET['folder_id'] ?? null;
            $status = $_GET['status'] ?? null;
            
            if ($folderId === '0' || $folderId === '') {
                $folderId = null;
            }
            
            if ($folderId !== null && !is_numeric($folderId)) {
                Response::error('Invalid folder_id parameter. Must be numeric or null.', 400);
            }
            
            $taskController->getAll($folderId ? (int)$folderId : null, $status);
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;
    case (preg_match('/^tasks\/(\d+)$/', $route, $matches) ? $route : false): // Match /tasks/{id}
        Auth::checkAuth();
        $taskId = $matches[1];
        if ($requestMethod === 'GET') {
            $taskController->getOne((int)$taskId);
        } elseif ($requestMethod === 'PUT') {
            if ($input === null) { Response::error('JSON payload required to update task.', 400); }
            $taskController->update((int)$taskId, $input);
        } elseif ($requestMethod === 'DELETE') {
            $taskController->delete((int)$taskId);
        } else {
            Response::error('Method Not Allowed', 405);
        }
        break;

    default:
        // If no matching route is found, return 404 Not Found.
        Response::error('Not Found', 404);
        break;
}