import os
import pandas as pd
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.patches as mpatches
import contextily as ctx
import seaborn as sns
import numpy as np
from .utils import (
    get_s3_client,
    load_and_merge_datasets,
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

    # Load and merge datasets
    combined_gdf = load_and_merge_datasets(datasets)

    if combined_gdf.empty:
        print("No valid datasets found to aggregate.")
        return None

    # 1. Coordinate statistics (before projection for display, and projected for calculation)
    gdf_latlon = combined_gdf.copy()
    if gdf_latlon.crs is None:
        gdf_latlon = gdf_latlon.set_crs(epsg=4326)

    total_features = len(gdf_latlon)

    # Project to EPSG:6933 for equal-area and distance measurements in meters
    try:
        gdf_proj = gdf_latlon.to_crs(epsg=6933)
    except Exception:
        try:
            gdf_proj = gdf_latlon.to_crs(epsg=3857)
        except Exception:
            gdf_proj = gdf_latlon

    # Core Stats
    mean_lon = gdf_latlon.geometry.x.mean()
    mean_lat = gdf_latlon.geometry.y.mean()
    std_lon = gdf_latlon.geometry.x.std()
    std_lat = gdf_latlon.geometry.y.std()
    min_lon, max_lon = gdf_latlon.geometry.x.min(), gdf_latlon.geometry.x.max()
    min_lat, max_lat = gdf_latlon.geometry.y.min(), gdf_latlon.geometry.y.max()

    # Convex Hull Area calculation
    try:
        hull = gdf_proj.unary_union.convex_hull
        if hull.geom_type == 'Polygon':
            hull_area_km2 = hull.area / 1e6
        else:
            hull_area_km2 = 0.0
    except Exception:
        hull_area_km2 = 0.0

    # Rough bounding box area
    try:
        minx, miny, maxx, maxy = gdf_proj.total_bounds
        bbox_area_km2 = ((maxx - minx) * (maxy - miny)) / 1e6
    except Exception:
        bbox_area_km2 = 0.0

    study_area_km2 = hull_area_km2 if hull_area_km2 > 0 else bbox_area_km2
    if study_area_km2 <= 0:
        study_area_km2 = 1.0

    # Clark-Evans Nearest Neighbor Index (R)
    try:
        coords = np.column_stack((gdf_proj.geometry.x, gdf_proj.geometry.y))
        n_points = len(coords)
        if n_points > 1:
            # Pairwise distances with memory safety for large datasets
            if n_points < 3000:
                dists = np.sqrt(((coords[:, None, :] - coords[None, :, :])**2).sum(axis=-1))
                np.fill_diagonal(dists, np.inf)
                nearest_dists = dists.min(axis=1)
            else:
                nearest_dists = []
                for i in range(0, n_points, 1000):
                    chunk = coords[i:i+1000]
                    dists = np.sqrt(((chunk[:, None, :] - coords[None, :, :])**2).sum(axis=-1))
                    for idx in range(len(chunk)):
                        global_idx = i + idx
                        dists[idx, global_idx] = np.inf
                    nearest_dists.extend(dists.min(axis=1))
                nearest_dists = np.array(nearest_dists)

            mean_nnd_m = np.mean(nearest_dists)
            mean_nnd_km = mean_nnd_m / 1000.0

            # Expected NND under random Poisson distribution
            density = n_points / (study_area_km2 * 1e6)
            expected_nnd_m = 0.5 / np.sqrt(density) if density > 0 else 1.0
            expected_nnd_km = expected_nnd_m / 1000.0

            r_value = mean_nnd_m / expected_nnd_m
            if r_value < 1.0:
                r_desc = f"Clustered (R={r_value:.2f})"
                r_color = "#38bdf8" # Cyan
            elif r_value > 1.0:
                r_desc = f"Dispersed (R={r_value:.2f})"
                r_color = "#34d399" # Emerald
            else:
                r_desc = f"Random (R={r_value:.2f})"
                r_color = "#a78bfa" # Purple
        else:
            nearest_dists = np.array([0.0])
            mean_nnd_km = 0.0
            r_value = 1.0
            r_desc = "Single Feature"
            r_color = "#94a3b8" # Slate
    except Exception as e:
        print(f"Error calculating spatial indices: {e}")
        nearest_dists = np.array([0.0])
        mean_nnd_km = 0.0
        r_value = 1.0
        r_desc = "N/A"
        r_color = "#94a3b8"

    # 2. Categorical auto-detection for distribution panel
    best_cat_col = None
    max_score = -1
    blacklist = {"id", "uuid", "key", "url", "link", "email", "phone", "address", "index", "name", "geometry", "_dataset_id"}

    for col in combined_gdf.columns:
        col_lower = col.lower()
        if col_lower in blacklist or any(b in col_lower for b in ["_id", "guid", "href", "key"]):
            continue

        try:
            is_cat = combined_gdf[col].dtype == "object" or isinstance(combined_gdf[col].dtype, pd.CategoricalDtype)
        except Exception:
            is_cat = False
        if is_cat:
            non_null = combined_gdf[col].dropna()
            if len(non_null) == 0:
                continue
            n_unique = non_null.nunique()
            if 1 < n_unique <= 25:
                score = 100 - abs(8 - n_unique)
                if any(k in col_lower for k in ["type", "cat", "class", "amenity", "group", "status", "genre"]):
                    score += 50
                if score > max_score:
                    max_score = score
                    best_cat_col = col

    # 3. Density grid statistics
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

    # Project to EPSG:3857 for standard cartographic Web Mercator bounds
    try:
        gdf_map = combined_gdf.to_crs(epsg=3857)
    except Exception:
        gdf_map = combined_gdf.copy()
    gdf_map["x"] = gdf_map.geometry.x
    gdf_map["y"] = gdf_map.geometry.y

    # ==========================================
    # BUILD EXECUTIVE DASHBOARD REPORT (DARK THEME)
    # ==========================================
    plt.rcParams['text.color'] = '#ffffff'
    plt.rcParams['axes.labelcolor'] = '#94a3b8'
    plt.rcParams['xtick.color'] = '#94a3b8'
    plt.rcParams['ytick.color'] = '#94a3b8'

    fig = plt.figure(figsize=(14, 10.5), facecolor='#0f172a') # Strict Slate-900 canvas background
    gs = gridspec.GridSpec(2, 2, figure=fig, width_ratios=[1.0, 1.0], height_ratios=[1.0, 1.0], wspace=0.18, hspace=0.18)

    # ------------------------------------------
    # PANEL 1: KPI CARDS (TOP LEFT)
    # ------------------------------------------
    ax_kpi = fig.add_subplot(gs[0, 0])
    ax_kpi.tick_params(left=False, right=False, labelleft=False, labelbottom=False, bottom=False)
    for spine in ax_kpi.spines.values():
        spine.set_visible(False)

    # Add a beautiful card container rectangle patch
    card_bg = mpatches.Rectangle((0, 0), 1, 1, facecolor='#1e293b', edgecolor='#334155', linewidth=2.0, transform=ax_kpi.transAxes, zorder=0)
    ax_kpi.add_patch(card_bg)

    # KPI Layout Elements - strictly pinned to transAxes coordinates to prevent layout drifts
    ax_kpi.text(0.05, 0.91, "GIS SPATIAL AGGREGATION REPORT", fontsize=18, fontweight='bold', color='#38bdf8', family='sans-serif', transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.05, 0.85, f"Query: \"{query[:65]}...\"" if len(query) > 65 else f"Query: \"{query}\"", fontsize=11, style='italic', color='#94a3b8', transform=ax_kpi.transAxes, zorder=1)

    # Draw separator line
    ax_kpi.plot([0.05, 0.95], [0.81, 0.81], color='#334155', transform=ax_kpi.transAxes, linewidth=2.0, zorder=1)

    # Card 1: Total Features
    ax_kpi.text(0.05, 0.72, "TOTAL FEATURES", fontsize=11, fontweight='bold', color='#94a3b8', transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.05, 0.60, f"{total_features:,}", fontsize=28, fontweight='bold', color='#38bdf8', transform=ax_kpi.transAxes, zorder=1)

    # Card 2: Study Area
    ax_kpi.text(0.56, 0.72, "STUDY AREA", fontsize=11, fontweight='bold', color='#94a3b8', transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.56, 0.60, f"{study_area_km2:,.1f} km²", fontsize=28, fontweight='bold', color='#34d399', transform=ax_kpi.transAxes, zorder=1)

    # Card 3: Spatial Distribution Pattern
    ax_kpi.text(0.05, 0.44, "SPATIAL PATTERN", fontsize=11, fontweight='bold', color='#94a3b8', transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.05, 0.32, r_desc, fontsize=18, fontweight='bold', color=r_color, transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.05, 0.25, "Clark-Evans Index (R < 1: Clustered)", fontsize=8.5, color='#64748b', transform=ax_kpi.transAxes, zorder=1)

    # Card 4: Avg Distance
    ax_kpi.text(0.56, 0.44, "AVG SEPARATION", fontsize=11, fontweight='bold', color='#94a3b8', transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.56, 0.32, f"{mean_nnd_km:.3f} km", fontsize=18, fontweight='bold', color='#f43f5e', transform=ax_kpi.transAxes, zorder=1)
    ax_kpi.text(0.56, 0.25, f"Max Grid Density: {max_density_cell:.0f} features", fontsize=8.5, color='#64748b', transform=ax_kpi.transAxes, zorder=1)

    # Quick summary paragraph
    summary_text = (
        f"Spatial aggregation of {total_features:,} coordinates across {study_area_km2:,.1f} square kilometers.\n"
        f"Average feature-to-feature separation is {mean_nnd_km*1000:.1f} meters, indicating a statistically "
        f"{'highly clustered' if r_value < 0.8 else 'moderately clustered' if r_value < 1.0 else 'regularly spaced' if r_value > 1.2 else 'random'} "
        f"distribution of geographic features."
    )
    ax_kpi.text(0.05, 0.05, summary_text, fontsize=10.5, color='#cbd5e1', linespacing=1.35, verticalalignment='bottom', transform=ax_kpi.transAxes, zorder=1)

    # ------------------------------------------
    # PANEL 2: HIGH-RESOLUTION CARTOGRAPHIC MAP (TOP RIGHT)
    # ------------------------------------------
    # Layout Layer 1: Background card subplot that does NOT shrink to maintain aspect ratio, keeping card panel filled
    ax_map_bg = fig.add_subplot(gs[0, 1])
    ax_map_bg.tick_params(left=False, right=False, labelleft=False, labelbottom=False, bottom=False)
    for spine in ax_map_bg.spines.values():
        spine.set_visible(False)
    
    map_card_bg = mpatches.Rectangle((0, 0), 1, 1, facecolor='#1e293b', edgecolor='#334155', linewidth=2.0, transform=ax_map_bg.transAxes, zorder=0)
    ax_map_bg.add_patch(map_card_bg)
    ax_map_bg.set_title("Spatial Density & Heatmap Overlay", fontsize=16, fontweight='bold', color='#38bdf8', pad=15)

    # Layout Layer 2: Transparent map plotting axis rendered exactly on top, letting map center perfectly inside card
    ax_map = fig.add_subplot(gs[0, 1])
    ax_map.set_facecolor('none')
    ax_map.patch.set_alpha(0.0)
    ax_map.tick_params(left=False, right=False, labelleft=False, labelbottom=False, bottom=False)
    for spine in ax_map.spines.values():
        spine.set_visible(False)

    # KDE Heatmap Overlay
    try:
        if total_features > 4:
            sns.kdeplot(
                x=gdf_map["x"],
                y=gdf_map["y"],
                fill=True,
                cmap="mako",
                alpha=0.55,
                levels=25,
                ax=ax_map,
                zorder=2
            )
    except Exception:
        pass

    # Plot features
    gdf_map.plot(
        ax=ax_map,
        color="#06b6d4",
        markersize=45,
        alpha=0.85,
        edgecolor="#ffffff",
        linewidth=0.8,
        label="Geographic Data Points",
        zorder=3
    )

    # Add premium Dark basemap
    try:
        ctx.add_basemap(ax_map, source=ctx.providers.CartoDB.DarkMatter, zorder=1)
    except Exception:
        print("Warning: Could not load dark matter basemap, trying CartoDB Positron.")
        try:
            ctx.add_basemap(ax_map, source=ctx.providers.CartoDB.Positron, zorder=1)
        except Exception:
            pass

    ax_map.legend(loc='lower right', facecolor='#1e293b', edgecolor='#334155', fontsize=10)

    # ------------------------------------------
    # PANEL 3: ATTRIBUTE / DISTANCE DISTRIBUTION (BOTTOM LEFT)
    # ------------------------------------------
    ax_dist = fig.add_subplot(gs[1, 0])
    ax_dist.set_facecolor('#1e293b')
    for spine in ax_dist.spines.values():
        spine.set_edgecolor('#334155')
        spine.set_linewidth(2.0)

    ax_dist.grid(True, color='#334155', linestyle='--', alpha=0.5, zorder=0)

    if best_cat_col:
        counts = combined_gdf[best_cat_col].dropna().value_counts().reset_index()
        counts.columns = [best_cat_col, "count"]
        counts = counts.sort_values("count", ascending=True).tail(8)

        y_pos = np.arange(len(counts))
        colors = sns.color_palette("coolwarm", len(counts))

        bars = ax_dist.barh(y_pos, counts["count"], color=colors, edgecolor='#334155', height=0.6, zorder=3)
        ax_dist.set_yticks(y_pos)
        ax_dist.set_yticklabels(counts[best_cat_col], fontsize=11, fontweight='medium', color='#cbd5e1')
        ax_dist.set_xlabel("Count", fontsize=12, fontweight='bold', labelpad=10)
        ax_dist.set_title(f"Attribute Frequencies ({best_cat_col.upper()})", fontsize=16, fontweight='bold', color='#38bdf8', pad=15)
        ax_dist.tick_params(axis='x', labelsize=11)

        for bar in bars:
            width = bar.get_width()
            ax_dist.text(width + (max(counts["count"])*0.015), bar.get_y() + bar.get_height()/2,
                         f"{int(width):,}",
                         ha='left', va='center', fontsize=10, fontweight='bold', color='#38bdf8')
    else:
        sns.histplot(
            nearest_dists / 1000.0 if len(nearest_dists) > 0 else [0.0],
            kde=True,
            color="#06b6d4",
            edgecolor="#1e293b",
            linewidth=1,
            ax=ax_dist,
            zorder=3
        )
        ax_dist.set_xlabel("Distance to Nearest Neighbor (km)", fontsize=12, fontweight='bold', labelpad=10)
        ax_dist.set_ylabel("Frequency Count", fontsize=12, fontweight='bold', labelpad=10)
        ax_dist.set_title("Nearest Neighbor Separation Profile", fontsize=16, fontweight='bold', color='#38bdf8', pad=15)
        ax_dist.tick_params(axis='both', labelsize=11)

    # ------------------------------------------
    # PANEL 4: DETAILED STATISTICAL DATA TABLE (BOTTOM RIGHT)
    # ------------------------------------------
    ax_table = fig.add_subplot(gs[1, 1])
    ax_table.tick_params(left=False, right=False, labelleft=False, labelbottom=False, bottom=False)
    for spine in ax_table.spines.values():
        spine.set_visible(False)

    # Table card background patch
    table_bg = mpatches.Rectangle((0, 0), 1, 1, facecolor='#1e293b', edgecolor='#334155', linewidth=2.0, transform=ax_table.transAxes, zorder=0)
    ax_table.add_patch(table_bg)

    ax_table.text(0.04, 0.91, "GEOGRAPHIC METRICS DATA TABLE", fontsize=16, fontweight='bold', color='#38bdf8', transform=ax_table.transAxes, zorder=1)

    # Draw separator line
    ax_table.plot([0.04, 0.96], [0.81, 0.81], color='#334155', transform=ax_table.transAxes, linewidth=2.0, zorder=1)

    metrics = [
        ("Centroid Longitude (Mean X)", f"{mean_lon:.5f}° E"),
        ("Centroid Latitude (Mean Y)", f"{mean_lat:.5f}° N"),
        ("Longitude Standard Dev (Spread X)", f"{std_lon:.5f}°"),
        ("Latitude Standard Dev (Spread Y)", f"{std_lat:.5f}°"),
        ("Convex Hull Studied Area", f"{hull_area_km2:,.2f} km²"),
        ("Bounding Box Studied Area", f"{bbox_area_km2:,.2f} km²"),
        ("Observed Mean Separation (r_A)", f"{mean_nnd_km*1000:,.1f} meters"),
        ("Expected Random Separation (r_E)", f"{expected_nnd_km*1000:,.1f} meters"),
        ("Clark-Evans Index Ratio (R)", f"{r_value:.4f}"),
        ("Active Density Grid Cells", f"{cells_with_points} / {total_cells} ({ (cells_with_points / total_cells)*100:.1f}%)"),
        ("Average Active Cell Density", f"{avg_density_cell:.2f} features/cell"),
    ]

    y_start = 0.74
    y_step = 0.066
    for idx, (label, val) in enumerate(metrics):
        y_coord = y_start - (idx * y_step)
        if idx % 2 == 0:
            rect = mpatches.Rectangle((0.02, y_coord - 0.02), 0.96, 0.052, facecolor='#334155', alpha=0.3, transform=ax_table.transAxes, zorder=1)
            ax_table.add_patch(rect)
        ax_table.text(0.04, y_coord, label, fontsize=12, fontweight='medium', color='#cbd5e1', transform=ax_table.transAxes, zorder=2)
        ax_table.text(0.96, y_coord, val, fontsize=12, fontweight='bold', color='#38bdf8', ha='right', transform=ax_table.transAxes, zorder=2)

    # Adjust margins manually to avoid tight_layout distorting the map aspect ratio
    fig.subplots_adjust(left=0.06, right=0.94, top=0.94, bottom=0.06, wspace=0.18, hspace=0.18)
    
    print("=== Subplot Bbox Coordinates (Before savefig) ===")
    print("ax_kpi bbox:", ax_kpi.get_position())
    print("ax_map bbox:", ax_map.get_position())
    print("ax_dist bbox:", ax_dist.get_position())
    print("ax_table bbox:", ax_table.get_position())
    print("================================================")
    
    # Strictly save standard canvas size without tight cropping so the landscape 14x10.5 layout is preserved exactly
    plt.savefig(output_path, dpi=300, facecolor='#0f172a')
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
