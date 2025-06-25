<?php

class Validator
{
    protected static array $errors = [];
    protected static array $sanitizedData = [];
    private static $conn; // Static property for database connection

    /**
     * Sets the database connection for the Validator.
     * This method MUST be called once at the very beginning of the application (in index.php)
     * after the Database class has established a connection.
     * @param PDO $db_connection The active PDO database connection object.
     */
    public static function setDatabaseConnection(PDO $db_connection)
    {
        self::$conn = $db_connection;
        // error_log("DEBUG: Validator database connection set."); // Uncomment for debugging
    }

    /**
     * Validates an array of fields against a set of rules.
     * Sends a JSON error response if validation fails and terminates script execution.
     * @param array $fields Associative array where keys are field names and values are arrays
     * containing 'value' and 'rules' (array of strings).
     * Example: ['email' => ['value' => 'test@example.com', 'rules' => ['required', 'email']]]
     * @return bool True if all validations pass, never returns false if validation fails (it exits).
     */
    public static function validate(array $fields): bool
    {
        self::$errors = [];
        self::$sanitizedData = []; // Reset sanitized data for each validation call

        foreach ($fields as $fieldName => $config) {
            $value = $config['value'] ?? null;
            $rules = $config['rules'] ?? [];
            // $allData = $fields; // This is not passed to individual validation rules by default now

            // Apply general sanitization first
            $sanitizedValue = self::sanitizeInternal($value);
            self::$sanitizedData[$fieldName] = $sanitizedValue;

            $isNullable = in_array('nullable', $rules);

            // Handle 'required' validation first for non-nullable fields
            if (in_array('required', $rules) && !$isNullable) {
                if (self::isEmpty($sanitizedValue)) {
                    self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' is required.');
                    continue; // Skip other rules for this field if it's required and empty
                }
            }

            // If nullable and value is empty (after sanitization, including 0), skip further checks
            if ($isNullable && self::isEmpty($sanitizedValue)) {
                // For nullable fields that are empty, store null in sanitizedData for database consistency
                self::$sanitizedData[$fieldName] = null;
                continue;
            }


            foreach ($rules as $rule) {
                // Skip 'nullable' and 'required' here as they are handled upfront
                if ($rule === 'nullable' || $rule === 'required') {
                    continue;
                }

                $ruleParts = explode(':', $rule, 2);
                $ruleName = $ruleParts[0];
                $ruleParam = $ruleParts[1] ?? null;

                $params = $ruleParam !== null ? explode(',', $ruleParam) : [];

                $methodName = 'validate' . ucfirst($ruleName);
                if (method_exists(__CLASS__, $methodName)) {
                    // Call the validation method. Pass only necessary parameters.
                    // If a rule like 'unique' needs specific other parameters (like 'except_id' from $allData),
                    // they should be passed as part of $params if possible or the rule should explicitly request them.
                    // For now, removing $allData from this common call.
                    if ($ruleName === 'unique') {
                        // Pass $allData only to unique rule if it explicitly needs it (which it doesn't currently)
                        if (!call_user_func_array([__CLASS__, $methodName], [$fieldName, $sanitizedValue, $params])) {
                             break;
                        }
                    } else {
                        if (!call_user_func_array([__CLASS__, $methodName], [$fieldName, $sanitizedValue, $params])) {
                            break;
                        }
                    }
                } else {
                    error_log("Unknown validation rule: " . $ruleName);
                }
            }
        }

        if (!empty(self::$errors)) {
            // THIS IS THE CRUCIAL PART: Ensure Response::error can handle the 'errors' array
            Response::error('Validation failed.', 422, ['errors' => self::$errors]);
        }

