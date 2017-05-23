-- Linking table records assets pinned by users

CREATE TABLE pinned_user_assets (
  asset_id integer NOT NULL REFERENCES assets (id),
  user_id integer NOT NULL REFERENCES users (id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE ONLY pinned_user_assets ADD CONSTRAINT pinned_user_assets_pkey PRIMARY KEY (asset_id, user_id);

CREATE UNIQUE INDEX pinned_user_assets_idx ON pinned_user_assets (asset_id, user_id);

/**** ROLLBACK ****

DROP INDEX pinned_user_assets_idx;

DROP TABLE pinned_user_assets;
