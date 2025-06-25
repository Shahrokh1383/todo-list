// This file is located at front-end/assets/js/auth.js

// API Base URL 
const API_BASE_URL = 'http://localhost/test/back-end/api';

/**
 * Utility function to show alert messages in UI.
 * Assumes there are elements with IDs 'error-message' and 'success-message' in the HTML.
 * @param {string} message - Message to display.
 * @param {boolean} isSuccess - True for success, false for error.
 * @param {object} [errors] - Optional: An object containing specific validation errors.
 */
export function showAlert(message, isSuccess = true, errors = null) {
    const errorMessageDiv = document.getElementById('error-message');
    const successMessageDiv = document.getElementById('success-message');

    // Clear previous messages first
    if (errorMessageDiv) {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    }
    if (successMessageDiv) {
        successMessageDiv.textContent = '';
        successMessageDiv.style.display = 'none';
    }

    let fullMessage = message;

    // Append specific errors if provided
    if (errors && typeof errors === 'object') {
        const errorDetails = Object.keys(errors).map(field => {
            // Join array of messages for each field
            return `${field}: ${errors[field].join(', ')}`;
        }).join('\n'); // Join different field errors with a newline
        
        if (errorDetails) {
            fullMessage += '\n' + errorDetails;
        }
    }

    const targetDiv = isSuccess ? successMessageDiv : errorMessageDiv;
    if (targetDiv) {
        // Use <pre> tag for multi-line error messages to preserve newlines
        targetDiv.innerHTML = isSuccess ? fullMessage : `<pre>${fullMessage}</pre>`;
        targetDiv.style.display = 'block';
        // Auto-hide messages after 5 seconds
        setTimeout(() => {
            targetDiv.style.display = 'none';
            targetDiv.innerHTML = ''; // Clear content after hiding
        }, 5000);
    } else {
        console.warn(`Message div for ${isSuccess ? 'success' : 'error'} not found. Check your HTML for #error-message or #success-message.`);
    }
}

/**
 * Handles form submissions, extracts data, and calls a callback function.
 * This function is now exported.
 * @param {string} formId - Form element ID.
 * @param {function} callback - Async callback function to handle form data.
 */
export function handleFormSubmit(formId, callback) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error(`Form with ID '${formId}' not found. Cannot attach submit listener.`);
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Clear existing messages before a new submission attempt
        showAlert('', true); // Clear success message
        showAlert('', false); // Clear error message

        // Add client-side validation specific to the signup form
        if (formId === 'signupForm') { // Assuming signup form has ID 'signupForm'
            if (data.password !== data['confirm-password']) {
                showAlert('Passwords do not match.', false);
                return; // Stop submission
            }
            // Client-side password strength check (basic example)
            if (data.password.length < 8) {
                showAlert('Password must be at least 8 characters long.', false);
                return;
            }
            // You might add more client-side checks for password strength here
            // e.g., regex for uppercase, lowercase, number, special char.
        }

        try {
            await callback(data);
        } catch (error) {
            console.error("Form submission error caught in handleFormSubmit:", error);
            // The `showAlert` in Auth methods now handles specific error messages.
            // This fallback is for unexpected errors not handled by Auth methods.
            if (!error.message.includes('Validation failed.')) { // Avoid double alerts for validation errors
                showAlert(error.message || 'An unexpected error occurred during form submission. Please try again.', false);
            }
        }
    });
}

/**
 * Auth module for API calls and state management.
 * This class is now exported.
 */
export class Auth {
    static baseUrl = API_BASE_URL; // Use the constant defined at the top

    /**
     * Helper to process API responses and throw errors with details.
     * @param {Response} response - The raw Fetch API response.
     * @param {string} contextMessage - A descriptive message for logging/alerting.
     * @returns {Promise<object>} - Parsed JSON data.
     * @throws {Error} - Throws an error with message and optional errors object from backend.
     */
    static async processAuthResponse(response, contextMessage = "Server operation failed.") {
        const responseText = await response.text();
        let data;

        try {
            data = JSON.parse(responseText);
            console.log(`${contextMessage}: Server response data:`, JSON.stringify(data, null, 2)); // Log full data including errors
        } catch (e) {
            console.error(`${contextMessage}: Failed to parse server response as JSON:`, e, "Raw response:", responseText);
            throw new Error(`Server returned an invalid JSON response during ${contextMessage.toLowerCase()}. Please check backend logs.`);
        }

        if (!response.ok || !data.success) {
            // Construct a more detailed error message if specific errors are present
            let errorMessage = data.message || contextMessage;
            if (data.errors && typeof data.errors === 'object') {
                // Log specific errors for detailed debugging
                console.error(`${contextMessage}: Validation errors:`, data.errors);
            }
            showAlert(errorMessage, false, data.errors); // Pass errors object to showAlert
            throw new Error(errorMessage); // Throw generic message for internal error handling
        }
        return data;
    }

