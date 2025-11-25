-- Simple fix for employee_punches breaks field
-- This script ensures breaks is always a valid JSON array

-- Update all NULL breaks to empty array
UPDATE `employee_punches` 
SET `breaks` = '[]' 
WHERE `breaks` IS NULL OR `breaks` = 'null';

-- Add new columns for employee attendance features
ALTER TABLE `employee_punches` 
ADD COLUMN `punchInPhoto` VARCHAR(255) NULL,
ADD COLUMN `punchOutPhoto` VARCHAR(255) NULL,
ADD COLUMN `punchInFingerprint` TEXT NULL,
ADD COLUMN `punchOutFingerprint` TEXT NULL,
ADD COLUMN `punchInLocation` JSON NULL,
ADD COLUMN `punchOutLocation` JSON NULL,
ADD COLUMN `effectiveWorkingHours` DECIMAL(10, 2) NULL;




