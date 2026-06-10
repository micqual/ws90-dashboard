-- Add tier column to farmers table
-- Run this in your Railway PostgreSQL console

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS tier text DEFAULT 'base';

-- Set existing farmers to base (already the default, but explicit)
UPDATE farmers SET tier = 'base' WHERE tier IS NULL;

-- To upgrade a farmer to pro:
-- UPDATE farmers SET tier = 'pro' WHERE email = 'farmer@example.com';
