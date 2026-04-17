CREATE TABLE test_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(POINT, 4326)
);

INSERT INTO test_data (name, geom) VALUES ('Test Point', ST_GeomFromText('POINT(39.1 21.5)', 4326));
