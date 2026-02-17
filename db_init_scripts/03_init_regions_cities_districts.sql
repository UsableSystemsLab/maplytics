-- Data Source
-- https://github.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts

-- Regions Table
CREATE TABLE regions (
  region_id SERIAL PRIMARY KEY,
  capital_city_id INTEGER NOT NULL,
  code VARCHAR(2) NOT NULL DEFAULT '',
  name_ar VARCHAR(64) NOT NULL DEFAULT '',
  name_en VARCHAR(64) NOT NULL DEFAULT '',
  population INTEGER
);


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