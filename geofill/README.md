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

```shell
python3 geofill.py enrich --help
Usage: geofill.py enrich [OPTIONS]

  Enrich a CSV file with geo-coordinates from Google Maps.

  Each row in the CSV is geocoded using the values from the specified columns
  to construct a search query. Results are written as a GeoJSON
  FeatureCollection.

  Examples:

      python geofill.py enrich -i schools.csv -c School,City,Region -o
      results.geojson

      python geofill.py enrich -i places.csv -c Name,Address -o places.geojson
      --headless

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
  -v, --verbose               Enable verbose debug logging.
  --help                      Show this message and exit.
  ````

Search for a single query and save results:

```bash
python geofill.py enrich --input-file <csv_file> --columns COL1,COL2,... --output-file <geojson_file> 
```

Or using the short form:

```bash
python geofill.py enrich -i <csv_file> -c COL1,COL2,... -o <geojson_file> 
```


## Commands
```
   enrich
           Enrich a CSV file with geo-coordinates
   providers
          Show available geocoding providers
```

### Options

- `-i, --input-file`: The CSV input file
- `-o, --output-file`: Output GeoJSON file to save results. One result per row (required)
- `-c, --columns`: Columns used to construct location search queries
- `--headless/--no-headless`: Run browser in headless mode (default: is head mode (--no-headless))
- `-v, --verbose`: Enable verbose debug logging

### Examples

```bash
# Enrich a csv file with geo coordiantes
python geofill.py enrich ../dataset/SpecialEducationSchoolsInSaudi.csv --columns School,Region,City --providers <provider_name>
```

### Output Format

Results are saved as a GeoJSON file:

```
```

## Notes

- If Google places reCAPTCHA, solve it manually on the first run.
- If Google blocks automation, run with `--no-headless` and consider adding slower interactions.
- Google may change its DOM frequently; selectors may need adjustment.
