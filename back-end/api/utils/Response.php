<?php
// back-end/api/utils/Response.php

class Response {
    /**
     * Sends a JSON response with status code and data.
     * @param array $data The data to be sent in the response.
     * @param int $statusCode The HTTP status code (default: 200).
     */
    public static function json(array $data, int $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data);
        exit(); // Terminate script execution after sending response
    }

    /**
     * Sends a successful JSON response.
     * @param array $data The data to be sent. Defaults to ['message' => 'Operation successful'].
     * @param int $statusCode The HTTP status code (default: 200).
     */
    public static function success(array $data = [], int $statusCode = 200) {
        $defaultData = ['success' => true, 'message' => 'Operation successful.'];
        self::json(array_merge($defaultData, $data), $statusCode);
    }

    /**
     * Sends an error JSON response.
     * @param string $message The error message.
     * @param int $statusCode The HTTP status code (default: 400 Bad Request).
     * @param array $extraData Any additional data to include in the error response (e.g., validation errors).
     */
    public static function error(string $message, int $statusCode = 400, array $extraData = []) {
        error_log("API Error: " . $message . " (Status: " . $statusCode . ")"); // Log the error
        $responseData = array_merge(['success' => false, 'message' => $message], $extraData);
        self::json($responseData, $statusCode);
    }
}