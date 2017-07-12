-- After uploading an asset to AWS S3 we store the new Object Key in the db

ALTER TABLE assets ADD aws_s3_object_key varchar(255);

/**** ROLLBACK ****

ALTER TABLE assets DROP aws_s3_object_key;
