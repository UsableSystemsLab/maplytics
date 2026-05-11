import os
import json
import pandas as pd
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import contextily as ctx
import seaborn as sns
import numpy as np

import requests
from .utils import (
    get_s3_client,
    fetch_dataset_from_s3,
    parse_to_geodataframe,
    S3_BUCKET
)

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


def detect_grouping_column(query, columns):
    query_lower = query.lower()
    for col in columns:
        if col.lower() in query_lower:
            return col
    group_hints = ["district", "area", "zone", "region", "city", "neighborhood", "category", "type", "class"]
    for hint in group_hints:
        for col in columns:
            if hint in col.lower():
                return col
    name_hints = ["name", "id", "uuid", "url", "link", "address", "phone", "email"]
    for col in columns:
        if not any(h in col.lower() for h in name_hints):
            return col
    return columns[0] if columns else None


def detect_operation(query):
    tokens = query.lower().split()
    for token in tokens:
        if token in DESCRIPTIVE_BAG_OF_WORDS:
            return DESCRIPTIVE_BAG_OF_WORDS[token]
    return "summary"


def _render_map(ax, gdf):
    gdf_map = gdf.copy()
    if gdf_map.crs is None:
        gdf_map = gdf_map.set_crs(epsg=4326)
    try:
        gdf_map = gdf_map.to_crs(epsg=3857)
    except Exception:
        pass

    x = gdf_map.geometry.x
    y = gdf_map.geometry.y

    try:
        sns.kdeplot(x=x, y=y, fill=True, cmap="Reds", alpha=0.5, levels=50, ax=ax)
    except Exception:
        pass

    gdf_map.plot(ax=ax, color="blue", markersize=20, alpha=0.7, label="Data Points")

    try:
        ctx.add_basemap(ax, source=ctx.providers.OpenStreetMap.Mapnik)
    except Exception:
        print("Warning: Could not add basemap.")

    ax.set_title("Spatial Distribution", fontsize=12, fontweight='bold')
    ax.legend()
    ax.axis("off")


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

    fig = plt.figure(figsize=(18, 14))
    gs = gridspec.GridSpec(2, 2, figure=fig, height_ratios=[1, 1], width_ratios=[1, 2])

    ax_stats = fig.add_subplot(gs[0, 0])
    ax_chart = fig.add_subplot(gs[0, 1])
    ax_map = fig.add_subplot(gs[1, :])

    ax_stats.axis("off")

    _render_map(ax_map, gdf)

    if group_col:
        counts = gdf.groupby(group_col).size().reset_index(name="count")
        counts = counts.sort_values("count", ascending=False)

        total = int(counts["count"].sum())
        n_groups = len(counts)
        mean_val = counts["count"].mean()
        median_val = counts["count"].median()
        std_val = counts["count"].std()
        var_val = counts["count"].var()
        range_val = int(counts["count"].max() - counts["count"].min())
        max_row = counts.iloc[0]
        min_row = counts.iloc[-1]

        stats_lines = [
            "DESCRIPTIVE STATISTICS",
            "=" * 30,
            "",
            f"OPERATION: {operation.upper()}",
            f"GROUPED BY: {group_col}",
            "",
            f"Total Features: {total:,}",
            f"Groups: {n_groups}",
            "",
            "GROUP SUMMARY",
            f"  Mean:    {mean_val:.1f} features/group",
            f"  Median:  {median_val:.1f} features/group",
            f"  Std Dev: {std_val:.2f}",
            f"  Max:     {int(max_row['count'])} ({max_row[group_col]})",
            f"  Min:     {int(min_row['count'])} ({min_row[group_col]})",
        ]

        if operation == "max":
            stats_lines += ["", f">> RESULT: {max_row[group_col]}", f"   Count: {int(max_row['count'])}"]
        elif operation == "min":
            stats_lines += ["", f">> RESULT: {min_row[group_col]}", f"   Count: {int(min_row['count'])}"]
        elif operation == "mean":
            stats_lines += ["", f">> RESULT: {mean_val:.1f} features/group"]
        elif operation == "median":
            stats_lines += ["", f">> RESULT: {median_val:.1f} features/group"]
        elif operation == "count":
            stats_lines += ["", f">> TOTAL COUNT: {total:,}"]
        elif operation == "sum":
            stats_lines += ["", f">> TOTAL SUM: {total:,}"]
        elif operation == "std":
            stats_lines += ["", f">> STD DEVIATION: {std_val:.2f}"]
        elif operation == "variance":
            stats_lines += ["", f">> VARIANCE: {var_val:.2f}"]
        elif operation == "range":
            stats_lines += ["", f">> RANGE: {range_val}"]

        ax_stats.text(0.01, 0.99, "\n".join(stats_lines), va="top", ha="left",
                      fontsize=11, family="monospace")

        bars = ax_chart.bar(counts[group_col], counts["count"], color='#6366f1', edgecolor='#4338ca')

        if operation == "max":
            bars[0].set_color('#dc2626')
            bars[0].set_edgecolor('#991b1b')
            ax_chart.set_title(f"MAX: {max_row[group_col]} ({int(max_row['count'])} features)",
                               fontsize=14, fontweight='bold')
        elif operation == "min":
            bars[-1].set_color('#dc2626')
            bars[-1].set_edgecolor('#991b1b')
            ax_chart.set_title(f"MIN: {min_row[group_col]} ({int(min_row['count'])} features)",
                               fontsize=14, fontweight='bold')
        elif operation == "mean":
            ax_chart.axhline(y=mean_val, color='#dc2626', linestyle='--', linewidth=2,
                             label=f'Average: {mean_val:.1f}')
            ax_chart.legend(fontsize=11)
            ax_chart.set_title(f"Average features per {group_col}: {mean_val:.1f}",
                               fontsize=14, fontweight='bold')
        elif operation == "median":
            ax_chart.axhline(y=median_val, color='#dc2626', linestyle='--', linewidth=2,
                             label=f'Median: {median_val:.1f}')
            ax_chart.legend(fontsize=11)
            ax_chart.set_title(f"Median features per {group_col}: {median_val:.1f}",
                               fontsize=14, fontweight='bold')
        elif operation == "count":
            ax_chart.set_title(f"Count of features per {group_col} (Total: {total})",
                               fontsize=14, fontweight='bold')
        elif operation == "sum":
            ax_chart.set_title(f"Total features: {total}", fontsize=14, fontweight='bold')
        elif operation == "std":
            ax_chart.set_title(f"Std deviation per {group_col}: {std_val:.2f}",
                               fontsize=14, fontweight='bold')
        elif operation == "variance":
            ax_chart.set_title(f"Variance per {group_col}: {var_val:.2f}",
                               fontsize=14, fontweight='bold')
        elif operation == "range":
            ax_chart.set_title(f"Range per {group_col}: {range_val}",
                               fontsize=14, fontweight='bold')
        else:
            ax_chart.set_title(f"Features per {group_col}", fontsize=14, fontweight='bold')

        ax_chart.set_xlabel(group_col)
        ax_chart.set_ylabel("Count")
        ax_chart.tick_params(axis='x', rotation=45)
        for bar, val in zip(bars, counts["count"]):
            ax_chart.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                          str(int(val)), ha='center', va='bottom', fontsize=9)

    elif numeric_cols:
        target_col = None
        query_lower = query.lower()
        for col in numeric_cols:
            if col.lower() in query_lower:
                target_col = col
                break
        cols = [target_col] if target_col else numeric_cols[:6]

        stats_lines = [
            "DESCRIPTIVE STATISTICS",
            "=" * 30,
            "",
            f"OPERATION: {operation.upper()}",
            f"Total Features: {len(gdf):,}",
            f"Numeric Columns: {len(cols)}",
            "",
        ]
        for col in cols:
            stats_lines.append(f"{col}:")
            stats_lines.append(f"  Mean: {gdf[col].mean():.2f}")
            stats_lines.append(f"  Std:  {gdf[col].std():.2f}")
            stats_lines.append(f"  Min:  {gdf[col].min():.2f}")
            stats_lines.append(f"  Max:  {gdf[col].max():.2f}")
            stats_lines.append("")

        ax_stats.text(0.01, 0.99, "\n".join(stats_lines), va="top", ha="left",
                      fontsize=11, family="monospace")

        if operation == "summary":
            stats = gdf[cols].describe()
            ax_chart.axis('off')
            table = ax_chart.table(
                cellText=stats.round(2).values,
                rowLabels=stats.index,
                colLabels=stats.columns,
                cellLoc='center',
                loc='center'
            )
            table.auto_set_font_size(False)
            table.set_fontsize(9)
            table.scale(1.2, 1.4)
            ax_chart.set_title("Descriptive Statistics", fontsize=12, fontweight='bold', pad=20)
        else:
            values = {}
            for col in cols:
                if operation == "min": values[col] = gdf[col].min()
                elif operation == "max": values[col] = gdf[col].max()
                elif operation == "mean": values[col] = gdf[col].mean()
                elif operation == "median": values[col] = gdf[col].median()
                elif operation == "std": values[col] = gdf[col].std()
                elif operation == "sum": values[col] = gdf[col].sum()
                elif operation == "count": values[col] = gdf[col].count()
                elif operation == "variance": values[col] = gdf[col].var()
                elif operation == "range": values[col] = gdf[col].max() - gdf[col].min()

            bars = ax_chart.bar(values.keys(), values.values(), color='#6366f1', edgecolor='#4338ca')
            ax_chart.set_title(f"{operation.upper()} of numeric columns", fontsize=14, fontweight='bold')
            ax_chart.set_ylabel("Value")
            ax_chart.tick_params(axis='x', rotation=45)
            for bar, val in zip(bars, values.values()):
                ax_chart.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                              f'{val:.2f}', ha='center', va='bottom', fontsize=9)

    plt.suptitle(f"Query: {query}", fontsize=10, style='italic', y=0.02)
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()


def process(job):
    job_id = job.get("jobId", "unknown")
    query = job.get("query", "")
    project_id = job.get("projectId", "")
    datasets = job.get("datasets", [])

    output_dir = "temp_job_output"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}_descriptive.png")

    dataset_info = None

    if datasets and len(datasets) > 0:
        ds = datasets[0]
        if isinstance(ds, dict) and ds.get("s3Key"):
            dataset_info = ds
        elif isinstance(ds, str):
            dataset_info = {"s3Key": ds, "fileFormat": ds.rsplit(".", 1)[-1] if "." in ds else "geojson"}

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