    /**
     * Handles user login.
     * @param {object} credentials - {email, password}
     * @returns {Promise<object>} - User data
     */
    static async login(credentials) {
        try {
            console.log("Auth.login: Attempting login with credentials:", credentials);

            const response = await fetch(`${Auth.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                credentials: 'include' // Important for sending cookies/sessions
            });

            // Changed: Call static method directly using class name, not 'this'
            const data = await Auth.processAuthResponse(response, "Auth.login");

            const responseData = data.data || data; // Handle cases where data might be nested under 'data' key

            if (!responseData || !responseData.user) {
                console.error("Auth.login: Invalid response structure: 'user' data missing.", data);
                showAlert("Server returned incomplete user data. Login failed.", false);
                throw new Error("Server returned incomplete user data.");
            }

            // Store user data (excluding sensitive info)
            const userData = {
                id: responseData.user.id,
                username: responseData.user.username,
                email: responseData.user.email,
                // Add other non-sensitive properties you might receive and want to store
                // created_at: responseData.user.created_at
            };
            localStorage.setItem('user', JSON.stringify(userData));

            showAlert(responseData.message || 'Login successful', true);

            // Redirect to main app page after successful login
            setTimeout(() => {
                window.location.href = 'http://localhost/test/front-end/index.html';
            }, 1500);

            return responseData;

        } catch (error) {
            console.error("Auth.login: Error during login:", error);
            // showAlert is already called by processAuthResponse for typical errors
            // This catches unexpected errors (e.g., network issues)
            if (!error.message.includes('Server returned an invalid JSON response')) { // Exclude if already handled
                showAlert(error.message || 'An unexpected network error occurred during login. Please try again.', false);
            }
            throw error; // Re-throw for handleFormSubmit to catch and potentially log
        }
    }

    /**
     * Handles user registration.
     * @param {object} userData - {username, email, password, confirm-password}
     * @returns {Promise<object>} - Response data
     */
    static async register(userData) {
        try {
            console.log("Auth.register: Attempting registration with data:", userData);
            
            // Do NOT send confirm-password to backend
            const dataToSend = {
                username: userData.username,
                email: userData.email,
                password: userData.password
            };

            const response = await fetch(`${Auth.baseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
                credentials: 'include'
            });

            // Changed: Call static method directly using class name, not 'this'
            const data = await Auth.processAuthResponse(response, "Auth.register");
            
            showAlert(data.message || 'Registration successful. You can now log in.', true);

            // **CHANGED: Redirect to login page after successful registration**
            setTimeout(() => {
                window.location.href = 'http://localhost/test/login.html';
            }, 1500);

            return data;

        } catch (error) {
            console.error("Auth.register: Error during registration:", error);
            // showAlert is already called by processAuthResponse for typical errors
            if (!error.message.includes('Server returned an invalid JSON response')) { // Exclude if already handled
                showAlert(error.message || 'An unexpected network error occurred during registration. Please try again.', false);
            }
            throw error;
        }
    }

