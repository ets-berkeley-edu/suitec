-- Add new enum values for `type` column in `activities` table

ALTER TYPE enum_activities_type ADD VALUE 'view_asset';
ALTER TYPE enum_activities_type ADD VALUE 'whiteboard_add_asset';
ALTER TYPE enum_activities_type ADD VALUE 'whiteboard_chat';

-- Add new enum values for `type` column in `activity_types` table

ALTER TYPE enum_activity_types_type ADD VALUE 'view_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'whiteboard_add_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'whiteboard_chat';

-- Add new enum values for `object_type` column in `activities` table

ALTER TYPE enum_activities_object_type ADD VALUE 'chat';
ALTER TYPE enum_activities_object_type ADD VALUE 'whiteboard';
