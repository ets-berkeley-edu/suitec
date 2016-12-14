-- Default created_at and updated_at for Canvas table to current time at creation.

ALTER TABLE canvas ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE canvas ALTER COLUMN updated_at SET DEFAULT now();

-- Update updated_at for Canvas table to current time on update.

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;	
END;
$$ language 'plpgsql';

CREATE TRIGGER update_canvas_updated_at BEFORE UPDATE ON canvas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

/**** ROLLBACK ****

DROP TRIGGER update_canvas_updated_at ON canvas;
DROP FUNCTION update_updated_at_column();

ALTER TABLE canvas ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE canvas ALTER COLUMN updated_at DROP DEFAULT;
