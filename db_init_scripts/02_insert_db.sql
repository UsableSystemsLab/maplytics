-- Populate the database with data


-- =================================================================================================
-- Insert sample users

INSERT INTO public."User" (email, first_name, last_name, role)
VALUES
('ahmed.alharbi@example.com', 'Ahmed', 'Alharbi', 'Admin'),
('fatimah.alshehri@example.com', 'Fatimah', 'Alshehri', 'User'),
('khalid.alqahtani@example.com', 'Khalid', 'Alqahtani', 'User'),
('noura.alzahrani@example.com', 'Noura', 'Alzahrani', 'User'),
('abdullah.almalki@example.com', 'Abdullah', 'Almalki', 'User'),
('sara.alfarhan@example.com', 'Sara', 'Alfarhan', 'User'),
('mohammed.alsaud@example.com', 'Mohammed', 'Alsaud', 'Admin');

-- =================================================================================================


-- =================================================================================================
-- Insert sample projects

INSERT INTO public."Project" (project_name, description, user_id)
VALUES
('Jeddah Road Network Project', 'Digitizing and analyzing Jeddah’s entire road network for better transport planning.',
 (SELECT user_id FROM public."User" WHERE email='ahmed.alharbi@example.com')),
('Green Jeddah', 'Mapping parks and tree density to improve urban greenery.',
 (SELECT user_id FROM public."User" WHERE email='fatimah.alshehri@example.com')),
('Smart Transit Study', 'Studying bus and public transport patterns in Jeddah.',
 (SELECT user_id FROM public."User" WHERE email='khalid.alqahtani@example.com')),
('Education Map', 'Locating schools, universities, and educational facilities.',
 (SELECT user_id FROM public."User" WHERE email='noura.alzahrani@example.com')),
('Healthcare Accessibility', 'Mapping hospitals and clinics to identify underserved areas.',
 (SELECT user_id FROM public."User" WHERE email='abdullah.almalki@example.com')),
('Tourist Hotspots Explorer', 'Creating an interactive map of Jeddah’s tourist destinations.',
 (SELECT user_id FROM public."User" WHERE email='sara.alfarhan@example.com')),
('Flood Vulnerability Analysis', 'Identifying flood-prone regions to enhance disaster preparedness.',
 (SELECT user_id FROM public."User" WHERE email='mohammed.alsaud@example.com'));
-- =================================================================================================


-- =================================================================================================
-- Insert sample datasets

INSERT INTO public."Dataset" (dataset_slug, dataset_name, description, data_source, entity_type, geometry_type, spatial_coverage, bounding_box, feature_count, file_format, user_id)
VALUES
('jeddah_roads', 'Jeddah Roads', 'Road network data for Jeddah city.', 'OpenStreetMap', 'road', 'LINESTRING', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.1 21.3, 39.4 21.3, 39.4 21.7, 39.1 21.7, 39.1 21.3))', 4326), 1200, 'GeoJSON',
 (SELECT user_id FROM public."User" WHERE email='ahmed.alharbi@example.com')),

('jeddah_parks', 'Jeddah Parks', 'Polygon boundaries of Jeddah’s parks.', 'Municipality', 'park', 'POLYGON', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.2 21.4, 39.3 21.4, 39.3 21.6, 39.2 21.6, 39.2 21.4))', 4326), 80, 'GeoJSON',
 (SELECT user_id FROM public."User" WHERE email='fatimah.alshehri@example.com')),

('jeddah_schools', 'Schools in Jeddah', 'Locations of all schools.', 'Education Ministry', 'school', 'POINT', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.15 21.45, 39.35 21.45, 39.35 21.65, 39.15 21.65, 39.15 21.45))', 4326), 210, 'CSV',
 (SELECT user_id FROM public."User" WHERE email='noura.alzahrani@example.com')),

('jeddah_hospitals', 'Hospitals and Clinics', 'Points of healthcare facilities.', 'Health Ministry', 'hospital', 'POINT', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.1 21.4, 39.25 21.4, 39.25 21.55, 39.1 21.55, 39.1 21.4))', 4326), 45, 'CSV',
 (SELECT user_id FROM public."User" WHERE email='abdullah.almalki@example.com')),

