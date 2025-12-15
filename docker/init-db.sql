-- KPD Database Initialization
-- This script runs on first database creation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema for application
CREATE SCHEMA IF NOT EXISTS kpd;

-- Grant permissions
GRANT ALL ON SCHEMA kpd TO kpd;
GRANT ALL ON ALL TABLES IN SCHEMA kpd TO kpd;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kpd TO kpd;

-- Set default schema
ALTER DATABASE kpd SET search_path TO kpd, public;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'KPD database initialized successfully at %', NOW();
END $$;
