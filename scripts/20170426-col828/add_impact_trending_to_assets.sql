-- Add per-asset columns containing 'impact' and 'trending' scores and percentiles. These values
-- are periodically recalculated and used interally for query selection and ordering, but do not 
-- surface through the API.

ALTER TABLE assets ADD impact_percentile integer NOT NULL DEFAULT 0;
ALTER TABLE assets ADD impact_score integer NOT NULL DEFAULT 0;
ALTER TABLE assets ADD trending_percentile integer NOT NULL DEFAULT 0;
ALTER TABLE assets ADD trending_score integer NOT NULL DEFAULT 0;

/**** ROLLBACK ****

ALTER TABLE assets DROP impact_percentile;
ALTER TABLE assets DROP impact_score;
ALTER TABLE assets DROP trending_percentile;
ALTER TABLE assets DROP trending_score;