    /**
     * Handles user logout.
     * @returns {Promise<object>} - Response data
     */
    static async logout() {
        try {
            console.log("Auth.logout: Attempting logout.");
            
            const response = await fetch(`${Auth.baseUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await Auth.processAuthResponse(response, "Auth.logout");

            localStorage.removeItem('user'); // Clear user data from local storage
            showAlert(data.message || 'Logged out successfully', true);

            setTimeout(() => {
                window.location.href = 'http://localhost/test/login.html'; // Redirect to login page after logout
            }, 1000);

            return data;

        } catch (error) {
            console.error("Auth.logout: Error during logout:", error);
            if (!error.message.includes('Server returned an invalid JSON response')) { // Exclude if already handled
                showAlert(error.message || 'An unexpected network error occurred during logout. Please try again.', false);
            }
            throw error;
        }
    }

    /**
     * Checks authentication status by calling the backend.
     * This function is now exported.
     * @returns {Promise<object>} - Auth status and user data if authenticated.
     */
    static async checkAuth() {
        try {
            console.log("Auth.checkAuth: Checking authentication status.");
            const timestamp = new Date().getTime(); // Prevent caching issues
            
            const response = await fetch(`${Auth.baseUrl}/check-auth?_t=${timestamp}`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store' // Ensure browser does not use cached response
            });

            // Changed: Call static method directly using class name, not 'this'
            const data = await Auth.processAuthResponse(response, "Auth.checkAuth");

            // Assuming check-auth returns { authenticated: true/false, user: {...} }
            if (data.success && data.authenticated === true && data.user) {
                const userData = {
                    id: data.user.id,
                    username: data.user.username,
                    email: data.user.email,
                    // Add other non-sensitive properties you might receive
                    // created_at: data.user.created_at
                };
                localStorage.setItem('user', JSON.stringify(userData)); // Update local storage with fresh data
                return { authenticated: true, user: userData, message: data.message };
            } else {
                localStorage.removeItem('user'); // Clear local storage if not authenticated or invalid response
                return { authenticated: false, message: data.message || 'Not authenticated.' };
            }
        } catch (error) {
            console.error("Auth.checkAuth: Error during authentication check:", error);
            localStorage.removeItem('user'); // Clear local storage on network/fetch error
            // showAlert is already called by processAuthResponse if there's a backend error
            if (!error.message.includes('Server returned an invalid JSON response')) { // Exclude if already handled
                showAlert(error.message || 'An unexpected network error occurred during authentication check. Please try again.', false);
            }
            return { authenticated: false, message: 'Authentication check failed due to network or server error.' };
        }
    }
}

/**
 * Initializes authentication checks and handles page redirects based on auth status.
 * This function is now NOT exported.
 * @returns {Promise<object>} - Auth status and user data if authenticated.
 */
// Removed 'export' keyword as it's only called internally within this module
async function initializeAuth() {
    console.log('initializeAuth called');
    const authStatus = await Auth.checkAuth();
    const currentPath = window.location.pathname;

    const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
    const isAppPage = currentPath.includes('index.html'); // Assuming index.html is your main app page

    if (authStatus.authenticated) {
        // If authenticated and on an auth page (login/signup), redirect to main app page
        if (isAuthPage) {
            console.log("Authenticated on auth page, redirecting to index.html");
            window.location.href = 'http://localhost/test/front-end/index.html';
        } else if (isAppPage) {
            // If authenticated and on main app page, update UI
            const user = authStatus.user;
            const usernameDisplay = document.getElementById('username-display');
            const logoutBtn = document.getElementById('logout-btn');

            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'block'; // Ensure logout button is visible
                // Make sure to remove old event listener before adding a new one to prevent duplicates
                logoutBtn.removeEventListener('click', Auth.logout); 
                // Changed: Use arrow function to preserve 'this' context for Auth.logout
                logoutBtn.addEventListener('click', () => Auth.logout()); 
            }
        }
        return authStatus;
    } else {
        // If NOT authenticated and NOT on an auth page (i.e., on main app page), redirect to login page
        if (isAppPage) {
            console.log("Not authenticated on app page, redirecting to login.html");
            window.location.href = 'http://localhost/test/login.html';
        }
        // If not authenticated and already on login/signup, do nothing (stay on page)
        return authStatus;
    }
}

// --- Event Listeners for Login and Register Pages (and potential App Page elements) ---
document.addEventListener('DOMContentLoaded', function() {
    // Determine the current page based on its ID (if available) or path
    const loginForm = document.getElementById('loginForm'); // Assuming ID is 'loginForm' in login.html
    const signupForm = document.getElementById('signupForm'); // Assuming ID is 'signupForm' in signup.html
    const logoutBtn = document.getElementById('logout-btn'); // Logout button on index.html

    if (loginForm) {
        // Changed: Use arrow function to preserve 'this' context for Auth.login
        handleFormSubmit('loginForm', (data) => Auth.login(data));
    }

    if (signupForm) {
        // Changed: Use arrow function to preserve 'this' context for Auth.register
        handleFormSubmit('signupForm', (data) => Auth.register(data)); 
    }

    // Attach logout listener if button exists (usually on index.html)
    if (logoutBtn) {
        // This listener is also attached in initializeAuth for dynamic display
        logoutBtn.removeEventListener('click', Auth.logout); 
        logoutBtn.addEventListener('click', () => Auth.logout()); 
    }
    
    // Call initializeAuth on DOMContentLoaded for all pages that include auth.js
    // This handles initial redirects and UI updates.
    initializeAuth();
});
