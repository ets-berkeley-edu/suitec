-- Roles are recorded using full URN as seen in https://www.imsglobal.org/specs/ltiv1p0/implementation-guide.

update users set canvas_course_role='urn:lti:role:ims/lis/Instructor' where canvas_course_role='Instructor';
update users set canvas_course_role='urn:lti:role:ims/lis/ContentDeveloper' where canvas_course_role='ContentDeveloper';
