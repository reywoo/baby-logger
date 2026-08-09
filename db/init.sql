-- Family Assistant Database Schema
-- Auto-executed on PostgreSQL container startup via /docker-entrypoint-initdb.d/init.sql

CREATE TABLE IF NOT EXISTS action_logs (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(50) NOT NULL DEFAULT 'other',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount VARCHAR(100),
    duration VARCHAR(50),
    summary_en TEXT,
    original_zh TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS action_attachments (
    id SERIAL PRIMARY KEY,
    action_id VARCHAR(64) NOT NULL REFERENCES action_logs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    caption TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_action_logs_start_time ON action_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_category ON action_logs(category, sub_category);
CREATE INDEX IF NOT EXISTS idx_action_attachments_action_id ON action_attachments(action_id);

-- Function and trigger to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_action_logs_modtime ON action_logs;
CREATE TRIGGER update_action_logs_modtime
BEFORE UPDATE ON action_logs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TABLE IF NOT EXISTS feeding_timers (
    id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opened_formula_bottles (
    id VARCHAR(64) PRIMARY KEY,
    bottle_type VARCHAR(20) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

