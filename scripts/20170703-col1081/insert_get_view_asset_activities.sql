INSERT INTO activities (
  type,
  object_id,
  object_type,
  metadata,
  created_at,
  updated_at,
  asset_id,
  course_id,
  user_id,
  actor_id,
  reciprocal_id
)
SELECT
  'get_view_asset',
  act.object_id,
  act.object_type,
  act.metadata,
  act.created_at,
  act.updated_at,
  act.asset_id,
  act.course_id,
  asset_users.user_id,
  act.user_id,
  act.id
FROM activities act
JOIN asset_users ON act.asset_id = asset_users.asset_id
WHERE act.type = 'view_asset'
AND act.id NOT IN (
  SELECT reciprocal_id
  FROM activities
  WHERE type = 'get_view_asset'
  AND reciprocal_id IS NOT NULL
);
