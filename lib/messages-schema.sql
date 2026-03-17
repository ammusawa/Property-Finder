-- Messages Table for Property Communication
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversationId VARCHAR(36) NOT NULL,
  senderId VARCHAR(36) NOT NULL,
  receiverId VARCHAR(36) NOT NULL,
  propertyId VARCHAR(36) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
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

-- Conversations Table (optional - for grouping messages)
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

