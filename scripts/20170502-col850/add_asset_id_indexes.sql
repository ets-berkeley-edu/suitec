-- Add indexes at join points between `assets` and other tables.

CREATE INDEX activities_asset_id_idx ON activities (asset_id);
CREATE INDEX asset_users_asset_id_idx ON asset_users (asset_id);

/**** ROLLBACK ****

DROP INDEX activities_asset_id_idx;
DROP INDEX asset_users_asset_id_idx;
