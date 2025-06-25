CREATE DATABASE todo_list CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Table for users
CREATE TABLE IF NOT EXISTS `user` (
    `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL, -- Changed from 'name'
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL, -- Stores the hashed password
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for folders
CREATE TABLE IF NOT EXISTS `folder` (
    `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `user_id` INT(11) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_folder_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `user` (`id`)
        ON DELETE CASCADE -- If a user is deleted, their folders are also deleted
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tasks
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `folder_id` INT(11) NULL, -- Can be NULL for tasks not in a specific folder
    `user_id` INT(11) NOT NULL,
    `status` ENUM('todo', 'in_progress', 'done') DEFAULT 'todo',
    `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `due_date` DATE NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_tasks_folder`
        FOREIGN KEY (`folder_id`)
        REFERENCES `folder` (`id`)
        ON DELETE CASCADE, -- If a folder is deleted, its tasks are also deleted
    CONSTRAINT `fk_tasks_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `user` (`id`)
        ON DELETE CASCADE -- If a user is deleted, their tasks are also deleted
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance on common lookups
CREATE INDEX `idx_user_email` ON `user` (`email`);
CREATE INDEX `idx_folder_user_id` ON `folder` (`user_id`);
CREATE INDEX `idx_tasks_user_id` ON `tasks` (`user_id`);
CREATE INDEX `idx_tasks_folder_id` ON `tasks` (`folder_id`);