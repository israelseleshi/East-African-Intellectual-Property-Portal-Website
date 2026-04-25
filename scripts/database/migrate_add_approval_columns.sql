-- Migration: Add is_approved and rejection_count columns to users table
-- Run this on your MySQL server

ALTER TABLE users 
ADD COLUMN is_approved BOOLEAN DEFAULT 0 AFTER is_verified,
ADD COLUMN rejection_count INT DEFAULT 0 AFTER is_approved;

-- Update existing SUPER_ADMINs to be auto-approved
UPDATE users SET is_approved = 1 WHERE role = 'SUPER_ADMIN';

-- Verify the changes
DESCRIBE users;