-- Add a visible setting to the category table that defines whether assets associated to this category
-- should be displaying in the Asset Library

ALTER TABLE categories ADD visible BOOLEAN NOT NULL DEFAULT true;

-- Categories derived from Canvas assignments should be invisible by default.

UPDATE categories SET visible = false WHERE canvas_assignment_id IS NOT NULL;
