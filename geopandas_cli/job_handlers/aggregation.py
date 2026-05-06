import os
import pandas as pd
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import contextily as ctx
import seaborn as sns
import numpy as np
from .utils import (
    get_s3_client,
    fetch_dataset_from_s3,
    parse_to_geodataframe,
    S3_BUCKET
)

def process(job):
    job_id = job.get("jobId", "unknown")
    query = job.get("query", "")
    project_id = job.get("projectId", "")
    datasets = job.get("datasets", [])

    output_dir = "temp_job_output"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}_aggregation.png")

    if not datasets:
        return None

    gdfs = []
    for ds in datasets:
        dataset_info = None
        if isinstance(ds, dict) and ds.get("s3Key"):
            dataset_info = ds
        elif isinstance(ds, str):
            dataset_info = {"s3Key": ds, "fileFormat": ds.rsplit(".", 1)[-1] if "." in ds else "geojson"}
        
        if dataset_info:
            try:
                s3_key = dataset_info["s3Key"]
                file_format = dataset_info.get("fileFormat", "geojson").lower()
                content = fetch_dataset_from_s3(s3_key)
                gdf = parse_to_geodataframe(content, file_format)
                if not gdf.empty:
                    gdfs.append(gdf)
            except Exception as e:
                print(f"Error loading dataset {ds}: {e}")

    if not gdfs:
        print("No valid datasets found to aggregate.")
        return None

    # Combine all datasets
    combined_gdf = gpd.GeoDataFrame(pd.concat(gdfs, ignore_index=True))
    
    # Ensure CRS is set (assume 4326 if missing)
    if combined_gdf.crs is None:
        combined_gdf = combined_gdf.set_crs(epsg=4326)

    # --- Stats (before reprojection) ---
    gdf_latlon = combined_gdf.copy()
    total_features = len(gdf_latlon)

    # Calculate spatial coverage
    try:
        # Extract coordinates safely
        coords_x = gdf_latlon.geometry.x
        coords_y = gdf_latlon.geometry.y
        
        min_lon, max_lon = coords_x.min(), coords_x.max()
        min_lat, max_lat = coords_y.min(), coords_y.max()

        # Rough distance conversion (degrees → km)
        lon_range_km = (max_lon - min_lon) * 111
        lat_range_km = (max_lat - min_lat) * 111
        total_area_km2 = abs(lon_range_km * lat_range_km)
    except Exception:
        min_lon = max_lon = min_lat = max_lat = 0
        lon_range_km = lat_range_km = total_area_km2 = 0

    # --- Density grid ---
    try:
        bins = 20
        heatmap, xedges, yedges = np.histogram2d(
            gdf_latlon.geometry.x,
            gdf_latlon.geometry.y,
            bins=bins
        )
        max_density_cell = heatmap.max()
        cells_with_points = np.sum(heatmap > 0)
        total_cells = bins * bins
        avg_density_cell = heatmap[heatmap > 0].mean() if cells_with_points > 0 else 0
    except Exception:
        max_density_cell = cells_with_points = avg_density_cell = 0
        total_cells = 400

    # --- Reproject for plotting ---
    try:
        gdf_map = combined_gdf.to_crs(epsg=3857)
        gdf_map["x"] = gdf_map.geometry.x
        gdf_map["y"] = gdf_map.geometry.y
    except Exception:
        gdf_map = combined_gdf
        gdf_map["x"] = gdf_map.geometry.x
        gdf_map["y"] = gdf_map.geometry.y

    # --- Create figure with 2 panels ---
    fig, (ax_text, ax_map) = plt.subplots(
        1, 2, figsize=(16, 10),
        gridspec_kw={'width_ratios': [1, 2]}
    )

    # =========================
    # LEFT PANEL (TEXT)
    # =========================
    ax_text.axis("off")

    text_lines = [
        "AGGREGATION STATISTICS",
        "=" * 30,
        "",
        f"TOTAL FEATURES: {total_features:,}",
        "",
        "SPATIAL COVERAGE",
        f"  Longitude Range: {min_lon:.4f} to {max_lon:.4f} ({lon_range_km:.0f} km)",
        f"  Latitude Range:  {min_lat:.4f} to {max_lat:.4f} ({lat_range_km:.0f} km)",
        f"  Total Area:      {total_area_km2:,.0f} km²",
        "",
        "HEATMAP DENSITY",
        f"  Max Density:     {max_density_cell:.0f} features/cell",
        f"  Avg Density:     {avg_density_cell:.2f} features/cell",
        f"  Active Cells:    {cells_with_points} ({(cells_with_points/total_cells)*100:.1f}%)"
    ]

    ax_text.text(
        0.01, 0.99,
        "\n".join(text_lines),
        va="top",
        ha="left",
        fontsize=11,
        family="monospace"
    )

    # =========================
    # RIGHT PANEL (MAP)
    # =========================

    # Heatmap
    try:
        sns.kdeplot(
            x=gdf_map["x"],
            y=gdf_map["y"],
            fill=True,
            cmap="Reds",
            alpha=0.5,
            levels=50,
            ax=ax_map
        )
    except Exception:
        pass

    # Points
    gdf_map.plot(
        ax=ax_map,
        color="blue",
        markersize=20,
        alpha=0.7,
        label="Data Points"
    )

    # Basemap
    try:
        ctx.add_basemap(ax_map, source=ctx.providers.OpenStreetMap.Mapnik)
    except Exception:
        print("Warning: Could not add basemap.")

    ax_map.set_title(f"Aggregated Data Map\nQuery: {query[:50]}...")
    ax_map.legend()
    ax_map.axis("off")

    # --- Save ---
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()

    # Always upload result to S3
    result_s3_key = f"projects/{project_id}/nlq_results/{job_id}_aggregation.png"
    client = get_s3_client()
    with open(output_path, "rb") as f:
        client.put_object(
            Bucket=S3_BUCKET,
            Key=result_s3_key,
            Body=f.read(),
            ContentType="image/png"
        )

    return result_s3_key
