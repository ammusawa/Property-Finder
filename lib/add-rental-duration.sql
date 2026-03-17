-- Add rental/lease duration field to properties table
ALTER TABLE properties 
ADD COLUMN rentalDuration VARCHAR(50) NULL 
COMMENT 'Duration for rent/lease properties (e.g., "Monthly", "Yearly", "6 months", "1 year")' 
AFTER listingType;

