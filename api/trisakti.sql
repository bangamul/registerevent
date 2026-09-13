-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 13, 2026 at 05:13 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `trisakti`
--

-- --------------------------------------------------------

--
-- Table structure for table `log_activity`
--

CREATE TABLE `log_activity` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_admin_id` int(10) UNSIGNED NOT NULL,
  `participant_id` int(10) UNSIGNED NOT NULL,
  `activity` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `log_activity`
--

INSERT INTO `log_activity` (`id`, `user_admin_id`, `participant_id`, `activity`, `description`, `created_at`) VALUES
(1, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 01:39:21'),
(2, 2, 1, 'CHECKOUT', 'Peserta melakukan clock out (keluar area) (Mr. Reza Pahlevi)', '2026-09-13 01:39:31'),
(3, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 01:39:39'),
(4, 2, 1, 'CHECKOUT', 'Peserta melakukan clock out (keluar area) (Mr. Reza Pahlevi)', '2026-09-13 01:39:44'),
(5, 2, 1, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 01:39:47'),
(6, 2, 1, 'CHECKOUT', 'Peserta melakukan clock out (keluar area) (Mr. Reza Pahlevi)', '2026-09-13 01:39:51'),
(7, 2, 1, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 01:39:53'),
(8, 2, 1, 'CHECKOUT', 'Peserta melakukan clock out (keluar area) (Mr. Reza Pahlevi)', '2026-09-13 01:39:55'),
(9, 2, 1, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:02:29'),
(10, 2, 1, 'CHECKOUT', 'Peserta melakukan clock out (keluar area) (Mr. Reza Pahlevi)', '2026-09-13 14:02:32'),
(11, 2, 1, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:02:35'),
(12, 2, 1, 'CHECKOUT', 'Peserta melakukan clock out (keluar area) (Mr. Reza Pahlevi)', '2026-09-13 14:02:38'),
(13, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:48:35'),
(14, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:49:11'),
(15, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:49:18'),
(16, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:50:07'),
(17, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:50:54'),
(18, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:52:45'),
(19, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:53:00'),
(20, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:54:38'),
(21, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:55:23'),
(22, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:58:19'),
(23, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 14:59:29'),
(24, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:16:23'),
(25, 1, 1, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:17:57'),
(26, 1, 1, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:23:12'),
(27, 1, 2, 'CHECK_IN_SESI_2', 'Validasi kehadiran Sesi 2 peserta Siti Rahmawati (REG-2026-002)', '2026-09-13 15:23:28'),
(28, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:24:20'),
(29, 2, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:24:32'),
(30, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:26:10'),
(31, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:27:49'),
(32, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:27:55'),
(33, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:28:16'),
(34, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:28:46'),
(35, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:29:04'),
(36, 1, 1, 'CHECK_IN_SESI_1', 'Validasi kehadiran Sesi 1 peserta Mr. Reza Pahlevi (REG-2026-001)', '2026-09-13 15:38:17');

-- --------------------------------------------------------

--
-- Table structure for table `user_admin`
--

CREATE TABLE `user_admin` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_admin`
--

INSERT INTO `user_admin` (`id`, `name`, `password`, `status`) VALUES
(1, 'admin1', '62cc2d8b4bf2d8728120d052163a77df', 1),
(2, 'admin2', '62cc2d8b4bf2d8728120d052163a77df', 1),
(3, 'admin3', '62cc2d8b4bf2d8728120d052163a77df', 1),
(4, 'admin4', '62cc2d8b4bf2d8728120d052163a77df', 1),
(5, 'admin5', '62cc2d8b4bf2d8728120d052163a77df', 1),
(6, 'superadmin', 'ffa1d6dd22119b761ce7c2531c656ad0', 2);

-- --------------------------------------------------------

--
-- Table structure for table `user_peserta`
--

CREATE TABLE `user_peserta` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_registrasi` varchar(100) NOT NULL,
  `id_independent` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `notelp` varchar(30) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `pekerjaan` varchar(100) DEFAULT NULL,
  `waktu_hadir` datetime DEFAULT NULL,
  `waktu_sesi_2` datetime DEFAULT NULL,
  `gate` varchar(20) DEFAULT NULL,
  `role_permission` varchar(20) DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_peserta`
--

INSERT INTO `user_peserta` (`id`, `id_registrasi`, `id_independent`, `name`, `notelp`, `email`, `foto`, `pekerjaan`, `waktu_hadir`, `waktu_sesi_2`, `gate`, `role_permission`, `status`) VALUES
(1, 'REG-2026-001', 'IND-000001', 'Mr. M. Reza Pahlevi', '081234567890', 'reza@example.com', 'foto_1789204017_6aa5163141155.jpeg', 'Software Engineer Profesional', '2026-09-12 15:16:23', '2026-09-12 15:17:57', '1', '2', 1),
(2, 'REG-2026-002', 'IND-000002', 'Siti Rahmawati', '081298765432', 'siti.rahmawati@example.com', 'wanita.png', 'Marketing Specialist', NULL, '2026-09-13 15:23:28', '1', '2', 0),
(3, 'REG-76BCEE3A', 'IND-B2304EF2', 'Terbaru Banget', '012', 'test@example.com', '6e64074fcc75bb92cdccd6c20b977bfb.jpeg', 'Tester', NULL, NULL, '2', '1', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `log_activity`
--
ALTER TABLE `log_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_admin_id` (`user_admin_id`),
  ADD KEY `idx_participant_id` (`participant_id`),
  ADD KEY `idx_activity` (`activity`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `user_admin`
--
ALTER TABLE `user_admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_peserta`
--
ALTER TABLE `user_peserta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_id_independent` (`id_independent`),
  ADD KEY `idx_id_registrasi` (`id_registrasi`),
  ADD KEY `idx_nama` (`name`),
  ADD KEY `idx_status` (`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `log_activity`
--
ALTER TABLE `log_activity`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `user_admin`
--
ALTER TABLE `user_admin`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_peserta`
--
ALTER TABLE `user_peserta`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `log_activity`
--
ALTER TABLE `log_activity`
  ADD CONSTRAINT `fk_log_participant` FOREIGN KEY (`participant_id`) REFERENCES `user_peserta` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_log_user_admin` FOREIGN KEY (`user_admin_id`) REFERENCES `user_admin` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
