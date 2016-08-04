-- Add list column to assets table

ALTER TABLE assets ADD visible BOOLEAN NOT NULL DEFAULT true;
