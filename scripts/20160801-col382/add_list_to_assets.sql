-- Add list column to assets table

ALTER TABLE assets ADD list BOOLEAN NOT NULL DEFAULT true;
