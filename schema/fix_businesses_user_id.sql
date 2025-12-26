-- Fix: Add UNIQUE constraint on user_id for businesses table
-- This allows the backend to use onConflict: 'user_id' in upsert operations
-- Run this migration if you're getting 500 errors when saving business data

-- Check if constraint already exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'businesses_user_id_unique'
    ) THEN
        -- Add UNIQUE constraint on user_id
        ALTER TABLE businesses ADD CONSTRAINT businesses_user_id_unique UNIQUE (user_id);
        RAISE NOTICE 'Added UNIQUE constraint on businesses.user_id';
    ELSE
        RAISE NOTICE 'UNIQUE constraint on businesses.user_id already exists';
    END IF;
END $$;


