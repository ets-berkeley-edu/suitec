-- Remove the per-course assignment synching setting

ALTER TABLE courses DROP enable_assignment_sync_from;
