-- Add a visible setting to the category table that defines whether assets associated to this category
-- should be displaying in the Asset Library

ALTER TABLE categories ADD visible BOOLEAN NOT NULL DEFAULT true;
