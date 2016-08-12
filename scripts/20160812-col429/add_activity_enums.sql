-- Add new activity enums

ALTER TYPE enum_activities_type ADD VALUE 'view_asset';
ALTER TYPE enum_activities_type ADD VALUE 'whiteboard_add_asset';
ALTER TYPE enum_activities_type ADD VALUE 'whiteboard_chat';

-- Add new activity type enums

ALTER TYPE enum_activity_types_type ADD VALUE 'view_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'whiteboard_add_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'whiteboard_chat';

-- Add new activity object enums

ALTER TYPE enum_activities_object_type ADD VALUE 'chat';
ALTER TYPE enum_activities_object_type ADD VALUE 'whiteboard';
