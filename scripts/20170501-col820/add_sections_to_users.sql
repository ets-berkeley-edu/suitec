-- A user can be enrolled in one or more sections

ALTER TABLE users ADD canvas_course_sections varchar(255)[];

/**** ROLLBACK ****

ALTER TABLE users DROP canvas_course_sections;
