# geofill: 

A CLI tool to enrich CSV datasets with geographic coordinates and export GeoJSON. 
geofill is a geospatial enrichment CLI tool that reads CSV
files containing location-related information, resolves missing
geographic coordinates using geocoding providers such as OpenStreetMap (Nominatim) and Google Maps fallback providers, and exports enriched datasets as GeoJSON.
## Installation

- Create and activate a virtualenv, then install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install
```

## Usage


- Available commands:

```shell
Usage: geofill.py [OPTIONS] COMMAND [ARGS]...

  geofill - Enrich CSV datasets with geographic coordinates and export
  GeoJSON.

Options:
  --help  Show this message and exit.

Commands:
  enrich     Enrich a CSV file with geo-coordinates from Google Maps.
  providers  Show available geocoding providers.
```

- Enrich command:

```shell
Usage: geofill.py enrich [OPTIONS]

  Enrich a CSV file with geo-coordinates from Google Maps.

  Each row in the CSV is geocoded using the values from the specified columns
  to construct a search query. Results are written as a GeoJSON
  FeatureCollection.

  Examples:

      python geofill.py enrich -i schools.csv -c School,City,Region -o
      results.geojson

      python geofill.py enrich -i places.csv -c Name,Address -o places.geojson
      --headless --delay 3

Options:
  -i, --input-file PATH       Input CSV file containing location data.
                              [required]
  -c, --columns TEXT          Comma-separated column names used to build
                              search queries (e.g. School,City,Region).
                              [required]
  -o, --output-file PATH      Output GeoJSON file to save enriched results.
                              [required]
  --headless / --no-headless  Run browser in headless mode (no GUI).
                              [default: no-headless]
  -n, --limit INTEGER         Maximum number of rows to process.
  --delay FLOAT               Base delay in seconds between browser
                              interactions.  [default: 5.0]
  --log-file PATH             Log warnings and errors to the given file.
  -v, --verbose               Enable verbose debug logging.
  --help                      Show this message and exit.

````

## Examples

- Add geo coordinates to an existing CSV file and save it as geo json file.

```shell
python3 geofill.py enrich -i ../dataset/SpecialEducationSchoolsInSaudi.csv -c School,City,Region -o special-education-schools-saudi.geojson  --log-file error.log --delay 3 -n 10
```

## Notes

- If Google places reCAPTCHA, solve it manually on the first run.
- If Google blocks automation, run with `--no-headless` and consider adding slower interactions.
- Google may change its DOM frequently; selectors may need adjustment.
