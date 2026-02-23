-- Data Source
-- https://github.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts

-- Regions Table
CREATE TABLE regions (
    region_id integer PRIMARY KEY,
    capital_city_id integer NOT NULL,
    code varchar(2) NOT NULL DEFAULT '',
    name_ar varchar(64) NOT NULL DEFAULT '',
    name_en varchar(64) NOT NULL DEFAULT '',
    center geometry(Point, 4326) NOT NULL,
    boundaries geometry(Polygon, 4326) NOT NULL,
    population integer
);
CREATE INDEX regions_center_idx ON regions USING GIST (center);
CREATE INDEX regions_boundaries_idx ON regions USING GIST (boundaries);


-- Cities Table
CREATE TABLE cities (
  city_id INTEGER PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(region_id),
  name_ar VARCHAR(64) NOT NULL DEFAULT '',
  name_en VARCHAR(64) NOT NULL DEFAULT '',
  center geometry(Point, 4326) NOT NULL
);

CREATE INDEX cities_center_gix
  ON cities USING GIST (center);


-- Districts Table
CREATE TABLE districts (
    boundaries geometry(Polygon, 4326),
    city_id integer,
    district_id bigint,
    name_ar text,
    name_en text,
    region_id integer
);

CREATE INDEX districts_boundaries_idx ON districts USING GIST (boundaries);