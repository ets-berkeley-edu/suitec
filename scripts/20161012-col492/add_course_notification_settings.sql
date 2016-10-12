-- Add per-course columns specifying whether daily and weekly email notifications are enabled.

ALTER TABLE courses ADD enable_daily_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE courses ADD enable_weekly_notifications boolean NOT NULL DEFAULT true;
