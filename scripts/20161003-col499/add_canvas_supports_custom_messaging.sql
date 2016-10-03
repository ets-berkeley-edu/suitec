-- Add a per-Canvas column specifying whether the Canvas instance supports our custom cross-window messaging.

ALTER TABLE canvas ADD supports_custom_messaging boolean NOT NULL DEFAULT false;
