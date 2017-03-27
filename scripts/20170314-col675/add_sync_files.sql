-- Add a 'file_sync_enabled' key, with initial value of true, to submission activity metadata. Because built-in JSON support
-- is still skeletal in Postgres 9.4, we just append as a string.

UPDATE activities
SET metadata = (SELECT (trim(trailing '}' from metadata::text) || ',"file_sync_enabled":true}')::json)
WHERE type = 'submit_assignment';

/**** ROLLBACK ****

UPDATE activities
SET metadata = (SELECT (trim(trailing ',"file_sync_enabled":true}' from metadata::text) || '}')::json)
WHERE type = 'submit_assignment';