('jeddah_hotels', 'Hotels and Resorts', 'List of hotels and resorts across Jeddah.', 'Tourism Authority', 'hotel', 'POINT', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.2 21.3, 39.4 21.3, 39.4 21.6, 39.2 21.6, 39.2 21.3))', 4326), 65, 'GeoJSON',
 (SELECT user_id FROM public."User" WHERE email='sara.alfarhan@example.com')),

('jeddah_flood_zones', 'Flood Risk Zones', 'Map of flood-prone areas in Jeddah.', 'Meteorology Authority', 'flood_zone', 'POLYGON', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.0 21.3, 39.3 21.3, 39.3 21.6, 39.0 21.6, 39.0 21.3))', 4326), 30, 'Shapefile',
 (SELECT user_id FROM public."User" WHERE email='mohammed.alsaud@example.com')),

('jeddah_bus_routes', 'Public Bus Routes', 'Geometries of bus lines.', 'Jeddah Transport Authority', 'bus_route', 'LINESTRING', 'Jeddah, Saudi Arabia',
 ST_GeomFromText('POLYGON((39.1 21.35, 39.3 21.35, 39.3 21.65, 39.1 21.65, 39.1 21.35))', 4326), 90, 'GeoJSON',
 (SELECT user_id FROM public."User" WHERE email='khalid.alqahtani@example.com'));



-- =================================================================================================
-- Insert sample features

INSERT INTO public."Feature" (geometry, dataset_id)
VALUES
(ST_SetSRID(ST_MakePoint(39.197, 21.542), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_schools')),
(ST_SetSRID(ST_MakePoint(39.250, 21.470), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_parks')),
(ST_SetSRID(ST_MakePoint(39.280, 21.460), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_hotels')),
(ST_SetSRID(ST_MakePoint(39.320, 21.620), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_flood_zones')),
(ST_SetSRID(ST_MakePoint(39.220, 21.490), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_roads')),
(ST_SetSRID(ST_MakePoint(39.180, 21.530), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_bus_routes')),
(ST_SetSRID(ST_MakePoint(39.140, 21.500), 4326), (SELECT dataset_id FROM public."Dataset" WHERE dataset_slug='jeddah_hospitals'));
-- =================================================================================================



-- =================================================================================================
-- Insert sample feature properties and dataset-project associations

INSERT INTO public."Feature_Property" (feature_id, properties)
SELECT feature_id, jsonb_build_object(
  'name', 'Feature ' || left(feature_id::text, 6),
  'city', 'Jeddah',
  'status', 'active'
)
FROM public."Feature";
-- =================================================================================================


-- =================================================================================================
-- Insert dataset-project associations and dataset metadata

INSERT INTO public."Dataset_Project" (dataset_id, project_id)
SELECT d.dataset_id, p.project_id
FROM public."Dataset" d
JOIN public."Project" p ON (
  (p.project_name ILIKE '%Road%' AND d.dataset_slug='jeddah_roads') OR
  (p.project_name ILIKE '%Green%' AND d.dataset_slug='jeddah_parks') OR
  (p.project_name ILIKE '%Transit%' AND d.dataset_slug='jeddah_bus_routes') OR
  (p.project_name ILIKE '%Education%' AND d.dataset_slug='jeddah_schools') OR
  (p.project_name ILIKE '%Health%' AND d.dataset_slug='jeddah_hospitals') OR
  (p.project_name ILIKE '%Tourist%' AND d.dataset_slug='jeddah_hotels') OR
  (p.project_name ILIKE '%Flood%' AND d.dataset_slug='jeddah_flood_zones')
);
-- =================================================================================================


-- =================================================================================================
-- Insert sample dataset metadata

INSERT INTO public."Dataset_Metadata" (dataset_id, metadata)
SELECT dataset_id, jsonb_build_object(
  'license', 'Open Data License - Jeddah Municipality',
  'update_frequency', 'Monthly',
  'maintainer', 'Jeddah Municipality',
  'last_verified', to_char(NOW(), 'YYYY-MM-DD')
)
FROM public."Dataset";
-- =================================================================================================