        return true; // All validations passed
    }

    /**
     * Helper to check if a value is effectively empty.
     * @param mixed $value
     * @return bool
     */
    private static function isEmpty(mixed $value): bool
    {
        return $value === null || $value === '' || (is_string($value) && trim($value) === '');
    }


    private static function addError(string $fieldName, string $message): void
    {
        if (!isset(self::$errors[$fieldName])) {
            self::$errors[$fieldName] = [];
        }
        self::$errors[$fieldName][] = $message;
    }

    /**
     * Returns the sanitized data from the last successful validation.
     * @return array
     */
    public static function getSanitizedData(): array
    {
        return self::$sanitizedData;
    }

    /**
     * Sanitizes a string input internally for validation.
     * @param mixed $input The input value.
     * @return mixed The sanitized value.
     */
    private static function sanitizeInternal(mixed $input): mixed
    {
        if (is_string($input)) {
            $input = trim($input);
            $input = strip_tags($input);
            $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
        }
        return $input;
    }

    /**
     * Sanitizes a string for safe display in HTML context (output sanitization).
     * This method is public so it can be called by controllers for data retrieved from DB.
     * @param string $output The string to sanitize for display.
     * @return string The sanitized string.
     */
    public static function sanitizeOutputForDisplay(string $output): string
    {
        return htmlspecialchars($output, ENT_QUOTES, 'UTF-8');
    }

    // --- Validation Rules ---

    private static function validateMin(string $fieldName, string $value, array $params): bool
    {
        $min = (int) ($params[0] ?? 0);
        if (strlen($value) < $min) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must be at least ' . $min . ' characters long.');
            return false;
        }
        return true;
    }

    private static function validateMax(string $fieldName, string $value, array $params): bool
    {
        $max = (int) ($params[0] ?? PHP_INT_MAX);
        if (strlen($value) > $max) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must not exceed ' . $max . ' characters.');
            return false;
        }
        return true;
    }

    private static function validateEmail(string $fieldName, string $value): bool
    {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must be a valid email address.');
            return false;
        }
        return true;
    }

    private static function validateNumeric(string $fieldName, mixed $value): bool
    {
        if (!is_numeric($value)) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must be a number.');
            return false;
        }
        if (is_string($value) && filter_var($value, FILTER_VALIDATE_INT) !== false) {
             self::$sanitizedData[$fieldName] = (int)$value;
        } elseif (is_string($value) && filter_var($value, FILTER_VALIDATE_FLOAT) !== false) {
            self::$sanitizedData[$fieldName] = (float)$value;
        }
        return true;
    }

    private static function validateBoolean(string $fieldName, mixed $value): bool
    {
        $validBoolean = in_array($value, [true, false, 1, 0], true) ||
                        (is_string($value) && in_array(strtolower($value), ['true', 'false', '1', '0']));

        if (!$validBoolean) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must be a boolean value (true/false, 0/1).');
            return false;
        }
        self::$sanitizedData[$fieldName] = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        return true;
    }

    private static function validateIn(string $fieldName, string $value, array $params): bool
    {
        if (!in_array($value, $params)) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' has an invalid value. Must be one of: ' . implode(', ', $params) . '.');
            return false;
        }
        return true;
    }

    private static function validateDateFormat(string $fieldName, string $value, array $params): bool
    {
        if (self::isEmpty($value)) {
            return true;
        }

        $format = $params[0] ?? 'Y-m-d';
        $d = DateTime::createFromFormat($format, $value);
        if (!($d && $d->format($format) === $value)) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must be in ' . $format . ' format.');
            return false;
        }
        return true;
    }

    private static function validatePasswordStrength(string $fieldName, string $value): bool
    {
        // Requires at least 8 characters, one uppercase, one lowercase, one digit.
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/', $value)) {
            self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' must be at least 8 characters, contain uppercase, lowercase, and a digit.');
            return false;
        }
        return true;
    }

    private static function validateUnique(string $fieldName, string $value, array $params): bool // Removed $allData
    {
        if (count($params) < 2) {
            error_log("Unique rule requires table and column name: unique:table,column");
            self::addError($fieldName, 'Internal validation error: Misconfigured unique rule.');
            return false;
        }

        $table = $params[0];
        $column = $params[1];
        $exceptId = null;

        if (isset($params[2]) && str_starts_with($params[2], 'except_id:')) {
            $exceptId = (int) str_replace('except_id:', '', $params[2]);
        }

        if (self::$conn === null) {
            error_log("Validator::validateUnique error: Database connection is null. Make sure Validator::setDatabaseConnection() is called.");
            self::addError($fieldName, 'Internal validation error: Database connection not available for unique check.');
            return false;
        }

        $query = "SELECT COUNT(*) FROM `{$table}` WHERE `{$column}` = :value";
        if ($exceptId !== null) {
            $query .= " AND id != :except_id";
        }

        try {
            $stmt = self::$conn->prepare($query);
            $stmt->bindParam(':value', $value);
            if ($exceptId !== null) {
                $stmt->bindParam(':except_id', $exceptId, PDO::PARAM_INT);
            }
            $stmt->execute();

            if ($stmt->fetchColumn() > 0) {
                self::addError($fieldName, ucfirst(str_replace('_', ' ', $fieldName)) . ' already exists.');
                return false;
            }
        } catch (PDOException $e) {
            error_log("Database error during unique validation: " . $e->getMessage());
            self::addError($fieldName, 'A database error occurred during unique validation.');
            return false;
        }
        return true;
    }
}