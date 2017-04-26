-- Add new enum values for `type` column in `activities` table

ALTER TYPE enum_activities_type ADD VALUE 'get_view_asset';
ALTER TYPE enum_activities_type ADD VALUE 'get_whiteboard_add_asset';
ALTER TYPE enum_activities_type ADD VALUE 'remix_whiteboard';
ALTER TYPE enum_activities_type ADD VALUE 'get_remix_whiteboard';

-- Add new enum values for `type` column in `activity_types` table

ALTER TYPE enum_activity_types_type ADD VALUE 'get_view_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'get_whiteboard_add_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'remix_whiteboard';
ALTER TYPE enum_activity_types_type ADD VALUE 'get_remix_whiteboard';
