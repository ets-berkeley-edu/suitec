-- Add a per-course column containing the URL for the engagement index tool. Like the existing
-- assetlibrary_url and whiteboards_url columns, this column defaults to null and is populated with
-- the correct URL the first time the tool is launched.

ALTER TABLE courses ADD engagementindex_url varchar(255);
