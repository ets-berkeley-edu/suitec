-- The poller does not deactivate deleted course sites.
-- For now, we deactivate them the hard way: 

UPDATE courses
SET
  active = FALSE
WHERE
  canvas_course_id IN (1460736, 1461213, 1461536, 1462149, 1462239, 1462466, 1462469, 1462815)

/**** ROLLBACK ****

UPDATE courses
SET
  active = TRUE
WHERE
  canvas_course_id IN (1460736, 1461213, 1461536, 1462149, 1462239, 1462466, 1462469, 1462815)
