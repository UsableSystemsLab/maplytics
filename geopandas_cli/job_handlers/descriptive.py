import os
import json
import boto3
import pandas as pd
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

import requests

S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "http://rustfs:9000")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "rustfsadmin")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "rustfsadmin")
S3_BUCKET = os.environ.get("S3_BUCKET_NAME", "datasets")
API_URL = os.environ.get("API_URL", "http://api_server:4000/api")

# Bag of words for descriptive statistics detection and operation extraction.
# Each keyword maps to the statistical operation it represents.
DESCRIPTIVE_BAG_OF_WORDS = {
    "min": "min",
    "minimum": "min",
    "max": "max",
    "maximum": "max",
    "avg": "mean",
    "average": "mean",
    "mean": "mean",
    "median": "median",
    "std": "std",
    "deviation": "std",
    "sum": "sum",
    "count": "count",
    "range": "range",
    "variance": "variance",
    "statistics": "summary",
    "stats": "summary",
    "summarize": "summary",
    "summary": "summary",
}


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
        from io import StringIO
        df = pd.read_csv(StringIO(content))
        lat_cols = [c for c in df.columns if c.lower() in ("latitude", "lat")]
        lng_cols = [c for c in df.columns if c.lower() in ("longitude", "lng", "lon")]
        if lat_cols and lng_cols:
            gdf = gpd.GeoDataFrame(
                df,
                geometry=gpd.points_from_xy(df[lng_cols[0]], df[lat_cols[0]]),
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
        gdf = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df[lng_cols[0]], df[lat_cols[0]]),
            crs="EPSG:4326"
        )
    else:
        gdf = gpd.GeoDataFrame(df)
    return gdf


def detect_grouping_column(query, columns):
    """Find which column to group by, based on the query or column names."""
    query_lower = query.lower()
    # Check if any column name is mentioned in the query
    for col in columns:
        if col.lower() in query_lower:
            return col
    # Fallback: look for common spatial/grouping column names
    group_hints = ["district", "area", "zone", "region", "city", "neighborhood", "category", "type", "class"]
    for hint in group_hints:
        for col in columns:
            if hint in col.lower():
                return col
    # Use first categorical column that isn't a name/id
    name_hints = ["name", "id", "uuid", "url", "link", "address", "phone", "email"]
    for col in columns:
        if not any(h in col.lower() for h in name_hints):
            return col
    return columns[0] if columns else None


def detect_operation(query):
    """Use bag of words to detect which statistical operation the user wants."""
    tokens = query.lower().split()
    for token in tokens:
        if token in DESCRIPTIVE_BAG_OF_WORDS:
            return DESCRIPTIVE_BAG_OF_WORDS[token]
    return "summary"


