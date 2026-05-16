import asyncio
import csv
import json
import logging
from pathlib import Path

import click
from tqdm.asyncio import tqdm
from logger import setup_logging
from scraper import search_places

# Configure logging with custom formatter
setup_logging()


@click.group()
def cli():
    """geofill - Enrich CSV datasets with geographic coordinates and export GeoJSON."""
    pass


@cli.command()
@click.option(
    '-i', '--input-file',
    type=click.Path(exists=True, path_type=Path),
    required=True,
    help='Input CSV file containing location data.'
)
@click.option(
    '-c', '--columns',
    type=str,
    required=True,
    help='Comma-separated column names used to build search queries (e.g. School,City,Region).'
)
@click.option(
    '-o', '--output-file',
    type=click.Path(path_type=Path),
    required=True,
    help='Output GeoJSON file to save enriched results.'
)
@click.option(
    '--headless/--no-headless',
    default=False,
    show_default=True,
    help='Run browser in headless mode (no GUI).'
)
@click.option(
    '-n', '--limit',
    type=int,
    default=None,
    help='Maximum number of rows to process.'
)
@click.option(
    '-v', '--verbose',
    is_flag=True,
    help='Enable verbose debug logging.'
)
def enrich(input_file, columns, output_file, headless, limit, verbose):
    """Enrich a CSV file with geo-coordinates from Google Maps.

    Each row in the CSV is geocoded using the values from the specified columns
    to construct a search query. Results are written as a GeoJSON FeatureCollection.

    Examples:

        python geofill.py enrich -i schools.csv -c School,City,Region -o results.geojson

        python geofill.py enrich -i places.csv -c Name,Address -o places.geojson --headless
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    else:
        logging.getLogger().setLevel(logging.INFO)

    col_list = [c.strip() for c in columns.split(',')]

    rows = []
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if limit is not None:
        rows = rows[:limit]

    logging.info(f"Loaded {len(rows)} rows from: {input_file}")
    logging.info(f"Using columns for query: {col_list}")

    features = asyncio.run(_enrich_rows(rows, col_list, headless))

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    enriched_count = sum(1 for feat in features if feat['geometry'] is not None)
    logging.info(f"Enriched {enriched_count}/{len(features)} rows with coordinates")
    click.echo(f"\n✓ Saved {len(features)} features ({enriched_count} with coordinates) to: {output_file}")


@cli.command()
def providers():
    """Show available geocoding providers."""
    click.echo("Available geocoding providers:\n")
    click.echo("  google_maps   Google Maps via browser automation (default)")
    click.echo("  nominatim     OpenStreetMap Nominatim (coming soon)")


async def _enrich_rows(rows: list[dict], columns: list[str], headless: bool) -> list[dict]:
    """Geocode each CSV row and return a list of GeoJSON Feature dicts."""
    features = []

    with tqdm(total=len(rows), unit='row', desc='Enriching') as bar:
        for idx, row in enumerate(rows, 1):
            parts = [str(row.get(col, '')).strip() for col in columns if str(row.get(col, '')).strip()]
            query = ', '.join(parts)

            if not query:
                logging.warning(f"Row {idx}: could not build a query from columns {columns} — skipping")
                features.append(_make_feature(None, None, None, row))
                bar.update(1)
                continue

            bar.set_postfix_str(query[:60])
            logging.info(f"[{idx}/{len(rows)}] Searching: {query}")
            try:
                results = await search_places(query, max_results=1, headless=headless)
                if results and results[0].get('lat') and results[0].get('lng'):
                    r = results[0]
                    features.append(_make_feature(r['lat'], r['lng'], r, row))
                    logging.info(f"  → {r.get('name')} ({r['lat']}, {r['lng']})")
                else:
                    logging.warning(f"  → No coordinates found for: {query}")
                    features.append(_make_feature(None, None, None, row))
            except Exception as e:
                logging.error(f"Row {idx} '{query}' failed: {e}")
                features.append(_make_feature(None, None, None, row))
            bar.update(1)

    return features


def _make_feature(lat, lng, result: dict | None, original_row: dict) -> dict:
    """Build a GeoJSON Feature from a geocoding result and the original CSV row."""
    properties = dict(original_row)
    if result:
        properties.update({
            'place_name': result.get('name'),
            'place_url': result.get('url'),
            'place_category': result.get('category'),
            'place_address': result.get('address'),
            'place_rating': result.get('rating'),
            'place_review_count': result.get('review_count'),
        })

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lng, lat],
        } if lat is not None and lng is not None else None,
        "properties": properties,
    }


if __name__ == "__main__":
    cli()
