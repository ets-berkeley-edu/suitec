-- Add a per-course column to configure Canvas assignment syncing. We use a timestamp rather than a boolean to avoid 
-- retroactively syncing older assignment submissions. Defaults to null (i.e. syncing disabled).

ALTER TABLE courses ADD enable_assignment_sync_from TIMESTAMP WITH TIME ZONE;
