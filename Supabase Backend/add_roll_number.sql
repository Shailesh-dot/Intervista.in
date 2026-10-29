-- Migration: Add roll_number column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS roll_number TEXT DEFAULT '';
