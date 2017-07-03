-- Add reciprocal_id column to activities, with a foreign key reference to activity id.

ALTER TABLE activities ADD reciprocal_id integer;
ALTER TABLE activities
  ADD CONSTRAINT activities_reciprocal_id_fkey FOREIGN KEY (reciprocal_id) REFERENCES activities(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Add indexes on creation time and actor.

CREATE INDEX activities_created_at_idx ON activities USING btree (created_at);
CREATE INDEX activities_actor_id_idx ON activities USING btree (actor_id);

-- Find reciprocal like activities and update ids. Correlation is based on course id, user id, asset
-- id and timestamp (`like` is created immediately before `get_like`).

WITH get_like_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MAX(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at <= act.created_at
      AND activities.type = 'like'
    )
    AND EXTRACT(epoch FROM (act.created_at - reciprocal_act.created_at)) < 1
    AND reciprocal_act.asset_id = act.asset_id
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_like'
)
UPDATE activities
SET reciprocal_id = get_like_reciprocal_mapping.reciprocal_id
FROM get_like_reciprocal_mapping
WHERE type = 'get_like'
AND activities.id = get_like_reciprocal_mapping.activity_id;

-- Find reciprocal view activities and update ids. Correlation is based on course id, user id, asset
-- id and timestamp (`view_asset` is created immediately before `get_view_asset`).

WITH get_view_asset_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MAX(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at <= act.created_at
      AND activities.type = 'view_asset'
    )
    AND EXTRACT(epoch FROM (act.created_at - reciprocal_act.created_at)) < 1
    AND reciprocal_act.asset_id = act.asset_id
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_view_asset'
)
UPDATE activities
SET reciprocal_id = get_view_asset_reciprocal_mapping.reciprocal_id
FROM get_view_asset_reciprocal_mapping
WHERE type = 'get_view_asset'
AND activities.id = get_view_asset_reciprocal_mapping.activity_id;

-- Find reciprocal pin activities and update ids. Correlation is based on course id, user id, asset
-- id and timestamp (`pin_asset` is created immediately before `get_pin_asset`).

WITH get_pin_asset_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MAX(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at <= act.created_at
      AND activities.type = 'pin_asset'
    )
    AND EXTRACT(epoch FROM (act.created_at - reciprocal_act.created_at)) < 1
    AND reciprocal_act.asset_id = act.asset_id
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_pin_asset'
)
UPDATE activities
SET reciprocal_id = get_pin_asset_reciprocal_mapping.reciprocal_id
FROM get_pin_asset_reciprocal_mapping
WHERE type = 'get_pin_asset'
AND activities.id = get_pin_asset_reciprocal_mapping.activity_id;

-- Find reciprocal repin activities and update ids. Correlation is based on course id, user id, asset
-- id and timestamp (`repin_asset` is created immediately before `get_repin_asset`).

WITH get_repin_asset_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MAX(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at <= act.created_at
      AND activities.type = 'repin_asset'
    )
    AND EXTRACT(epoch FROM (act.created_at - reciprocal_act.created_at)) < 1
    AND reciprocal_act.asset_id = act.asset_id
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_repin_asset'
)
UPDATE activities
SET reciprocal_id = get_repin_asset_reciprocal_mapping.reciprocal_id
FROM get_repin_asset_reciprocal_mapping
WHERE type = 'get_repin_asset'
AND activities.id = get_repin_asset_reciprocal_mapping.activity_id;

-- Find reciprocal add asset to whiteboard activities and update ids. Correlation is based on course id, user id, asset
-- id and timestamp (`whiteboard_add_asset` is created immediately after `get_whiteboard_add_asset`).

