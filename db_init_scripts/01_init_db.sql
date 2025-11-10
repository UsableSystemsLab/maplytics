-- this extension is required for generating UUIDs. It is better than using SERIAL. Because it is globally unique and harder to guess.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
CREATE EXTENSION IF NOT EXISTS postgis;



----------------------------------------------------------
-- ENUMS
----------------------------------------------------------
CREATE TYPE role_type AS ENUM ('user', 'admin');



----------------------------------------------------------
-- USER TABLE
-- Stores information about each user.
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."User" (
    "user_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Globally unique identifier for each user
    "email" VARCHAR(255) UNIQUE NOT NULL,             -- Used for login and communication (must be unique)
    "first_name" VARCHAR(100),                        -- First name
    "middle_name" VARCHAR(100),                       -- Middle name
    "last_name" VARCHAR(100),                         -- Last name
    "role" role_type DEFAULT 'user'                   -- Roles in case we will be using role-based access control
);



----------------------------------------------------------
-- PROJECT TABLE
-- Represents a workspace context for the user.
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."project" (
    "project_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique ID for each project
    "project_name" VARCHAR(255) NOT NULL,             -- Descriptive title of the project
    "description" TEXT,                               -- Detailed description of the project
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the project was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    "is_deleted" BOOLEAN DEFAULT FALSE,               -- Soft delete flag
    "user_id" UUID NOT NULL,                           -- References the project owner
    FOREIGN KEY ("user_id") REFERENCES public."user"("user_id") ON DELETE CASCADE
);


----------------------------------------------------------
-- DATASET TABLE
-- Stores information about user-uploaded or system datasets.
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."dataset" (
    "dataset_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique dataset identifier
    "dataset_slug" VARCHAR(255) UNIQUE NOT NULL,      -- URL-friendly name (used in APIs or links)
    "dataset_name" VARCHAR(255) NOT NULL,             -- Human-readable dataset title
    "description" TEXT,                               -- Describes dataset content and purpose
    "data_source" VARCHAR(255),                       -- Source of the data (e.g., OSM, Census, custom upload)
    "entity_type" VARCHAR(100),                       -- Category of entity (e.g., 'restaurant', 'school')
    "geometry_type" VARCHAR(50),                      -- Geometric shape stored (POINT, POLYGON, etc.)
    "spatial_coverage" TEXT,                          -- Describes the geographic area (e.g., "Jeddah, Saudi Arabia")
    "bounding_box" GEOMETRY(POLYGON, 4326),           -- Spatial extent of dataset (quick map preview)
    "feature_count" INT DEFAULT 0,                    -- Number of features contained in dataset
    "last_updated" TIMESTAMP DEFAULT NOW(),           -- Date when dataset was last modified
    "file_format" VARCHAR(50),                        -- Format of uploaded file (CSV, GeoJSON, Shapefile, etc.)
    "uploaded_at" TIMESTAMP DEFAULT NOW(),            -- Upload timestamp for version tracking
    "user_id" UUID NOT NULL,                           -- Reference to dataset owner
    FOREIGN KEY ("user_id") REFERENCES public."user"("user_id") ON DELETE CASCADE
);



----------------------------------------------------------
-- FEATURE TABLE
-- Stores individual spatial features (points, polygons, lines).
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."feature" (
    "feature_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique ID for each feature
    "geometry" GEOMETRY(GEOMETRY, 4326) NOT NULL,     -- The actual spatial geometry of the feature
    "dataset_id" UUID NOT NULL,                        -- Reference to parent dataset
    FOREIGN KEY ("dataset_id") REFERENCES public."dataset"("dataset_id") ON DELETE CASCADE
);



----------------------------------------------------------
-- DATASET_PROJECT TABLE
-- Represents the many-to-many relationship between datasets and projects.
-- Allows datasets to be linked to multiple projects and vice versa.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."dataset_project" (
    "dataset_id" UUID NOT NULL,                        -- Dataset being linked
    "project_id" UUID NOT NULL,                        -- Project it belongs to
    PRIMARY KEY ("dataset_id", "project_id"),           -- Composite key ensures unique links
    FOREIGN KEY ("dataset_id") REFERENCES public."dataset"("dataset_id") ON DELETE CASCADE,
    FOREIGN KEY ("project_id") REFERENCES public."project"("project_id") ON DELETE CASCADE
);


----------------------------------------------------------
-- FEATURE_PROPERTY TABLE
-- Stores properties (attributes) of features in JSONB format.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."feature_property" (
    "feature_id" UUID NOT NULL,                        -- Link to the feature this property belongs to
    "properties" JSONB NOT NULL,                      -- Key-value pairs (e.g., name, type, rating)
    FOREIGN KEY ("feature_id") REFERENCES public."feature"("feature_id") ON DELETE CASCADE
);



----------------------------------------------------------
-- DATASET_METADATA TABLE
-- Stores dataset-level metadata in flexible JSONB format.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."dataset_metadata" (
    "dataset_id" UUID NOT NULL,           -- Reference to the dataset
    "metadata" JSONB NOT NULL,                        -- Flexible key-value metadata (e.g., source, license)
    FOREIGN KEY ("dataset_id") REFERENCES public."dataset"("dataset_id") ON DELETE CASCADE
);