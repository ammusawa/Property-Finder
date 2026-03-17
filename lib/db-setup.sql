-- Create Database
CREATE DATABASE IF NOT EXISTS property_finder;
USE property_finder;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  image VARCHAR(500),
  emailVerified DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  role ENUM('user', 'admin', 'agent', 'owner', 'moderator') DEFAULT 'user',
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Accounts Table (for OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  userId VARCHAR(36) NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  providerAccountId VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INT,
  token_type VARCHAR(255),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_provider_account (provider, providerAccountId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sessionToken VARCHAR(255) UNIQUE NOT NULL,
  userId VARCHAR(36) NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Tokens Table
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires DATETIME NOT NULL,
  PRIMARY KEY (identifier, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  propertyType ENUM('apartment', 'house', 'land', 'commercial', 'office', 'shop') NOT NULL,
  listingType ENUM('sale', 'rent', 'lease') NOT NULL,
  rentalDuration VARCHAR(50) NULL COMMENT 'Duration for rent/lease properties (e.g., "Monthly", "Yearly", "6 months")',
  state VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(200),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  bedrooms INT DEFAULT 0,
  bathrooms INT DEFAULT 0,
  parking INT DEFAULT 0,
  areaSize DECIMAL(10, 2),
  areaUnit ENUM('sqm', 'sqft', 'plot', 'acre') DEFAULT 'sqm',
  features TEXT,
  images JSON,
  status ENUM('active', 'sold', 'rented', 'inactive') DEFAULT 'active',
  userId VARCHAR(36),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_state_city (state, city),
  INDEX idx_property_type (propertyType),
  INDEX idx_listing_type (listingType),
  INDEX idx_price (price),
  INDEX idx_status (status),
  FULLTEXT idx_search (title, description, area, address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  userId VARCHAR(36) NOT NULL,
  propertyId VARCHAR(36) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_property (userId, propertyId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversations Table (for grouping messages)
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  propertyId VARCHAR(36) NOT NULL,
  buyerId VARCHAR(36) NOT NULL,
  sellerId VARCHAR(36) NOT NULL,
  lastMessageAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_conversation (propertyId, buyerId, sellerId),
  INDEX idx_buyer (buyerId),
  INDEX idx_seller (sellerId),
  INDEX idx_last_message (lastMessageAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages Table for Property Communication
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversationId VARCHAR(36) NOT NULL,
  senderId VARCHAR(36) NOT NULL,
  receiverId VARCHAR(36) NOT NULL,
  propertyId VARCHAR(36) NOT NULL,
  message TEXT NOT NULL,
  `read` BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversationId),
  INDEX idx_sender (senderId),
  INDEX idx_receiver (receiverId),
  INDEX idx_property (propertyId),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default admin user (password: admin123 - change this!)
-- Password hash for 'admin123'
INSERT INTO users (id, name, email, password, role) 
VALUES ('admin-001', 'Admin User', 'admin@propertyfinder.ng', '$2a$10$rOzJ4JKqj8CZKqUqQqQqUuQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'admin')
ON DUPLICATE KEY UPDATE email=email;
