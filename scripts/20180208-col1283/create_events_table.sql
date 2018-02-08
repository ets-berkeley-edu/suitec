-- What was sent to MixPanel will now be written to 'events' table

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  uuid uuid NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_metadata jsonb NOT NULL,
  canvas_domain VARCHAR(255) NOT NULL,
  user_id INTEGER,
  canvas_user_id INTEGER,
  canvas_full_name VARCHAR(255),
  canvas_course_role VARCHAR(255),
  course_id INTEGER,
  canvas_course_id INTEGER,
  course_name VARCHAR(255),
  activity_id INTEGER,
  asset_id INTEGER,
  comment_id INTEGER,
  whiteboard_id INTEGER,
  whiteboard_element_uid INTEGER
);

CREATE INDEX events_asset_id_idx ON events (asset_id);
CREATE INDEX events_canvas_course_id_idx ON events (canvas_course_id);
CREATE INDEX events_canvas_user_id_idx ON events (canvas_user_id);
CREATE INDEX events_course_id_idx ON events (course_id);
CREATE INDEX events_user_id_idx ON events (user_id);

-- /**** ROLLBACK ****
-- DROP INDEX events_asset_id_idx;
-- DROP INDEX events_canvas_course_id_idx;
-- DROP INDEX events_canvas_user_id_idx;
-- DROP INDEX events_course_id_idx;
-- DROP INDEX events_user_id_idx;
-- DROP TABLE events;
