// front-end/assets/js/app.js

// Import necessary functions/classes from auth.js as this is a module
import { showAlert, Auth } from './auth.js'; 

// --- API Configuration ---
// This path MUST correctly point to backend's API directory (the router)
const API_BASE_URL = 'http://localhost/test/back-end/api';

// --- App Global Object (Encapsulates API calls and core app logic) ---
const App = {
    // Generic AJAX fetch function for API calls
    async fetchData(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Important for sending session cookies (PHPSESSID)
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let errorData = {};
                try {
                    // Attempt to parse JSON even on error, as backend might send error details
                    errorData = await response.json();
                } catch (jsonError) {
                    console.error('Failed to parse error response as JSON:', jsonError, 'Raw response:', await response.text());
                    throw new Error(`API request failed with status ${response.status}. Server returned non-JSON response.`);
                }
                // Check if 'message' property exists in errorData, otherwise use a generic message
                throw new Error(errorData.message || `API request failed with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Network or API Error:', error);
            // Re-throw to be caught by specific API callers for `showAlert`
            throw error; 
        }
    },

    // --- Authentication & User API Calls (Delegated to Auth class) ---
    async logout() {
        try {
            await Auth.logout(); // Use the logout method from the Auth class
        } catch (error) {
            console.error('Logout failed:', error);
            // showAlert is already called by Auth.logout for specific errors
            // No need to call it here unless it's a network error not caught by Auth.logout's processAuthResponse
            if (!error.message.includes('Server returned an invalid JSON response') && !error.message.includes('API request failed')) {
                showAlert(error.message || 'Logout failed. Please try again.', false);
            }
        }
    },

    // --- Folder Specific API Calls ---
    async createFolderAPI(folderName) {
        const url = `${API_BASE_URL}/folders`;
        return this.fetchData(url, 'POST', { name: folderName });
    },

    async getFoldersAPI() {
        const url = `${API_BASE_URL}/folders`;
        return this.fetchData(url, 'GET');
    },

    async deleteFolderAPI(folderId) {
        const url = `${API_BASE_URL}/folders/${folderId}`;
        return this.fetchData(url, 'DELETE'); 
    },

    // --- Task Specific API Calls ---
    async createTaskAPI(title, folder_id) {
        const url = `${API_BASE_URL}/tasks`;
        return this.fetchData(url, 'POST', { title, folder_id });
    },

    async getTasksAPI() {
        const url = `${API_BASE_URL}/tasks`;
        return this.fetchData(url, 'GET');
    },

    async updateTaskAPI(id, data) {
        const url = `${API_BASE_URL}/tasks/${id}`;
        return this.fetchData(url, 'PUT', { ...data }); 
    },

    async deleteTaskAPI(id) {
        const url = `${API_BASE_URL}/tasks/${id}`;
        return this.fetchData(url, 'DELETE'); 
    },

    // --- Main Initialization Method for the App ---
    init: async function() {
        const authStatus = await Auth.checkAuth();
        if (!authStatus.authenticated) {
            console.log("User not authenticated, redirecting to login.");
            window.location.href = 'http://localhost/test/login.html'; 
            return; // Stop initialization if not authenticated
        }

        // Update UI with authenticated username
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && authStatus.user) {
            usernameDisplay.textContent = authStatus.user.username;
        }

        await loadAndRenderFolders();
        await loadAndRenderTasks(); // Load tasks from backend
        updateStats();
    }
};

// --- DOM Elements (Declared globally in this file) ---
const todoInput = document.getElementById('todo-input');
const addTaskBtn = document.getElementById('add-task-btn');
const todoList = document.getElementById('todo-list');
const folderInput = document.getElementById('folder-input');
const addFolderBtn = document.getElementById('add-folder-btn');
const folderListElement = document.getElementById('folder-list');
const currentFolderDisplay = document.getElementById('current-folder');
const taskCountDisplay = document.getElementById('task-count');
const completedCountDisplay = document.getElementById('completed-count');
const filterButtons = document.querySelectorAll('.filter-btn');

// --- State Variables ---
let todos = []; // Tasks will be populated from backend API
let folders = []; // Folders populated from backend API
// Default selected folder: 'all-tasks-folder' is a special string for tasks not in any folder.
// Tasks with folder_id = null (from DB) will be treated as part of 'all-tasks-folder'.
let currentFolderId = 'all-tasks-folder';
let currentFilter = 'all';

// --- Folder Management Functions (Interacting with App.js API methods) ---

// Handles adding a new folder
async function addFolder() {
    const folderName = folderInput.value.trim();
    if (folderName) {
        try {
            const response = await App.createFolderAPI(folderName);
            if (response.success && response.folder) { // Assuming backend returns { success: true, folder: {...} }
                showAlert(`Folder "${response.folder.name}" created successfully!`, true);
                folderInput.value = ''; // Clear input
                await loadAndRenderFolders(); // Refresh folders from backend
                // Select the newly created folder automatically
                selectFolder(response.folder.id);
            } else {
                // If backend returns success: false but no specific error message
                showAlert('Error creating folder: ' + (response.message || 'Unknown error. Check backend logs.'), false);
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            // This showAlert is for network errors or errors not structured by backend
            showAlert('An unexpected error occurred during folder creation: ' + error.message, false);
        }
    } else {
        showAlert('Folder name cannot be empty.', false);
    }
}

// Handles deleting an existing folder
async function deleteFolder(folderId) {
    if (folderId === 'all-tasks-folder') {
        showAlert("You cannot delete the 'All Tasks' special view.", false);
        return;
    }

    if (confirm('Are you sure you want to delete this folder? All tasks assigned to it will become unassigned.')) {
        try {
            const response = await App.deleteFolderAPI(folderId);
            if (response.success) {
                showAlert(response.message, true);
                // After successful deletion on backend, reload tasks to reflect unassigned status
                await loadAndRenderTasks();

                // If the deleted folder was currently selected, switch to "All Tasks"
                if (currentFolderId == folderId) {
                    currentFolderId = 'all-tasks-folder';
                }

                await loadAndRenderFolders(); // Refresh folders from backend
                renderTodos(); // Re-render todos to reflect unassigned tasks
            } else {
                showAlert('Error deleting folder: ' + (response.message || 'Unknown error.'), false);
            }
        } catch (error) {
            console.error('Error deleting folder:', error);
            showAlert('An unexpected error occurred during folder deletion: ' + error.message, false);
        }
    }
}

// Handles selecting a folder from the sidebar
function selectFolder(folderId) {
    currentFolderId = folderId;

    // Update header display based on selected folder
    if (folderId === 'all-tasks-folder') {
        currentFolderDisplay.textContent = 'All Tasks';
    } else {
        const selectedFolder = folders.find(f => f.id == folderId);
        currentFolderDisplay.textContent = selectedFolder ? selectedFolder.name : 'All Tasks';
    }

    renderTodos(); // Re-render tasks based on the newly selected folder
    updateStats();

    // Update active class in UI
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
        // Ensure string comparison for dataset and folderId
        if (item.dataset.folderId === String(folderId)) {
            item.classList.add('active');
        }
    });
}

// Renders the folders array (from backend) to the UI
function renderFoldersToUI() {
    folderListElement.innerHTML = ''; // Clear existing list

    // Always add the "All Tasks" special view
    const allTasksLi = document.createElement('li');
    allTasksLi.className = 'folder-item';
    allTasksLi.dataset.folderId = 'all-tasks-folder';
    const allTasksSpan = document.createElement('span');
    allTasksSpan.className = 'folder-name';
    allTasksSpan.innerHTML = '<i class="fas fa-tasks"></i> All Tasks'; // Using fa-tasks for All Tasks
    allTasksSpan.addEventListener('click', () => selectFolder('all-tasks-folder'));
    allTasksLi.appendChild(allTasksSpan);
    folderListElement.appendChild(allTasksLi);

    // Add dynamically fetched folders
    if (folders && folders.length > 0) {
        folders.forEach(folder => {
            const li = document.createElement('li');
            li.dataset.folderId = folder.id;
            li.classList.add('folder-item');

            const folderNameSpan = document.createElement('span');
            folderNameSpan.innerHTML = `<i class="fas fa-folder"></i> ${folder.name}`;
            folderNameSpan.classList.add('folder-name');
            folderNameSpan.addEventListener('click', () => selectFolder(folder.id));

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-folder');
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Delete Folder';
            deleteButton.dataset.folderId = folder.id;

            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent folder selection when clicking delete
                const folderIdToDelete = e.currentTarget.dataset.folderId;
                deleteFolder(folderIdToDelete);
            });

            li.appendChild(folderNameSpan);
            li.appendChild(deleteButton);
            folderListElement.appendChild(li);
        });
    } else {
        // If no custom folders exist, show a message (below "All Tasks")
        if (folderListElement.children.length === 1) { // Only "All Tasks" is present
            const noCustomFoldersLi = document.createElement('li');
            noCustomFoldersLi.textContent = 'No custom folders. Create one!';
            noCustomFoldersLi.style.cssText = 'padding: 10px; text-align: center; color: var(--medium-text); font-size: 0.9em;';
            folderListElement.appendChild(noCustomFoldersLi);
        }
    }

    // Set active class for the currently selected folder
    const activeItem = folderListElement.querySelector(`[data-folder-id="${currentFolderId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Loads folders from the backend API and then renders them to the UI
async function loadAndRenderFolders() {
    try {
        const response = await App.getFoldersAPI();
        if (response.success && response.folders) {
            folders = response.folders; // Update global folders array with backend data
            renderFoldersToUI(); // Render the fetched folders

            // If the previously selected folder was deleted or not set, default to "All Tasks"
            // Ensure `currentFolderId` is set to a valid ID or 'all-tasks-folder'
            if (currentFolderId === null || currentFolderId === 'all-tasks-folder' || !folders.some(f => f.id == currentFolderId)) {
                selectFolder('all-tasks-folder');
            } else {
                selectFolder(currentFolderId); // Re-select the current folder to refresh UI state
            }
        } else {
            console.error('Failed to load folders:', response.message);
            folderListElement.innerHTML = `<li>Error loading folders: ${response.message}</li>`;
            showAlert('Failed to load folders: ' + (response.message || 'Unknown error.'), false); // Added specific showAlert here
            selectFolder('all-tasks-folder'); // Default to All Tasks on error
        }
    } catch (error) {
        console.error('Error loading folders:', error);
        showAlert('Failed to load folders. Please check your connection or backend setup.', false); // Added specific showAlert here
        folderListElement.innerHTML = `<li>Failed to load folders. Please check your connection.</li>`;
        selectFolder('all-tasks-folder'); // Default to All Tasks on network error
    }
}


// --- Task Functionality (Interacting with App.js API methods) ---

// Loads tasks from the backend API and updates the 'todos' array
async function loadAndRenderTasks() {
    try {
        const response = await App.getTasksAPI();
        if (response.success && response.tasks) {
            // IMPORTANT: Map 'title' from backend to 'text' for frontend compatibility
            // and ensure 'completed' is a boolean.
            todos = response.tasks.map(task => ({
                id: task.id,
                text: task.title, // Map backend 'title' to frontend 'text'
                completed: task.status === 'done' ? true : false, // Map 'status' to boolean 'completed'
                folder_id: task.folder_id, // Can be null
                status: task.status, // Keep original status for potential future use
                priority: task.priority,
                due_date: task.due_date,
                created_at: task.created_at
            }));
            renderTodos(); // Render the fetched tasks
            updateStats();
        } else {
            console.error('Failed to load tasks:', response.message);
            todoList.innerHTML = `<li>Error loading tasks: ${response.message}</li>`;
            showAlert('Failed to load tasks: ' + (response.message || 'Unknown error.'), false); // Added specific showAlert here
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showAlert('Failed to load tasks. Please check your connection or backend setup.', false); // Added specific showAlert here
        todoList.innerHTML = `<li>Failed to load tasks. Please check your connection.</li>`;
    }
}


async function addTodo() {
    const title = todoInput.value.trim(); // Renamed 'text' to 'title' for clarity
    if (title) {
        try {
            // Get the folder_id for the new task. 'all-tasks-folder' maps to null in DB.
            const folder_id_to_assign = currentFolderId === 'all-tasks-folder' ? null : currentFolderId;

            // Send 'title' to the backend
            const response = await App.createTaskAPI(title, folder_id_to_assign);
            if (response.success && response.task) {
                // Ensure the task object matches the structure we expect in frontend
                const newTask = {
                    id: response.task.id,
                    text: response.task.title, // Use 'title' from backend
                    completed: response.task.status === 'done' ? true : false, // Map 'status' to boolean
                    folder_id: response.task.folder_id, // This can be null
                    status: response.task.status,
                    priority: response.task.priority,
                    due_date: response.task.due_date,
                    created_at: response.task.created_at
                };
                todos.push(newTask);
                todoInput.value = ''; // Clear input
                renderTodos(); // Re-render to show the new task
                updateStats();
                showAlert('Task added successfully!', true);
            } else {
                showAlert('Error adding task: ' + (response.message || 'Unknown error.'), false);
            }
        } catch (error) {
            console.error('Error adding task:', error);
            showAlert('An unexpected error occurred while adding the task: ' + error.message, false);
        }
    } else {
        showAlert('Task title cannot be empty.', false);
    }
}

async function toggleTodoComplete(id) {
    const todoToUpdate = todos.find(todo => todo.id == id);
    if (!todoToUpdate) return;

    // Backend uses 'status', not 'completed'.
    // Map boolean 'completed' to 'status' enum ('todo', 'done').
    const newStatus = todoToUpdate.completed ? 'todo' : 'done';
    try {
        const response = await App.updateTaskAPI(id, { status: newStatus });
        if (response.success) {
            todos = todos.map(todo => {
                if (todo.id == id) {
                    // Update both 'completed' (boolean) and 'status' (enum) in local array
                    return { ...todo, completed: !todo.completed, status: newStatus };
                }
                return todo;
            });
            renderTodos();
            updateStats();
            showAlert('Task status updated!', true);
        } else {
            showAlert('Error updating task status: ' + (response.message || 'Unknown error.'), false);
        }
    } catch (error) {
        console.error('Error toggling task completion:', error);
        showAlert('An unexpected error occurred while updating task status: ' + error.message, false);
    }
}

async function editTodo(id, newText) {
    const todoToUpdate = todos.find(todo => todo.id == id);
    // Use todo.text for comparison in frontend, but send newText as 'title' to backend
    if (!todoToUpdate || todoToUpdate.text === newText) return; // No change needed

    try {
        const response = await App.updateTaskAPI(id, { title: newText }); // Send 'title' to backend
        if (response.success) {
            todos = todos.map(todo => {
                if (todo.id == id) {
                    return { ...todo, text: newText }; // Update 'text' in local array
                }
                return todo;
            });
            renderTodos();
            updateStats();
            showAlert('Task updated successfully!', true);
        } else {
            showAlert('Error updating task: ' + (response.message || 'Unknown error.'), false);
        }
    } catch (error) {
        console.error('Error editing task:', error);
        showAlert('An unexpected error occurred while editing the task: ' + error.message, false);
    }
}

async function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            const response = await App.deleteTaskAPI(id);
            if (response.success) {
                todos = todos.filter(todo => todo.id !== id);
                renderTodos();
                updateStats();
                showAlert('Task deleted successfully!', true);
            } else {
                showAlert('Error deleting task: ' + (response.message || 'Unknown error.'), false);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            showAlert('An unexpected error occurred while deleting the task: ' + error.message, false);
        }
    }
}

function renderTodos() {
    todoList.innerHTML = '';

    let filteredTodos = todos.filter(todo => {
        // Filter by folder_id: 'all-tasks-folder' matches tasks with folder_id === null
        // Note: Backend might return folder_id as string or number, use == for loose comparison
        // Added explicit check for null or 0 for 'all-tasks-folder'
        const folderMatch = currentFolderId === 'all-tasks-folder'
            ? (todo.folder_id === null || todo.folder_id === 0)
            : todo.folder_id == currentFolderId;

        // Filter by completion status
        let statusMatch = true;
        if (currentFilter === 'active') {
            statusMatch = !todo.completed;
        } else if (currentFilter === 'completed') {
            statusMatch = todo.completed;
        }

        return folderMatch && statusMatch;
    });

    if (filteredTodos.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = 'No tasks in this folder matching the current filter.';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '20px';
        emptyMessage.style.color = 'var(--gray-color)';
        todoList.appendChild(emptyMessage);
        return;
    }

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.id = todo.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodoComplete(todo.id));

        const span = document.createElement('span');
        span.className = 'todo-text';
        if (todo.completed) span.classList.add('completed');
        span.textContent = todo.text; // Use 'text' for frontend display

        span.contentEditable = true;
        span.addEventListener('blur', (e) => {
            const newText = e.target.textContent.trim();
            if (newText && newText !== todo.text) {
                editTodo(todo.id, newText);
            } else {
                e.target.textContent = todo.text; // Revert if empty or unchanged
            }
        });

        span.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                span.blur();
            }
        });

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'todo-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', () => {
            span.focus();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(actionsDiv);

        todoList.appendChild(li);
    });
}

// --- Filter Functionality ---
function setFilter(filter) {
    currentFilter = filter;
    renderTodos();

    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
}

// --- Stats Update ---
function updateStats() {
    const folderTodos = todos.filter(todo =>
        currentFolderId === 'all-tasks-folder'
            ? (todo.folder_id === null || todo.folder_id === 0)
            : todo.folder_id == currentFolderId
    );

    const totalTasks = folderTodos.length;
    const completedTasks = folderTodos.filter(todo => todo.completed).length;

    taskCountDisplay.textContent = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'}`;
    completedCountDisplay.textContent = `${completedTasks} completed`;
}

// --- Event Listeners (Attached once DOM is ready) ---
document.addEventListener('DOMContentLoaded', function() {
    addTaskBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission if input is in a form
            addTodo();
        }
    });

    addFolderBtn.addEventListener('click', addFolder);
    folderInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission
            addFolder();
        }
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    // Add logout functionality (assuming there's a logout button)
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await App.logout();
        });
    }

    // Initialize the app after DOM is loaded and event listeners are set up
    // This should also include an authentication check to protect the page.
    App.init();
});