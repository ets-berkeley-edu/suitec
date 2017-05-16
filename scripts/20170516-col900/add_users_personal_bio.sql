-- Users can view/edit personal_bio on Impact Studio profile page

ALTER TABLE users ADD personal_bio varchar(255);

/**** ROLLBACK ****

ALTER TABLE users DROP personal_bio;
