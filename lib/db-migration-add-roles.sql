-- Migration script to add new roles (agent, owner, moderator) to existing database
-- Run this if you already have a database with the old role structure

USE property_finder;

-- Alter the users table to include new roles
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'agent', 'owner', 'moderator') DEFAULT 'user';

-- Add index on role for better query performance
ALTER TABLE users ADD INDEX idx_role (role);

-- Note: Existing users with 'user' or 'admin' roles will remain unchanged
-- You can manually update users to new roles using:
-- UPDATE users SET role = 'agent' WHERE email = 'user@example.com';
-- UPDATE users SET role = 'owner' WHERE email = 'owner@example.com';
-- UPDATE users SET role = 'moderator' WHERE email = 'moderator@example.com';