def generate_descriptive_chart(gdf, query, output_path):
    categorical_cols = gdf.select_dtypes(include=["object", "category"]).columns.tolist()
    numeric_cols = gdf.select_dtypes(include=[np.number]).columns.tolist()

    if not categorical_cols and not numeric_cols:
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.text(0.5, 0.5, "No analyzable columns found in dataset",
                ha='center', va='center', fontsize=14)
        ax.axis('off')
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        return

    operation = detect_operation(query)
    group_col = detect_grouping_column(query, categorical_cols) if categorical_cols else None

    # Core logic: group features by a categorical column, count per group,
    # then apply the stat operation on those counts.
    if group_col:
        counts = gdf.groupby(group_col).size().reset_index(name="count")
        counts = counts.sort_values("count", ascending=False)

        if operation == "max":
            top = counts.iloc[0]
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            # Highlight the max bar
            bars[0].set_color('#dc2626')
            bars[0].set_edgecolor('#991b1b')
            ax.set_title(f"MAX: {top[group_col]} ({int(top['count'])} features)", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "min":
            bottom = counts.iloc[-1]
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            bars[-1].set_color('#dc2626')
            bars[-1].set_edgecolor('#991b1b')
            ax.set_title(f"MIN: {bottom[group_col]} ({int(bottom['count'])} features)", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "mean":
            avg_val = counts["count"].mean()
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.axhline(y=avg_val, color='#dc2626', linestyle='--', linewidth=2, label=f'Average: {avg_val:.1f}')
            ax.legend(fontsize=11)
            ax.set_title(f"Average features per {group_col}: {avg_val:.1f}", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "median":
            med_val = counts["count"].median()
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.axhline(y=med_val, color='#dc2626', linestyle='--', linewidth=2, label=f'Median: {med_val:.1f}')
            ax.legend(fontsize=11)
            ax.set_title(f"Median features per {group_col}: {med_val:.1f}", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "count":
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.set_title(f"Count of features per {group_col} (Total: {int(counts['count'].sum())})", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "sum":
            total = int(counts["count"].sum())
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.set_title(f"Total features: {total}", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "std":
            std_val = counts["count"].std()
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.set_title(f"Std deviation of counts per {group_col}: {std_val:.2f}", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "variance":
            var_val = counts["count"].var()
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.set_title(f"Variance of counts per {group_col}: {var_val:.2f}", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        elif operation == "range":
            range_val = int(counts["count"].max() - counts["count"].min())
            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax.set_title(f"Range of counts per {group_col}: {range_val}", fontsize=14, fontweight='bold')
            ax.set_xlabel(group_col)
            ax.set_ylabel("Count")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, counts["count"]):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        str(int(val)), ha='center', va='bottom', fontsize=9)

        else:  # summary
            fig, axes = plt.subplots(1, 2, figsize=(14, 6))
            ax_bar = axes[0]
            ax_bar.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')
            ax_bar.set_title(f"Features per {group_col}", fontsize=12, fontweight='bold')
            ax_bar.set_xlabel(group_col)
            ax_bar.set_ylabel("Count")
            ax_bar.tick_params(axis='x', rotation=45)

            ax_table = axes[1]
            ax_table.axis('off')
            stats_data = {
                "Statistic": ["Total", "Groups", "Mean", "Median", "Max", "Min", "Std Dev"],
                "Value": [
                    int(counts["count"].sum()),
                    len(counts),
                    f"{counts['count'].mean():.1f}",
                    f"{counts['count'].median():.1f}",
                    f"{int(counts['count'].max())} ({counts.iloc[0][group_col]})",
                    f"{int(counts['count'].min())} ({counts.iloc[-1][group_col]})",
                    f"{counts['count'].std():.2f}",
                ]
            }
            table = ax_table.table(
                cellText=list(zip(stats_data["Statistic"], stats_data["Value"])),
                colLabels=["Statistic", "Value"],
                cellLoc='center',
                loc='center'
            )
            table.auto_set_font_size(False)
            table.set_fontsize(10)
            table.scale(1.3, 1.6)
            ax_table.set_title("Summary Statistics", fontsize=12, fontweight='bold', pad=20)

        plt.suptitle(f"Query: {query}", fontsize=10, style='italic', y=0.02)
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        return

    # Fallback: if only numeric columns exist (e.g., dataset with ratings, prices as numbers)
    if numeric_cols:
        target_col = None
        query_lower = query.lower()
        for col in numeric_cols:
            if col.lower() in query_lower:
                target_col = col
                break
        cols = [target_col] if target_col else numeric_cols[:6]

        if operation == "summary":
            stats = gdf[cols].describe()
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.axis('off')
            table = ax.table(
                cellText=stats.round(2).values,
                rowLabels=stats.index,
                colLabels=stats.columns,
                cellLoc='center',
                loc='center'
            )
            table.auto_set_font_size(False)
            table.set_fontsize(9)
            table.scale(1.2, 1.4)
            ax.set_title("Descriptive Statistics", fontsize=12, fontweight='bold', pad=20)
        else:
            values = {}
            for col in cols:
                if operation == "min":
                    values[col] = gdf[col].min()
                elif operation == "max":
                    values[col] = gdf[col].max()
                elif operation == "mean":
                    values[col] = gdf[col].mean()
                elif operation == "median":
                    values[col] = gdf[col].median()
                elif operation == "std":
                    values[col] = gdf[col].std()
                elif operation == "sum":
                    values[col] = gdf[col].sum()
                elif operation == "count":
                    values[col] = gdf[col].count()
                elif operation == "variance":
                    values[col] = gdf[col].var()
                elif operation == "range":
                    values[col] = gdf[col].max() - gdf[col].min()

            fig, ax = plt.subplots(figsize=(10, 6))
            bars = ax.bar(values.keys(), values.values(), color='#6366f1', edgecolor='#4338ca')
            ax.set_title(f"{operation.upper()} of numeric columns", fontsize=14, fontweight='bold')
            ax.set_ylabel("Value")
            ax.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, values.values()):
                ax.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                        f'{val:.2f}', ha='center', va='bottom', fontsize=9)

        plt.suptitle(f"Query: {query}", fontsize=10, style='italic', y=0.02)
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()


def process(job):
    job_id = job.get("jobId", "unknown")
    query = job.get("query", "")
    project_id = job.get("projectId", "")
    datasets = job.get("datasets", [])

    output_dir = "temp_job_output"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}_descriptive.png")

    # Resolve dataset: use provided datasets or discover from S3
    dataset_info = None
    if datasets and len(datasets) > 0:
        ds = datasets[0]
        if isinstance(ds, dict) and ds.get("s3Key"):
            dataset_info = ds
        elif isinstance(ds, str):
            dataset_info = {"s3Key": ds, "fileFormat": ds.rsplit(".", 1)[-1] if "." in ds else "geojson"}

    if not dataset_info:
        discovered = list_s3_datasets()
        if discovered:
            dataset_info = discovered[0]

    if not dataset_info:
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.text(0.5, 0.5, "No dataset found for analysis",
                ha='center', va='center', fontsize=14)
        ax.axis('off')
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
    else:
        s3_key = dataset_info["s3Key"]
        file_format = dataset_info.get("fileFormat", "geojson").lower()
        content = fetch_dataset_from_s3(s3_key)
        gdf = parse_to_geodataframe(content, file_format)
        generate_descriptive_chart(gdf, query, output_path)

    # Always upload result to S3
    result_s3_key = f"projects/{project_id}/nlq_results/{job_id}_descriptive.png"
    client = get_s3_client()
    with open(output_path, "rb") as f:
        client.put_object(
            Bucket=S3_BUCKET,
            Key=result_s3_key,
            Body=f.read(),
            ContentType="image/png"
        )

    return result_s3_key
