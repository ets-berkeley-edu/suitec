-- Users can toggle looking_for_collaborators on Impact Studio profile page

ALTER TABLE users ADD looking_for_collaborators boolean NOT NULL DEFAULT false;

/**** ROLLBACK ****

ALTER TABLE users DROP looking_for_collaborators;
