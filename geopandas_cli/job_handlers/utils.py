import os
import json
import boto3
import pandas as pd
import geopandas as gpd
from io import StringIO

S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "http://rustfs:9000")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "rustfsadmin")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "rustfsadmin")
S3_BUCKET = os.environ.get("S3_BUCKET_NAME", "datasets")
API_URL = os.environ.get("API_URL", "http://api_server:4000/api")

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )

def list_s3_datasets():
    """List all dataset files in the S3 bucket (public/ and private/ prefixes)."""
    client = get_s3_client()
    files = []
    for prefix in ["public/", "private/"]:
        try:
            response = client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
            for obj in response.get("Contents", []):
                key = obj["Key"]
                ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
                if ext in ("csv", "json", "geojson"):
                    files.append({"s3Key": key, "fileFormat": ext})
        except Exception:
            continue
    return files

def fetch_dataset_from_s3(s3_key):
    client = get_s3_client()
    response = client.get_object(Bucket=S3_BUCKET, Key=s3_key)
    body = response["Body"].read().decode("utf-8")
    return body

def parse_to_geodataframe(content, file_format):
    if file_format == "csv":
        df = pd.read_csv(StringIO(content))
        lat_cols = [c for c in df.columns if c.lower() in ("latitude", "lat")]
        lng_cols = [c for c in df.columns if c.lower() in ("longitude", "lng", "lon")]
        if lat_cols and lng_cols:
            lat_col = lat_cols[0]
            lng_col = lng_cols[0]
            df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
            df[lng_col] = pd.to_numeric(df[lng_col], errors="coerce")
            df = df.dropna(subset=[lat_col, lng_col]).copy()
            df = df[df[lat_col].between(-90, 90) & df[lng_col].between(-180, 180)].copy()
            gdf = gpd.GeoDataFrame(
                df,
                geometry=gpd.points_from_xy(df[lng_col], df[lat_col]),
                crs="EPSG:4326"
            )
        else:
            gdf = gpd.GeoDataFrame(df)
        return gdf

    parsed = json.loads(content)
    if parsed.get("type") == "FeatureCollection":
        gdf = gpd.GeoDataFrame.from_features(parsed["features"], crs="EPSG:4326")
        return gdf
    if isinstance(parsed, list):
        df = pd.DataFrame(parsed)
    elif isinstance(parsed, dict) and "data" in parsed and isinstance(parsed["data"], list):
        df = pd.DataFrame(parsed["data"])
    else:
        df = pd.DataFrame([parsed])

    lat_cols = [c for c in df.columns if c.lower() in ("latitude", "lat")]
    lng_cols = [c for c in df.columns if c.lower() in ("longitude", "lng", "lon")]
    if lat_cols and lng_cols:
        lat_col = lat_cols[0]
        lng_col = lng_cols[0]
        df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
        df[lng_col] = pd.to_numeric(df[lng_col], errors="coerce")
        df = df.dropna(subset=[lat_col, lng_col]).copy()
        df = df[df[lat_col].between(-90, 90) & df[lng_col].between(-180, 180)].copy()
        gdf = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df[lng_col], df[lat_col]),
            crs="EPSG:4326"
        )
    else:
        gdf = gpd.GeoDataFrame(df)
    return gdf


def upload_json(bucket, key, body):
    """Upload a Python dict as application/json to S3. Returns the key on success."""
    client = get_s3_client()
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(body),
        ContentType="application/json",
    )
    return key


def load_and_merge_datasets(datasets):
    """Fetch all datasets from S3, parse each into a GeoDataFrame, and merge.

    Accepts the ``datasets`` list from the Redis job payload.  Each entry can
    be a dict with ``s3Key`` / ``fileFormat`` keys or a plain string treated as
    an S3 key.  Returns a single :class:`gpd.GeoDataFrame` (may be empty if
    nothing loaded).
    """
    frames = []
    for ds in datasets:
        if isinstance(ds, dict) and ds.get("s3Key"):
            s3_key = ds["s3Key"]
            file_format = (ds.get("fileFormat") or "geojson").lower()
        elif isinstance(ds, str):
            s3_key = ds
            file_format = ds.rsplit(".", 1)[-1].lower() if "." in ds else "geojson"
        else:
            continue
        try:
            content = fetch_dataset_from_s3(s3_key)
            gdf = parse_to_geodataframe(content, file_format)
            if gdf is not None and not gdf.empty:
                frames.append(gdf)
        except Exception as e:
            print(f"Skipping dataset {s3_key}: {e}")
    if not frames:
        return gpd.GeoDataFrame()
    merged = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True))
    if merged.crs is None:
        merged = merged.set_crs(epsg=4326)
    return merged
