ALTER TABLE complaints ADD COLUMN assigned_secondary_departments_json TEXT NOT NULL DEFAULT '[]'
    CHECK(json_valid(assigned_secondary_departments_json) AND json_type(assigned_secondary_departments_json) = 'array');
ALTER TABLE complaint_events ADD COLUMN secondary_departments_json TEXT NOT NULL DEFAULT '[]'
    CHECK(json_valid(secondary_departments_json) AND json_type(secondary_departments_json) = 'array');
