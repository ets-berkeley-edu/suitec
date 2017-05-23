-- Add pinning-related enum values for `type` column in `activities` table

ALTER TYPE enum_activities_type ADD VALUE 'pin_asset';
ALTER TYPE enum_activities_type ADD VALUE 'repin_asset';
ALTER TYPE enum_activities_type ADD VALUE 'get_pin_asset';
ALTER TYPE enum_activities_type ADD VALUE 'get_repin_asset';

-- Add pinning-related enum values for `type` column in `activities` table

ALTER TYPE enum_activity_types_type ADD VALUE 'pin_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'repin_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'get_pin_asset';
ALTER TYPE enum_activity_types_type ADD VALUE 'get_repin_asset';

/**** ROLLBACK ****

Scripting rollback of enum changes is a bit too complex. If something goes wrong
then we'll rely on the power of manual intervention.
