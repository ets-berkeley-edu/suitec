-- Add column to store of SuiteC Dashboard URL per course. Dashboard is a new SuiteC LTI tool.

ALTER TABLE courses ADD dashboard_url character varying(255);
