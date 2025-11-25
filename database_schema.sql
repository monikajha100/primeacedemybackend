-- ============================================
-- Prime Academy Database Schema
-- MySQL Database Setup Script
-- ============================================

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE primeacademy_db;

-- Drop tables if they exist (in reverse order to handle foreign keys)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `student_leaves`;
DROP TABLE IF EXISTS `batch_extensions`;
DROP TABLE IF EXISTS `software_completions`;
DROP TABLE IF EXISTS `employee_punches`;
DROP TABLE IF EXISTS `change_requests`;
DROP TABLE IF EXISTS `portfolios`;
DROP TABLE IF EXISTS `payment_transactions`;
DROP TABLE IF EXISTS `attendances`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `batches`;
DROP TABLE IF EXISTS `faculty_profiles`;
DROP TABLE IF EXISTS `student_profiles`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(255) NULL,
  `role` ENUM('superadmin', 'admin', 'faculty', 'student', 'employee') NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `avatarUrl` VARCHAR(255) NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_isActive` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: student_profiles
-- ============================================
CREATE TABLE `student_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `dob` DATE NULL,
  `address` TEXT NULL,
  `documents` JSON NULL,
  `photoUrl` VARCHAR(255) NULL,
  `softwareList` JSON NULL,
  `enrollmentDate` DATE NULL,
  `status` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: faculty_profiles
-- ============================================
CREATE TABLE `faculty_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `expertise` JSON NULL,
  `availability` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: batches
-- ============================================
CREATE TABLE `batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `software` VARCHAR(255) NULL,
  `mode` ENUM('online', 'offline') NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `maxCapacity` INT NOT NULL,
  `schedule` JSON NULL,
  `createdByAdminId` INT NULL,
  `status` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_createdByAdminId` (`createdByAdminId`),
  INDEX `idx_mode` (`mode`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: enrollments
-- ============================================
CREATE TABLE `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `batchId` INT NOT NULL,
  `enrollmentDate` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `status` VARCHAR(255) NULL,
  `paymentPlan` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_enrollmentDate` (`enrollmentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: sessions
-- ============================================
CREATE TABLE `sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batchId` INT NOT NULL,
  `facultyId` INT NULL,
  `date` DATE NOT NULL,
  `startTime` TIME NOT NULL,
  `endTime` TIME NOT NULL,
  `topic` VARCHAR(255) NULL,
  `isBackup` BOOLEAN DEFAULT FALSE,
  `status` ENUM('scheduled', 'ongoing', 'completed') NOT NULL DEFAULT 'scheduled',
  `actualStartAt` DATETIME NULL,
  `actualEndAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`facultyId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_facultyId` (`facultyId`),
  INDEX `idx_date` (`date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: attendances
-- ============================================
CREATE TABLE `attendances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sessionId` INT NOT NULL,
  `studentId` INT NOT NULL,
  `status` ENUM('present', 'absent', 'manual_present') NOT NULL,
  `isManual` BOOLEAN DEFAULT FALSE,
  `markedBy` INT NULL,
  `markedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`markedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_sessionId` (`sessionId`),
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: payment_transactions
-- ============================================
CREATE TABLE `payment_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `dueDate` DATE NOT NULL,
  `paidAt` DATETIME NULL,
  `status` ENUM('pending', 'partial', 'paid') NOT NULL DEFAULT 'pending',
  `receiptUrl` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_dueDate` (`dueDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: portfolios
-- ============================================
CREATE TABLE `portfolios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `batchId` INT NOT NULL,
  `files` JSON NULL,
  `pdfUrl` VARCHAR(500) NULL,
  `youtubeUrl` VARCHAR(500) NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `approvedBy` INT NULL,
  `approvedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: change_requests
-- ============================================
CREATE TABLE `change_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entityType` VARCHAR(255) NOT NULL,
  `entityId` INT NOT NULL,
  `requestedBy` INT NOT NULL,
  `approverId` INT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `reason` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_requestedBy` (`requestedBy`),
  INDEX `idx_approverId` (`approverId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_entity` (`entityType`, `entityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: employee_punches
-- ============================================
CREATE TABLE `employee_punches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `date` DATE NOT NULL,
  `punchInAt` DATETIME NULL,
  `punchOutAt` DATETIME NULL,
  `breaks` JSON NULL DEFAULT (JSON_ARRAY()),
  `punchInPhoto` VARCHAR(255) NULL,
  `punchOutPhoto` VARCHAR(255) NULL,
  `punchInFingerprint` TEXT NULL,
  `punchOutFingerprint` TEXT NULL,
  `punchInLocation` JSON NULL,
  `punchOutLocation` JSON NULL,
  `effectiveWorkingHours` DECIMAL(10, 2) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_date` (`date`),
  UNIQUE KEY `unique_user_date` (`userId`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: student_leaves
-- ============================================
CREATE TABLE `student_leaves` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `batchId` INT NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `approvedBy` INT NULL,
  `approvedAt` DATETIME NULL,
  `rejectionReason` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_dates` (`startDate`, `endDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: batch_extensions
-- ============================================
CREATE TABLE `batch_extensions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batchId` INT NOT NULL,
  `requestedBy` INT NOT NULL,
  `numberOfSessions` INT NOT NULL,
  `reason` TEXT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `approvedBy` INT NULL,
  `approvedAt` DATETIME NULL,
  `rejectionReason` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_requestedBy` (`requestedBy`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: software_completions
-- ============================================
CREATE TABLE `software_completions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `batchId` INT NOT NULL,
  `softwareName` VARCHAR(255) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `facultyId` INT NULL,
  `status` ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  `completedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`facultyId`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_facultyId` (`facultyId`),
  INDEX `idx_softwareName` (`softwareName`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert Default Users
-- Password: password123 (bcrypt hash)
-- ============================================

-- Note: These password hashes are for the password "password123"
-- Generated using bcrypt with 10 salt rounds
-- You can generate new ones using: bcrypt.hash('password123', 10)

INSERT INTO `users` (`name`, `email`, `phone`, `role`, `passwordHash`, `isActive`, `createdAt`, `updatedAt`) VALUES
('Super Admin', 'superadmin@primeacademy.com', '+1234567890', 'superadmin', '$2b$10$0UEV14Rw5NkIBOIGnFIVBeApPLcoK5DVSsFGxhdId1agJTJgZ1ivm', TRUE, NOW(), NOW()),
('Admin User', 'admin@primeacademy.com', '+1234567891', 'admin', '$2b$10$0UEV14Rw5NkIBOIGnFIVBeApPLcoK5DVSsFGxhdId1agJTJgZ1ivm', TRUE, NOW(), NOW()),
('Faculty User', 'faculty@primeacademy.com', '+1234567892', 'faculty', '$2b$10$0UEV14Rw5NkIBOIGnFIVBeApPLcoK5DVSsFGxhdId1agJTJgZ1ivm', TRUE, NOW(), NOW()),
('Student User', 'student@primeacademy.com', '+1234567893', 'student', '$2b$10$0UEV14Rw5NkIBOIGnFIVBeApPLcoK5DVSsFGxhdId1agJTJgZ1ivm', TRUE, NOW(), NOW());

-- ============================================
-- Default Login Credentials
-- All users have the password: password123
-- 
-- SuperAdmin: superadmin@primeacademy.com
-- Admin: admin@primeacademy.com
-- Faculty: faculty@primeacademy.com
-- Student: student@primeacademy.com
-- ============================================

