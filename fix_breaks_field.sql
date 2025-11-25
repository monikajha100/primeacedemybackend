-- Fix breaks field in employee_punches table
-- This script ensures the breaks field is properly formatted as a JSON array

-- Step 1: Check current state
SELECT 
    id,
    userId,
    date,
    breaks,
    JSON_TYPE(breaks) as breaks_type,
    CASE 
        WHEN breaks IS NULL THEN 'NULL'
        WHEN JSON_VALID(breaks) = 0 THEN 'Invalid JSON'
        WHEN JSON_TYPE(breaks) = 'ARRAY' THEN 'Valid Array'
        ELSE 'Other Type'
    END as status
FROM employee_punches
WHERE date >= CURDATE() - INTERVAL 7 DAY
ORDER BY date DESC, id DESC
LIMIT 10;

-- Step 2: Fix NULL breaks to empty array
UPDATE employee_punches 
SET breaks = JSON_ARRAY()
WHERE breaks IS NULL;

-- Step 3: Fix invalid JSON breaks
UPDATE employee_punches 
SET breaks = JSON_ARRAY()
WHERE breaks IS NOT NULL 
  AND (JSON_VALID(breaks) = 0 OR breaks = '' OR breaks = 'null');

-- Step 4: Convert non-array JSON to array (if any single objects exist)
-- This is a safety measure - should not be needed if code is correct
UPDATE employee_punches 
SET breaks = JSON_ARRAY(breaks)
WHERE breaks IS NOT NULL 
  AND JSON_VALID(breaks) = 1 
  AND JSON_TYPE(breaks) != 'ARRAY';

-- Step 5: Verify fixes
SELECT 
    id,
    userId,
    date,
    breaks,
    JSON_TYPE(breaks) as breaks_type,
    JSON_LENGTH(breaks) as breaks_count
FROM employee_punches
WHERE date >= CURDATE() - INTERVAL 7 DAY
ORDER BY date DESC, id DESC
LIMIT 10;




