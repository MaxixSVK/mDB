CREATE DATABASE IF NOT EXISTS `mdatabase`;
USE `mdatabase`;

DROP TABLE IF EXISTS `series`;

CREATE TABLE `series` (
  `series_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `author_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `img` BOOLEAN NOT NULL DEFAULT FALSE,
  `format` ENUM('lightNovel', 'manga') NOT NULL,
  `status` ENUM('reading', 'finished', 'stopped', 'paused') NOT NULL DEFAULT 'reading',
  PRIMARY KEY (`series_id`),
  KEY `user_id` (`user_id`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `series_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `series_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `authors` (`author_id`)
);

DROP TABLE IF EXISTS `books`;

CREATE TABLE `books` (
  `book_id` int(11) NOT NULL AUTO_INCREMENT,
  `series_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `isbn` varchar(17) DEFAULT NULL,
  `startedReading` date DEFAULT NULL,
  `endedReading` date DEFAULT NULL,
  `img` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`book_id`),
  KEY `series_id` (`series_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `books_ibfk_1` FOREIGN KEY (`series_id`) REFERENCES `series` (`series_id`),
  CONSTRAINT `books_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

DROP TABLE IF EXISTS `chapters`;

CREATE TABLE `chapters` (
  `chapter_id` int(11) NOT NULL AUTO_INCREMENT,
  `book_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`chapter_id`),
  KEY `book_id` (`book_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chapters_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`),
  CONSTRAINT `chapters_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

DROP TABLE IF EXISTS `authors`;

CREATE TABLE `authors` (
  `author_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `bio` text DEFAULT NULL,
  PRIMARY KEY (`author_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `authors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `username` (`username`) USING BTREE,
  UNIQUE KEY `email` (`email`) USING BTREE
);

DROP TABLE IF EXISTS `sessions`;

CREATE TABLE `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `user_agent` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `session_token` (`session_token`) USING BTREE,
  KEY `user_id` (`user_id`) USING BTREE,
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

DROP TABLE IF EXISTS `logs`;

CREATE TABLE logs (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `change_type` VARCHAR(50),
    `table_name` VARCHAR(50),
    `record_id` INT,
    `old_data` JSON,
    `new_data` JSON,
    `change_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `user_id` (`user_id`),
    CONSTRAINT `logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);