WITH get_whiteboard_add_asset_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MIN(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at >= act.created_at
      AND activities.type = 'whiteboard_add_asset'
    )
    AND EXTRACT(epoch FROM (reciprocal_act.created_at - act.created_at)) < 1
    AND reciprocal_act.asset_id = act.asset_id
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_whiteboard_add_asset'
)
UPDATE activities
SET reciprocal_id = get_whiteboard_add_asset_reciprocal_mapping.reciprocal_id
FROM get_whiteboard_add_asset_reciprocal_mapping
WHERE type = 'get_whiteboard_add_asset'
AND activities.id = get_whiteboard_add_asset_reciprocal_mapping.activity_id;

-- Find reciprocal remix activities and update ids. Correlation is based on course id, user id, asset
-- id and timestamp (`remix_whiteboard` is created immediately before `get_remix_whiteboard`).

WITH get_remix_whiteboard_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MAX(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at <= act.created_at
      AND activities.type = 'remix_whiteboard'
    )
    AND EXTRACT(epoch FROM (act.created_at - reciprocal_act.created_at)) < 1
    AND reciprocal_act.asset_id = act.asset_id
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_remix_whiteboard'
)
UPDATE activities
SET reciprocal_id = get_remix_whiteboard_reciprocal_mapping.reciprocal_id
FROM get_remix_whiteboard_reciprocal_mapping
WHERE type = 'get_remix_whiteboard'
AND activities.id = get_remix_whiteboard_reciprocal_mapping.activity_id;

-- Find reciprocal discussion activities and update ids. Correlation is based on course id, user id and entryId.

WITH get_discussion_entry_reply_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.metadata->>'entryId' = act.metadata->>'entryId'
    AND reciprocal_act.user_id = act.actor_id
    AND reciprocal_act.type = 'discussion_entry'
  WHERE act.type = 'get_discussion_entry_reply'
)
UPDATE activities
SET reciprocal_id = get_discussion_entry_reply_reciprocal_mapping.reciprocal_id
FROM get_discussion_entry_reply_reciprocal_mapping
WHERE type = 'get_discussion_entry_reply'
AND id = get_discussion_entry_reply_reciprocal_mapping.activity_id;

-- Find reciprocal comment activities and update ids. Correlation is based on course id, user id and comment id.

WITH get_asset_comment_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.object_id = act.object_id
    AND reciprocal_act.user_id = act.actor_id
    AND reciprocal_act.type = 'asset_comment'
  WHERE act.type = 'get_asset_comment'
)
UPDATE activities
SET reciprocal_id = get_asset_comment_reciprocal_mapping.reciprocal_id
FROM get_asset_comment_reciprocal_mapping
WHERE type = 'get_asset_comment'
AND id = get_asset_comment_reciprocal_mapping.activity_id;

-- Find reciprocal comment reply activities and update ids. Correlation is based on course id, user id, asset
-- id (if present) and timestamp (`asset_comment` is created immediately before `get_asset_comment_reply`).

WITH get_asset_comment_reply_reciprocal_mapping AS (
  SELECT act.id AS activity_id, reciprocal_act.id AS reciprocal_id
  FROM activities act
  LEFT JOIN activities reciprocal_act ON
    reciprocal_act.course_id = act.course_id
    AND reciprocal_act.created_at = (SELECT MAX(created_at) FROM activities
      WHERE activities.course_id = act.course_id
      AND activities.created_at <= act.created_at
      AND activities.type = 'asset_comment'
    )
    AND EXTRACT(epoch FROM (act.created_at - reciprocal_act.created_at)) < 1
    AND ((act.asset_id IS NULL AND reciprocal_act.asset_id IS NULL)
         OR reciprocal_act.asset_id = act.asset_id)
    AND reciprocal_act.user_id = act.actor_id
  WHERE act.type = 'get_asset_comment_reply'
)
UPDATE activities
SET reciprocal_id = get_asset_comment_reply_reciprocal_mapping.reciprocal_id
FROM get_asset_comment_reply_reciprocal_mapping
WHERE type = 'get_asset_comment_reply'
AND activities.id = get_asset_comment_reply_reciprocal_mapping.activity_id;
