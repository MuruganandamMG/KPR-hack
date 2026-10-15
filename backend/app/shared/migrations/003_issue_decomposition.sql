ALTER TABLE complaints ADD COLUMN parent_tracking_id TEXT REFERENCES complaints(tracking_id);
ALTER TABLE complaints ADD COLUMN issue_json TEXT CHECK(issue_json IS NULL OR json_valid(issue_json));
CREATE INDEX complaint_parent_idx ON complaints(parent_tracking_id);
CREATE TRIGGER preserve_issue_link BEFORE UPDATE OF parent_tracking_id, issue_json ON complaints
BEGIN SELECT RAISE(ABORT, 'Issue linkage and evidence are immutable'); END;
CREATE TRIGGER validate_issue_parent BEFORE INSERT ON complaints
WHEN NEW.parent_tracking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM complaints WHERE tracking_id=NEW.parent_tracking_id AND parent_tracking_id IS NULL
)
BEGIN SELECT RAISE(ABORT, 'Child tickets require a root parent complaint'); END;
