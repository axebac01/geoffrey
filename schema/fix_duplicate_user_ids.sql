-- Fix: Remove duplicate user_id entries in businesses table
-- This script keeps the most recent business for each user_id and deletes older duplicates
-- Handles the case where the constraint might already exist but can't be enforced due to duplicates

-- Step 1: Drop the constraint if it exists (it might exist but be invalid due to duplicates)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_user_id_unique;

-- Step 2: Identify duplicates (for reference - you can check this first)
SELECT 
    user_id, 
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as business_ids,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM businesses
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Step 3: Delete duplicate rows, keeping only the most recent one for each user_id
-- This uses a CTE to identify which rows to keep (the most recent one per user_id)
WITH ranked_businesses AS (
    SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, updated_at DESC) as rn
    FROM businesses
)
DELETE FROM businesses
WHERE id IN (
    SELECT id 
    FROM ranked_businesses 
    WHERE rn > 1
);

-- Step 4: Verify no duplicates remain (should return no rows)
SELECT 
    user_id, 
    COUNT(*) as count
FROM businesses
GROUP BY user_id
HAVING COUNT(*) > 1;
-- This should return no rows if cleanup was successful

-- Step 5: Now add the UNIQUE constraint (it should work now since duplicates are removed)
ALTER TABLE businesses ADD CONSTRAINT businesses_user_id_unique UNIQUE (user_id);

