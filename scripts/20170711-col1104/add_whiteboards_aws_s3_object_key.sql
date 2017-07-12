-- We are deprecating whiteboards.image_url; use this new column instead

ALTER TABLE whiteboards ADD aws_s3_object_key varchar(255);

/**** ROLLBACK ****

ALTER TABLE whiteboards DROP aws_s3_object_key;
