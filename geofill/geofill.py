import asyncio
import csv
import json
import logging
from pathlib import Path

import click
from tqdm.asyncio import tqdm
from logger import setup_logging, CustomFormatter
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
    '--delay',
    type=float,
    default=5.0,
    show_default=True,
    help='Base delay in seconds between browser interactions.'
)
@click.option(
    '--log-file',
    type=click.Path(path_type=Path),
    default=None,
    help='Log warnings and errors to the given file.'
)
@click.option(
    '-v', '--verbose',
    is_flag=True,
    help='Enable verbose debug logging.'
)
def enrich(input_file, columns, output_file, headless, limit, delay, log_file, verbose):
    """Enrich a CSV file with geo-coordinates from Google Maps.

    Each row in the CSV is geocoded using the values from the specified columns
    to construct a search query. Results are written as a GeoJSON FeatureCollection.

    Examples:

        python geofill.py enrich -i schools.csv -c School,City,Region -o results.geojson

        python geofill.py enrich -i places.csv -c Name,Address -o places.geojson --headless --delay 3
    """
    # Confirm overwrite for any files that already exist
    files_to_check = [(output_file, 'Output file'), (log_file, 'Log file')]
    for path, label in files_to_check:
        if path and Path(path).exists():
            click.confirm(f"{label} '{path}' already exists. Overwrite?", abort=True)

    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    else:
        logging.getLogger().setLevel(logging.INFO)

    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file, encoding='utf-8')
        fh.setLevel(logging.WARNING)
        fh.setFormatter(CustomFormatter())
        logging.getLogger().addHandler(fh)

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

    output_file.parent.mkdir(parents=True, exist_ok=True)
    success, failed = asyncio.run(_write_geojson(rows, col_list, headless, delay, output_file))

    total = len(rows)
    logging.info(f"Done — {total} processed, {success} geocoded, {failed} failed/skipped")
    click.echo(f"\n  Total rows processed : {total}")
    click.echo(f"  Successfully geocoded: {success}")
    click.echo(f"  Failed / skipped     : {failed}")
    click.echo(f"\n✓ Results saved to: {output_file}")


@cli.command()
def providers():
    """Show available geocoding providers."""
    click.echo("Available geocoding providers:\n")
    click.echo("  google_maps   Google Maps via browser automation (default)")
    click.echo("  nominatim     OpenStreetMap Nominatim (to be implemented)")


async def _write_geojson(
    rows: list[dict], columns: list[str], headless: bool, delay: float, output_file: Path
) -> tuple[int, int]:
    """Write GeoJSON incrementally, flushing each feature to disk as it resolves."""
    success = 0
    failed = 0
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('{\n  "type": "FeatureCollection",\n  "features": [\n')
        first = True
        async for feature, geocoded in _enrich_rows(rows, columns, headless, delay):
            if not first:
                f.write(',\n')
            f.write('    ' + json.dumps(feature, ensure_ascii=False))
            f.flush()
            first = False
            if geocoded:
                success += 1
            else:
                failed += 1
        f.write('\n  ]\n}\n')
    return success, failed


async def _enrich_rows(rows: list[dict], columns: list[str], headless: bool, delay: float):
    """Async generator: geocode each CSV row and yield (GeoJSON Feature, geocoded bool)."""
    with tqdm(total=len(rows), unit='row', desc='Enriching') as bar:
        for idx, row in enumerate(rows, 1):
            parts = [str(row.get(col, '')).strip() for col in columns if str(row.get(col, '')).strip()]
            query = ', '.join(parts)

            if not query:
                logging.warning(f"Row {idx}: could not build a query from columns {columns} — skipping")
                yield _make_feature(None, None, None, row), False
                bar.update(1)
                continue

            bar.set_postfix_str(query[:60])
            logging.info(f"[{idx}/{len(rows)}] Searching: {query}")
            try:
                results = await search_places(query, max_results=1, headless=headless, delay=delay)
                if results and results[0].get('lat') and results[0].get('lng'):
                    r = results[0]
                    yield _make_feature(r['lat'], r['lng'], r, row), True
                    logging.info(f"  → {r.get('name')} ({r['lat']}, {r['lng']})")
                else:
                    logging.warning(f"Row {idx}: no coordinates found for query: {query}")
                    yield _make_feature(None, None, None, row), False
            except Exception as e:
                logging.error(f"Row {idx} '{query}' failed: {e}")
                yield _make_feature(None, None, None, row), False
            bar.update(1)


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
