-- Test SQL to check and fix breaks field in employee_punches table
-- Run this to diagnose and fix break issues

-- 1. Check current breaks data
SELECT 
    id, 
    userId, 
    date, 
    breaks, 
    JSON_TYPE(breaks) as breaks_type,
    JSON_LENGTH(breaks) as breaks_length
FROM employee_punches 
WHERE breaks IS NOT NULL
LIMIT 10;

-- 2. Check if breaks is valid JSON
SELECT 
    id,
    userId,
    date,
    breaks,
    CASE 
        WHEN breaks IS NULL THEN 'NULL'
        WHEN JSON_VALID(breaks) THEN 'Valid JSON'
        ELSE 'Invalid JSON'
    END as json_status
FROM employee_punches
LIMIT 10;

-- 3. Fix any NULL breaks to empty array
UPDATE employee_punches 
SET breaks = JSON_ARRAY()
WHERE breaks IS NULL OR breaks = 'null' OR breaks = '';

-- 4. Fix any invalid JSON breaks
UPDATE employee_punches 
SET breaks = JSON_ARRAY()
WHERE breaks IS NOT NULL AND JSON_VALID(breaks) = 0;

-- 5. Verify fixes
SELECT 
    id,
    userId,
    date,
    breaks,
    JSON_TYPE(breaks) as breaks_type,
    JSON_LENGTH(breaks) as breaks_length
FROM employee_punches 
WHERE date = CURDATE()
LIMIT 5;




