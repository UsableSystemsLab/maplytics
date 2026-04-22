-- this extension is required for generating UUIDs. It is better than using SERIAL. Because it is globally unique and harder to guess.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
CREATE EXTENSION IF NOT EXISTS postgis;



----------------------------------------------------------
-- ENUMS
----------------------------------------------------------
CREATE TYPE role_type AS ENUM ('User', 'Admin');



----------------------------------------------------------
-- USER TABLE
-- Stores information about each user.
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."User" (
    "user_id" VARCHAR(128) PRIMARY KEY,             -- Globally unique identifier from Firebase
    "email" VARCHAR(255) UNIQUE NOT NULL,             -- Used for login and communication (must be unique)
    "first_name" VARCHAR(100),                        -- First name
    "last_name" VARCHAR(100),                         -- Last name
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the user was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    "role" role_type DEFAULT 'User'                   -- Roles in case we will be using role-based access control
);



----------------------------------------------------------
-- PROJECT TABLE
-- Represents a workspace context for the user.
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Project" (
    "project_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique ID for each project
    "project_name" VARCHAR(255) NOT NULL,             -- Descriptive title of the project
    "description" TEXT,                               -- Detailed description of the project
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the project was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    "is_deleted" BOOLEAN DEFAULT FALSE,               -- Soft delete flag
    "user_id" VARCHAR(128) NOT NULL,                           -- References the project owner
    FOREIGN KEY ("user_id") REFERENCES public."User"("user_id") ON DELETE CASCADE
);


----------------------------------------------------------
-- DATASET TABLE
-- Stores information about user-uploaded or system datasets.
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Dataset" (
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
    "author" VARCHAR(255),                          -- Name of the user who uploaded the dataset
    "user_id" VARCHAR(128) NOT NULL,                           -- Reference to dataset owner
    "is_public" BOOLEAN DEFAULT TRUE                 -- Whether the dataset is publicly available
);



----------------------------------------------------------
-- FEATURE TABLE
-- Stores individual spatial features (points, polygons, lines).
-- These attributes are for starter, more can be added as needed.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Feature" (
    "feature_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique ID for each feature
    "geometry" GEOMETRY(GEOMETRY, 4326) NOT NULL,     -- The actual spatial geometry of the feature
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the feature was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    "dataset_id" UUID NOT NULL,                        -- Reference to parent dataset
    FOREIGN KEY ("dataset_id") REFERENCES public."Dataset"("dataset_id") ON DELETE CASCADE
);



----------------------------------------------------------
-- DATASET_PROJECT TABLE
-- Represents the many-to-many relationship between datasets and projects.
-- Allows datasets to be linked to multiple projects and vice versa.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Dataset_Project" (
    "dataset_id" UUID NOT NULL,                        -- Dataset being linked
    "project_id" UUID NOT NULL,                        -- Project it belongs to
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the link was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    PRIMARY KEY ("dataset_id", "project_id"),           -- Composite key ensures unique links
    FOREIGN KEY ("dataset_id") REFERENCES public."Dataset"("dataset_id") ON DELETE CASCADE,
    FOREIGN KEY ("project_id") REFERENCES public."Project"("project_id") ON DELETE CASCADE
);


----------------------------------------------------------
-- FEATURE_PROPERTY TABLE
-- Stores properties (attributes) of features in JSONB format.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Feature_Property" (
    "feature_id" UUID NOT NULL,                        -- Link to the feature this property belongs to
    "properties" JSONB NOT NULL,                      -- Key-value pairs (e.g., name, type, rating)
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the property was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    PRIMARY KEY ("feature_id"),                        -- One-to-one relationship with Feature
    FOREIGN KEY ("feature_id") REFERENCES public."Feature"("feature_id") ON DELETE CASCADE
);



----------------------------------------------------------
-- DATASET_METADATA TABLE
-- Stores dataset-level metadata in flexible JSONB format.
----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Dataset_Metadata" (
    "dataset_id" UUID NOT NULL,           -- Reference to the dataset
    "metadata" JSONB NOT NULL,                        -- Flexible key-value metadata (e.g., source, license)
    "created_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp when the metadata was created
    "updated_at" TIMESTAMP DEFAULT NOW(),             -- Timestamp for the last modification
    PRIMARY KEY ("dataset_id"),                        -- One-to-one relationship with Dataset
    FOREIGN KEY ("dataset_id") REFERENCES public."Dataset"("dataset_id") ON DELETE CASCADE
);