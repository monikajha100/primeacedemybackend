-- Fix employee_punches table: Update breaks column and add new columns
-- Run this SQL script to fix the breaks field and add new attendance columns

-- First, update existing NULL breaks to empty array
UPDATE `employee_punches` 
SET `breaks` = JSON_ARRAY() 
WHERE `breaks` IS NULL;

-- Add new columns if they don't exist (safe to run multiple times)
ALTER TABLE `employee_punches` 
ADD COLUMN IF NOT EXISTS `punchInPhoto` VARCHAR(255) NULL AFTER `punchOutAt`,
ADD COLUMN IF NOT EXISTS `punchOutPhoto` VARCHAR(255) NULL AFTER `punchInPhoto`,
ADD COLUMN IF NOT EXISTS `punchInFingerprint` TEXT NULL AFTER `punchOutPhoto`,
ADD COLUMN IF NOT EXISTS `punchOutFingerprint` TEXT NULL AFTER `punchInFingerprint`,
ADD COLUMN IF NOT EXISTS `punchInLocation` JSON NULL AFTER `punchOutFingerprint`,
ADD COLUMN IF NOT EXISTS `punchOutLocation` JSON NULL AFTER `punchInLocation`,
ADD COLUMN IF NOT EXISTS `effectiveWorkingHours` DECIMAL(10, 2) NULL AFTER `punchOutLocation`;

-- Modify breaks column to have default empty array
-- Note: MySQL 8.0.13+ supports DEFAULT with JSON functions
ALTER TABLE `employee_punches` 
MODIFY COLUMN `breaks` JSON NULL DEFAULT (JSON_ARRAY());

-- Alternative for older MySQL versions (if above fails):
-- ALTER TABLE `employee_punches` 
-- MODIFY COLUMN `breaks` JSON NULL;




