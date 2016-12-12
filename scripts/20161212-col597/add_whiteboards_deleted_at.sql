-- The deleted_at timestamp, defaulting to null, works with Sequelize paranoid mode to keep deleted rows
-- around for recovery instead of removing them from the table entirely.

ALTER TABLE whiteboards ADD deleted_at TIMESTAMP WITH TIME ZONE;
