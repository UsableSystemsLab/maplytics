"""S3-compatible storage helpers (RustFS)."""
import os
import json
import boto3
from botocore.config import Config

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=os.environ.get("S3_ENDPOINT"),
            aws_access_key_id=os.environ["S3_ACCESS_KEY"],
            aws_secret_access_key=os.environ["S3_SECRET_KEY"],
            region_name=os.environ.get("S3_REGION", "us-east-1"),
            config=Config(s3={"addressing_style": "path"}),
        )
    return _client


def upload_geojson(payload: dict, key: str) -> str:
    bucket = os.environ["S3_BUCKET_NAME"]
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    _get_client().put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType="application/geo+json",
    )
    return key
