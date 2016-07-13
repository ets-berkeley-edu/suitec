-- Add element_asset_id column to asset_whiteboard_elements table, referencing id column in assets table.
-- Null values are permitted.

ALTER TABLE asset_whiteboard_elements
    ADD element_asset_id integer;

ALTER TABLE asset_whiteboard_elements
    ADD CONSTRAINT asset_whiteboard_elements_element_asset_id_fkey FOREIGN KEY (element_asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;
