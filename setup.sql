CREATE DATABASE IF NOT EXISTS `mdb_prod`;
USE `mdb_prod`;

DROP TABLE IF EXISTS `chapters`;
DROP TABLE IF EXISTS `books`;
DROP TABLE IF EXISTS `series`;
DROP TABLE IF EXISTS `authors`;
DROP TABLE IF EXISTS `library_logs`;
DROP TABLE IF EXISTS `account_logs`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `public` BOOLEAN NOT NULL DEFAULT TRUE,
    `pfp` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `session_token` VARCHAR(255) NOT NULL UNIQUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    `user_agent` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    KEY `user_id` (`user_id`),
    CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

CREATE TABLE `account_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `type` ENUM('register', 'login', 'logout', 'change_password', 'change_email', 'change_username') NOT NULL,
    `success` BOOLEAN NOT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `user_id` (`user_id`),
    CONSTRAINT `account_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

CREATE TABLE `library_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `change_type` VARCHAR(50) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` INT NOT NULL,
    `old_data` JSON DEFAULT NULL,
    `new_data` JSON DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `user_id` (`user_id`),
    CONSTRAINT `library_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

CREATE TABLE `authors` (
    `author_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `bio` TEXT DEFAULT NULL,
    KEY `user_id` (`user_id`),
    CONSTRAINT `authors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

CREATE TABLE `series` (
    `series_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `author_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `img` BOOLEAN NOT NULL DEFAULT FALSE,
    `format` ENUM('lightNovel', 'manga') NOT NULL,
    `status` ENUM('reading', 'finished', 'stopped', 'paused') NOT NULL DEFAULT 'reading',
    KEY `user_id` (`user_id`),
    KEY `author_id` (`author_id`),
    CONSTRAINT `series_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
    CONSTRAINT `series_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `authors` (`author_id`)
);

CREATE TABLE `books` (
    `book_id` INT AUTO_INCREMENT PRIMARY KEY,
    `series_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `isbn` VARCHAR(13) DEFAULT NULL,
    `started_reading` DATE DEFAULT NULL,
    `ended_reading` DATE DEFAULT NULL,
    `img` BOOLEAN NOT NULL DEFAULT FALSE,
    `current_page` INT DEFAULT NULL,
    `total_pages` INT DEFAULT NULL,
    KEY `series_id` (`series_id`),
    KEY `user_id` (`user_id`),
    CONSTRAINT `books_ibfk_1` FOREIGN KEY (`series_id`) REFERENCES `series` (`series_id`),
    CONSTRAINT `books_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

CREATE TABLE `chapters` (
    `chapter_id` INT AUTO_INCREMENT PRIMARY KEY,
    `book_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `date` DATE DEFAULT NULL,
    KEY `book_id` (`book_id`),
    KEY `user_id` (`user_id`),
    CONSTRAINT `chapters_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`),
    CONSTRAINT `chapters_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);