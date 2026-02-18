TodoSphere: Comprehensive Task Manager

![Screenshot 2025-06-25 at 15-44-35 Sign Up](https://github.com/user-attachments/assets/f942c6ff-1aa9-4aa4-ba68-d00e377b05a2)

![Screenshot 2025-06-25 at 15-44-35 Sign Up](https://github.com/user-attachments/assets/07419868-6e96-4740-94a0-8c7a69ed2a7a)

![Screenshot 2025-06-25 at 15-45-31 Enhanced Todo List](https://github.com/user-attachments/assets/144adba5-d090-48ad-9740-5ab6490b4111)

![Screen Shot 2025-06-25 at 15 48 29](https://github.com/user-attachments/assets/5179480a-e701-4dbd-835c-94e5932e3b6f)

Introduction

TodoSphere is a complete and functional task management application (Todo List) that allows you to organize your tasks into different folders, change their status, edit, or delete them. This project is developed as a Full-Stack application, showcasing skills in both server-side and client-side programming.

The goal of this project is to implement a comprehensive solution for daily task management with a focus on clean architecture, secure API communication, and an efficient user experience.
Features

    User Authentication:

        New user registration.

        Secure login with session-based authentication.

        User logout.

    Task Management:

        Add new tasks.

        View task lists (with filtering by status: all, active, completed).

        Mark tasks as completed/incomplete.

        Edit task titles.

        Delete tasks.

    Folder Management:

        Create new folders to organize tasks.

        View tasks within a specific folder.

        Delete folders (affecting associated tasks).

    "All Tasks" View: A special view to display all user tasks, including those not assigned to any specific folder.

    Statistics Display: Shows the total number of tasks and completed tasks within the current folder.

    User Interface: Clean and user-friendly interface using HTML and CSS.

Technologies Used
Backend

    PHP: The primary programming language for server-side logic.

    MySQL: Database management system for storing tasks, folders, and user information.

    PDO: Used for secure database interaction, preventing SQL Injection.

    RESTful API: Implemented endpoints for communication with the frontend.

    Apache HTTP Server: The web server hosting the PHP application.

Frontend

    HTML5: Structuring the web pages.

    CSS3: Styling and designing the application's appearance.

    JavaScript (Vanilla JS): Client-side interactivity logic and API calls.

    Fetch API: For making HTTP requests to the backend.

    Font Awesome: For various icons.

Setup and Usage Guide

To set up and run this project on your local machine, please follow the steps below:
Prerequisites

    XAMPP / WAMP / MAMP (or any other PHP and MySQL development environment).

    Composer (for PHP dependency management, optional for this project but good practice).

Steps

    Clone the Repository:
    First, clone this repository into your web server's document root (e.g., htdocs for XAMPP, or www for WAMP). It's recommended to name your project folder test to align with the default configurations in the code, note : always use name : test, for the route folder.

    git clone https://github.com/Shahrokh1383/todo-list

    Important Note: If you choose a project folder name other than test (e.g., MyTodoListApp), you must update the base path variables in your code accordingly (API_BASE_URL in front-end/assets/js/app.js and front-end/assets/js/auth.js, $basePath in back-end/api/index.php, and RewriteBase in back-end/api/.htaccess). For example, change /test/back-end/api to /MyTodoListApp/back-end/api.

    Database Setup:

        Create Database:

            Access your phpMyAdmin (usually via http://localhost/phpmyadmin).

            Create a new database. You can name it todo_list_db or choose any other name.

        Import Tables:

            Open the back-end/database/todo_list_db.sql file.

            Import the contents of this SQL file into the newly created database. This will create the users, folders, and tasks tables.

        Configure Database Connection:

            Open the file back-end/api/config/Database.php.

            Ensure that the database connection details (host, database name, username, password) match your MySQL/MariaDB setup.

        // back-end/api/config/Database.php
        private $host = 'localhost';
        private $db_name = 'todo_list_db'; // Your created database name
        private $username = 'root'; // Your MySQL username
        private $password = ''; // Your MySQL password (often empty for XAMPP/WAMP root)

    Apache Server Configuration:

        Enable mod_rewrite: Make sure the mod_rewrite module is enabled in your Apache httpd.conf file (the line LoadModule rewrite_module modules/mod_rewrite.so should not be commented out with #).

        Set AllowOverride: In httpd.conf, locate the <Directory> block for your htdocs (or your web server's document root) and set AllowOverride All. This enables .htaccess files.

    Restart Apache:

        After making any changes to Apache configuration files, it is crucial to restart your Apache server. (In XAMPP Control Panel, Stop then Start Apache).

    Run the Application:

        Open your web browser and navigate to the following address:
        http://localhost/test/login.html
        (The folder's name should remain test all the time)

        You should now be able to register and log in to the application.

Contributing

Contributions, bug reports, and feature suggestions are welcome! Feel free to open an issue or submit a pull request.
License

This project is licensed under the MIT License.


