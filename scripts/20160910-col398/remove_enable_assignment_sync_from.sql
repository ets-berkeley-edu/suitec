-- Remove the per-course assignment sync setting

ALTER TABLE courses DROP enable_assignment_sync_from;

/**** ROLLBACK ****

-- This will recreate the dropped setting with default NULL (i.e. not synced.) Syncing must be enabled manually
-- for any courses that need it.

ALTER TABLE courses ADD enable_assignment_sync_from TIMESTAMP WITH TIME ZONE;
