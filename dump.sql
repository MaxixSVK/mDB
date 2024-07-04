-- --------------------------------------------------------
-- Hostiteľ:                     127.0.0.1
-- Verze serveru:                11.4.2-MariaDB - mariadb.org binary distribution
-- OS serveru:                   Win64
-- HeidiSQL Verzia:              12.6.0.6765
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Exportování struktury databáze pro
CREATE DATABASE IF NOT EXISTS `mdatabase` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `mdatabase`;

-- Exportování struktury pro tabulka mdatabase.books
CREATE TABLE IF NOT EXISTS `books` (
  `book_id` int(11) NOT NULL AUTO_INCREMENT,
  `series_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `startedReading` date DEFAULT NULL,
  `endedReading` date DEFAULT NULL,
  PRIMARY KEY (`book_id`),
  KEY `series_id` (`series_id`),
  CONSTRAINT `books_ibfk_1` FOREIGN KEY (`series_id`) REFERENCES `series` (`series_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportování dat pro tabulku mdatabase.books: ~11 rows (přibližně)
INSERT INTO `books` (`book_id`, `series_id`, `name`, `startedReading`, `endedReading`) VALUES
	(1, 1, 'Volume 1', '2024-06-21', NULL),
	(2, 2, 'Oshi no Ko Volume 1', '2024-02-03', '2023-02-07'),
	(3, 2, 'Oshi no Ko Volume 2', '2024-03-13', '2024-03-15'),
	(4, 3, 'DARLING in the FRANXX Vol. 1-2', '2024-04-25', '2024-04-28'),
	(5, 3, 'DARLING in the FRANXX Vol. 3-4', '2024-04-28', '2024-05-17'),
	(6, 4, 'Re:Zero Light Novel Volume 1', '2023-12-04', '2024-01-07'),
	(7, 4, 'Short stories ARC 1', '2024-02-16', '2024-02-16'),
	(8, 4, 'Re:Zero Light Novel Volume 2', '2024-01-08', '2024-02-02'),
	(9, 4, 'Re:Zero Light Novel Volume 3', '2024-02-08', '2024-03-07'),
	(10, 4, 'Short stories ARC 2', '2024-03-17', '2024-05-28'),
	(11, 4, 'Frozen Bonds', '2024-06-09', '2024-06-17');

-- Exportování struktury pro tabulka mdatabase.chapters
CREATE TABLE IF NOT EXISTS `chapters` (
  `chapter_id` int(11) NOT NULL AUTO_INCREMENT,
  `book_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`chapter_id`),
  KEY `book_id` (`book_id`),
  CONSTRAINT `chapters_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`)
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportování dat pro tabulku mdatabase.chapters: ~119 rows (přibližně)
INSERT INTO `chapters` (`chapter_id`, `book_id`, `name`, `date`) VALUES
	(7, 1, 'The Structure of Japanese Society', '2024-06-21'),
	(8, 1, 'Welcome to the School Life of your Dreams', '2024-06-22'),
	(9, 1, 'The Students of Class D', '2024-06-26'),
	(10, 1, 'Ladies and Gentlemen, Thank You for Waiting!', '2024-06-27'),
	(11, 1, 'The End of Everyday Life', '2024-06-29'),
	(12, 1, 'Classroom of the Elite', '2024-06-30'),
	(13, 2, 'Chapter 1: Mother & Children', '2023-02-04'),
	(14, 2, 'Chapter 2: Big Brother & Little Sister', '2023-02-04'),
	(15, 2, 'Chapter 3: Babysitter', '2023-02-05'),
	(16, 2, 'Chapter 4: How to Smile', '2023-02-05'),
	(17, 2, 'Chapter 5: Director & Actress', '2023-02-05'),
	(18, 2, 'Chapter 6: Child Actors', '2023-02-06'),
	(19, 2, 'Chapter 7: If You Fear Falling, You\'ll Fall Harder', '2023-02-06'),
	(20, 2, 'Chapter 8: Ai Hoshino Part 1', '2023-02-07'),
	(21, 2, 'Chapter 9: Ai Hoshino: Part 2', '2023-02-07'),
	(22, 2, 'Chapter 10: Introduction', '2023-02-07'),
	(23, 3, 'Chapter 11: Audition', '2024-03-13'),
	(24, 3, 'Chapter 12: The Third Option', '2024-03-13'),
	(25, 3, 'Chapter 13: Procedures', '2024-03-13'),
	(26, 3, 'Chapter 14: Connection', '2024-03-13'),
	(27, 3, 'Chapter 15: The Manga Drama', '2024-03-14'),
	(28, 3, 'Chapter 16: Acting Skills', '2024-03-14'),
	(29, 3, 'Chapter 17: Staging', '2024-03-14'),
	(30, 3, 'Chapter 18: Modest Praise', '2024-03-15'),
	(31, 3, 'Chapter 19: The Entertainment Department', '2024-03-15'),
	(32, 3, 'Chapter 20: New Member', '2024-03-15'),
	(33, 4, 'Chapter 1', '2024-04-25'),
	(34, 4, 'Chapter 2', '2024-04-25'),
	(35, 4, 'Chapter 3', '2024-04-25'),
	(36, 4, 'Chapter 4', '2024-04-26'),
	(37, 4, 'Chapter 5', '2024-04-26'),
	(38, 4, 'Chapter 6', '2024-04-26'),
	(39, 4, 'Chapter 7', '2024-04-27'),
	(40, 4, 'Chapter 8', '2024-04-27'),
	(41, 4, 'Chapter 9', '2024-04-27'),
	(42, 4, 'Chapter 10', '2024-04-27'),
	(43, 4, 'Chapter 11', '2024-04-27'),
	(44, 4, 'Chapter 12', '2024-04-27'),
	(45, 4, 'Chapter 13', '2024-04-28'),
	(46, 5, 'Chapter 14', '2024-04-28'),
	(47, 5, 'Chapter 15', '2024-04-28'),
	(48, 5, 'Chapter 16', '2024-04-29'),
	(49, 5, 'Chapter 17', '2024-04-29'),
	(50, 5, 'Chapter 18', '2024-04-29'),
	(51, 5, 'Chapter 19', '2024-05-01'),
	(52, 5, 'Chapter 20', '2024-05-01'),
	(53, 5, 'Chapter 21', '2024-05-16'),
	(54, 5, 'Chapter 22', '2024-05-16'),
	(55, 5, 'Chapter 23', '2024-05-16'),
	(56, 5, 'Chapter 24', '2024-05-16'),
	(57, 5, 'Chapter 25', '2024-05-17'),
	(58, 5, 'Chapter 26', '2024-05-17'),
	(59, 5, 'Chapter 27', '2024-05-17'),
	(60, 5, 'Chapter 28', '2024-05-17'),
	(61, 6, 'Prologue: Waste Heat of the Beginning', '2023-12-04'),
	(62, 6, 'Chapter 1: The End of the Beginning', '2023-12-06'),
	(63, 6, 'Chapter 2: A Struggle Too Late', '2023-12-09'),
	(64, 6, 'Chapter 3: End and Beginning', '2023-12-12'),
	(65, 6, 'Chapter 4: Fourth Time\'s the Charm', '2024-01-06'),
	(66, 6, 'Chapter 5: Life Started in Another World from Zero', '2024-01-07'),
	(67, 6, 'Epilogue: The Moon is Watching', '2024-01-07'),
	(68, 7, 'The Awkward Duo', '2024-03-16'),
	(69, 7, 'Lone Wolf of the Slums Felt-chan’s Noisy Days', '2024-03-16'),
	(70, 7, 'Behind the Scenes of Life in Another World from Zero', '2024-03-16'),
	(71, 8, 'Prologue: The Road to Redemption Begins', '2024-01-08'),
	(72, 8, 'Chapter 1: Self-Conscious Feelings', '2024-01-15'),
	(73, 8, 'Chapter 2: The Promised Morn Grows Distant', '2024-01-23'),
	(74, 8, 'Chapter 3: The Sound of Chains', '2024-01-29'),
	(75, 8, 'Chapter 4: A Deadly Game of Tag', '2024-02-01'),
	(76, 8, 'Chapter 5: The Morning He Yearned For', '2024-02-02'),
	(77, 9, 'Chapter 1: Subaru Natsuki\'s Restart', '2024-02-10'),
	(78, 9, 'Chapter 2: I Cried and Screamed and Will Cry No More', '2024-02-19'),
	(79, 9, 'Chapter 3: The Meaning of Courage', '2024-02-28'),
	(80, 9, 'Chapter 4: The Demonic Method', '2024-03-04'),
	(81, 9, 'Interlude: Rem', '2024-03-05'),
	(82, 9, 'Chapter 5: All in', '2024-03-06'),
	(83, 9, 'Epilogue: Talking About the Future', '2024-03-07'),
	(84, 9, 'Interlude: A Private Chat under the Moon', '2024-03-07'),
	(85, 10, 'Librarian Beatrice’s Reluctant Promise', '2024-03-17'),
	(86, 10, 'Ram is Order', '2024-03-19'),
	(87, 10, 'Librarian Beatrice’s Log Restart', '2024-03-21'),
	(88, 10, 'Rem and Subaru Meet', '2024-03-21'),
	(89, 10, 'Re: Zero EX, I Can Hear the Festival Music', '2024-03-21'),
	(90, 10, 'Natsuki Subaru’s Splendid Steward Life', '2024-03-22'),
	(91, 10, 'Roswaal Mansion Girls Party (Bathing Room Edition)', '2024-03-22'),
	(92, 10, 'Ram and the Night Study Group', '2024-03-22'),
	(93, 10, 'Rem’s Latte Art', '2024-03-24'),
	(94, 10, 'The World Petra Saw', '2024-03-25'),
	(95, 10, 'The Loving World Petra Saw', '2024-03-26'),
	(96, 10, 'Operation Kokkuri', '2024-03-26'),
	(97, 10, 'A Foolish Teatime in April', '2024-04-19'),
	(98, 10, 'My Fair Bad Lady', '2024-04-19'),
	(99, 10, 'Rem’s Very Ordinary Happy Day', '2024-04-19'),
	(100, 10, 'Blessing Day EX: Rem-rin’s Day', '2024-04-19'),
	(101, 10, 'Blessing Day EX: Rem’s Birthday Party', '2024-04-19'),
	(102, 10, 'Oni Sisters of the Hidden Village EX: Blessing Day', '2024-04-28'),
	(103, 10, 'Emilia’s Very Happy Birthday', '2024-04-30'),
	(104, 10, 'Lugunica Newspaper Volume 3, Ram and Rem’s Hectic Birthday Celebration', '2024-05-07'),
	(105, 10, 'Librarian Beatrice’s Log Page Two', '2024-05-07'),
	(106, 10, 'Roswaal Mansion Girls Party (Dressing Room Edition)', '2024-05-16'),
	(107, 10, 'Oni Sisters of the Hidden Village, A Happy Bad Dream', '2024-05-19'),
	(108, 10, 'Oni Sisters of the Hidden Village, the Role of an Oni', '2024-05-19'),
	(109, 10, 'Oni Sisters of the Hidden Village, Nocturnal Reverie Sisters', '2024-05-19'),
	(110, 10, 'The Head Maid’s Restless Day Off', '2024-05-21'),
	(111, 10, 'Emilia’s First Date', '2024-05-22'),
	(112, 10, 'Re: Starting a Menu Life from Zero', '2024-05-22'),
	(113, 10, 'Ram’s Older Sister Heart is Complicated', '2024-05-23'),
	(114, 10, 'Rem’s Maiden Heart is Super Complex', '2024-05-23'),
	(115, 10, 'The Best Day of Rem’s Life', '2024-05-23'),
	(116, 10, 'Re: Starting Life in an Endless Summer from Zero', '2024-05-27'),
	(117, 10, 'Lugunica Newspaper Volume 1', '2024-05-27'),
	(118, 10, 'King Chapter', '2024-05-28'),
	(119, 11, 'Prologue – Four Greats and an Outsider', '2024-06-09'),
	(120, 11, 'Chapter 1 – Called by You', '2024-06-09'),
	(121, 11, 'Chapter 2 – I Am Here', '2024-06-09'),
	(122, 11, 'Chapter 3 – If It’s For You', '2024-06-12'),
	(123, 11, 'Chapter 4 – I Can Become Anything', '2024-06-16'),
	(124, 11, 'Epilogue – The Meaning of Happiness', '2024-06-17'),
	(125, 11, 'Frozen Bonds: What Happened After', '2024-06-17');

-- Exportování struktury pro tabulka mdatabase.series
CREATE TABLE IF NOT EXISTS `series` (
  `series_id` int(11) NOT NULL AUTO_INCREMENT,
  `seriesName` varchar(255) DEFAULT NULL,
  `img` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`series_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportování dat pro tabulku mdatabase.series: ~4 rows (přibližně)
INSERT INTO `series` (`series_id`, `seriesName`, `img`) VALUES
	(1, 'Classroom of the Elite', 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx94970-q77X5sfRIKvU.jpg'),
	(2, 'Oshi no Ko', 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-r3kf8eF0xkDJ.png'),
	(3, 'DARLING in the FRANXX', 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/nx100937-yGH5hLbEFtOv.jpg'),
	(4, 'Re:Zero − Starting Life in Another World', 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx85737-WkWOr5EgwPyo.jpg');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
