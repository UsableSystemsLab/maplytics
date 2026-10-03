import os
import pandas as pd
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.patches as mpatches
import matplotlib.ticker as mticker
import contextily as ctx
import seaborn as sns
import numpy as np
from shapely.geometry import MultiPolygon, Polygon
from .utils import get_s3_client, load_and_merge_datasets, S3_BUCKET


# ─── colour system ────────────────────────────────────────────────────────────
C_BG     = '#0b1120'
C_CARD   = '#131e30'
C_BORDER = '#1f3050'
C_MUTED  = '#4a6080'
C_LABEL  = '#7a9bbf'
C_BODY   = '#c8daf0'
C_WHITE  = '#e8f2ff'
C_ACCENT = '#38bdf8'   # sky-400
C_GREEN  = '#34d399'   # emerald-400
C_AMBER  = '#fbbf24'   # amber-400
C_RED    = '#f87171'   # red-400
C_PURPLE = '#a78bfa'   # violet-400
PALETTE  = [C_ACCENT, C_GREEN, C_AMBER, C_RED, C_PURPLE,
            '#fb923c', '#e879f9', '#2dd4bf', '#facc15', '#818cf8']


def _card(ax, title=""):
    ax.set_facecolor(C_CARD)
    for sp in ax.spines.values():
        sp.set_edgecolor(C_BORDER); sp.set_linewidth(1.4)
    ax.tick_params(colors=C_LABEL, labelsize=9)
    if title:
        ax.set_title(title, fontsize=11, fontweight='bold',
                     color=C_ACCENT, pad=9, loc='left')


def _kv_rows(ax, rows, y_start=0.94, row_h=0.088, label_x=0.04, val_x=0.97):
    """Render a list of (label, value, val_color) tuples as a vertical KV list."""
    for i, (label, val, color) in enumerate(rows):
        y = y_start - i * row_h
        if i % 2 == 0:
            ax.add_patch(mpatches.Rectangle(
                (0.01, y - row_h * 0.55), 0.98, row_h * 0.95,
                facecolor=C_BORDER, alpha=0.18,
                transform=ax.transAxes, zorder=0, clip_on=False
            ))
        ax.text(label_x, y, label, fontsize=9, color=C_BODY,
                transform=ax.transAxes, va='center')
        ax.text(val_x,   y, val,   fontsize=9, fontweight='bold', color=color,
                ha='right', transform=ax.transAxes, va='center')


def process(job):
    job_id     = job.get("jobId", "unknown")
    query      = job.get("query", "")
    project_id = job.get("projectId", "")
    datasets   = job.get("datasets", [])

    output_dir  = "temp_job_output"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}_descriptive.png")

    if not datasets:
        return None

    combined_gdf = load_and_merge_datasets(datasets)
    if combined_gdf.empty:
        print("No valid datasets found.")
        return None

    # ── 1. Basic counts ───────────────────────────────────────────────────────
    total_features = len(combined_gdf)

    # Geometry type distribution
    geom_type_counts = (
        combined_gdf.geometry.geom_type
        .value_counts()
        .to_dict()
    )

    # ── 2. Missing / null / empty-string analysis ─────────────────────────────
    non_geom_cols = [c for c in combined_gdf.columns if c != 'geometry']
    missing = {}
    for col in non_geom_cols:
        null_n   = combined_gdf[col].isna().sum()
        empty_n  = (combined_gdf[col].astype(str).str.strip() == '').sum() if combined_gdf[col].dtype == object else 0
        total_m  = null_n + empty_n
        missing[col] = {
            'null':  int(null_n),
            'empty': int(empty_n),
            'total': int(total_m),
            'pct':   round(total_m / total_features * 100, 1) if total_features > 0 else 0.0
        }
    missing_df = (
        pd.DataFrame(missing)
        .T
        .sort_values('total', ascending=False)
        .reset_index()
        .rename(columns={'index': 'column'})
    )

    # ── 3. Bounding box ───────────────────────────────────────────────────────
    if combined_gdf.crs is None:
        combined_gdf = combined_gdf.set_crs(epsg=4326)
    gdf_latlon = combined_gdf.to_crs(epsg=4326) if combined_gdf.crs.to_epsg() != 4326 else combined_gdf.copy()

    minx, miny, maxx, maxy = gdf_latlon.total_bounds
    bbox_label = f"[{minx:.4f}, {miny:.4f}, {maxx:.4f}, {maxy:.4f}]"

    # ── 4. Area calculations ──────────────────────────────────────────────────
    try:
        gdf_proj = gdf_latlon.to_crs(epsg=6933)
    except Exception:
        gdf_proj = gdf_latlon.to_crs(epsg=3857)

    has_polygons = any(t in geom_type_counts for t in ('Polygon', 'MultiPolygon'))

    if has_polygons:
        gdf_proj['area_km2'] = gdf_proj.geometry.area / 1e6
        area_series = gdf_proj['area_km2'].replace(0, np.nan).dropna()
        area_total  = area_series.sum()
        area_mean   = area_series.mean()
        area_median = area_series.median()
        area_min    = area_series.min()
        area_max    = area_series.max()
        area_std    = area_series.std()
    else:
        area_series = pd.Series([], dtype=float)
        area_total = area_mean = area_median = area_min = area_max = area_std = 0.0

    try:
        hull_area_km2 = gdf_proj.unary_union.convex_hull.area / 1e6
    except Exception:
        hull_area_km2 = 0.0

    bbox_proj     = gdf_proj.total_bounds
    bbox_area_km2 = ((bbox_proj[2] - bbox_proj[0]) * (bbox_proj[3] - bbox_proj[1])) / 1e6

    # ── 5. Point coordinate statistics ───────────────────────────────────────
    pts_x = gdf_latlon.geometry.centroid.x
    pts_y = gdf_latlon.geometry.centroid.y

    coord_stats = {
        'mean_lon':   pts_x.mean(),
        'mean_lat':   pts_y.mean(),
        'median_lon': pts_x.median(),
        'median_lat': pts_y.median(),
        'std_lon':    pts_x.std(),
        'std_lat':    pts_y.std(),
        'range_lon':  pts_x.max() - pts_x.min(),
        'range_lat':  pts_y.max() - pts_y.min(),
    }

    # ── 6. Nearest-neighbour distances (projected centroids) ──────────────────
    coords = np.column_stack((gdf_proj.geometry.centroid.x, gdf_proj.geometry.centroid.y))
    n_pts  = len(coords)

    if n_pts > 1:
        if n_pts < 3000:
            dmat = np.sqrt(((coords[:, None] - coords[None])**2).sum(-1))
            np.fill_diagonal(dmat, np.inf)
            nn_dists = dmat.min(axis=1)
        else:
            nn_dists = []
            for i in range(0, n_pts, 1000):
                chunk = coords[i:i+1000]
                d = np.sqrt(((chunk[:, None] - coords[None])**2).sum(-1))
                for k in range(len(chunk)):
                    d[k, i+k] = np.inf
                nn_dists.extend(d.min(axis=1))
            nn_dists = np.array(nn_dists)

        nn_km = nn_dists / 1000.0
        nn_stats = {
            'mean':   nn_km.mean(),
            'median': np.median(nn_km),
            'std':    nn_km.std(),
            'min':    nn_km.min(),
            'max':    nn_km.max(),
            'p25':    np.percentile(nn_km, 25),
            'p75':    np.percentile(nn_km, 75),
        }
    else:
        nn_km = np.array([0.0])
        nn_stats = {k: 0.0 for k in ('mean','median','std','min','max','p25','p75')}

    # ── 7. Numeric attribute statistics ───────────────────────────────────────
    num_cols = combined_gdf.select_dtypes(include=[np.number]).columns.tolist()
    num_stats = {}
    for col in num_cols:
        s = combined_gdf[col].dropna()
        if len(s) < 2:
            continue
        num_stats[col] = {
            'count':  len(s),
            'mean':   s.mean(),
            'median': s.median(),
            'std':    s.std(),
            'min':    s.min(),
            'max':    s.max(),
            'p25':    s.quantile(0.25),
            'p75':    s.quantile(0.75),
        }

    # ── 8. Categorical column auto-detect ─────────────────────────────────────
    blacklist = {"id","uuid","key","url","link","email","phone","address",
                 "index","name","geometry","_dataset_id"}
    best_cat_col, best_cat_score = None, -1
    for col in non_geom_cols:
        cl = col.lower()
        if cl in blacklist or any(b in cl for b in ["_id","guid","href"]):
            continue
        try:
            is_cat = combined_gdf[col].dtype == object or isinstance(combined_gdf[col].dtype, pd.CategoricalDtype)
        except Exception:
            is_cat = False
        if is_cat:
            nn    = combined_gdf[col].dropna()
            nuniq = nn.nunique()
            if 1 < nuniq <= 25:
                score = 100 - abs(8 - nuniq)
                if any(k in cl for k in ["type","cat","class","amenity","group","status"]):
                    score += 50
                if score > best_cat_score:
                    best_cat_score, best_cat_col = score, col

    # ═══════════════════════════════════════════════════════════════════════════
    # FIGURE  (3 rows × 3 cols grid)
    # Row 0: header banner (thin)
    # Row 1: Overview KV | Geometry dist bar | Missing data bar
    # Row 2: Coord/area KV | NN-distance histogram+box | Numeric attr box-plots
    # ═══════════════════════════════════════════════════════════════════════════
    plt.rcParams.update({
        'text.color':       C_BODY,
        'axes.labelcolor':  C_LABEL,
        'xtick.color':      C_LABEL,
        'ytick.color':      C_LABEL,
        'axes.facecolor':   C_CARD,
        'figure.facecolor': C_BG,
        'axes.grid':        True,
        'grid.color':       C_BORDER,
        'grid.linestyle':   '--',
        'grid.alpha':       0.5,
    })

    fig = plt.figure(figsize=(18, 13), facecolor=C_BG)

    outer = gridspec.GridSpec(
        3, 1, figure=fig,
        height_ratios=[0.055, 0.47, 0.47],
        hspace=0.06,
        left=0.025, right=0.975,
        top=0.975, bottom=0.035
    )

    # ── Header ────────────────────────────────────────────────────────────────
    ax_hdr = fig.add_subplot(outer[0])
    ax_hdr.set_facecolor('#07101e')
    for sp in ax_hdr.spines.values(): sp.set_visible(False)
    ax_hdr.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
    ax_hdr.text(0.012, 0.50, "GIS DESCRIPTIVE STATISTICS REPORT",
                fontsize=14, fontweight='bold', color=C_ACCENT,
                va='center', transform=ax_hdr.transAxes)
    q_str = f'Query: "{query[:100]}…"' if len(query) > 100 else f'Query: "{query}"'
    ax_hdr.text(0.988, 0.50, q_str, fontsize=9, style='italic',
                color=C_LABEL, va='center', ha='right', transform=ax_hdr.transAxes)

    # ── Row 1: three panels ───────────────────────────────────────────────────
    row1 = gridspec.GridSpecFromSubplotSpec(
        1, 3, subplot_spec=outer[1],
        width_ratios=[1.0, 1.1, 1.1],
        wspace=0.06
    )

    # Panel 1-A · Overview KV table
    ax_ov = fig.add_subplot(row1[0])
    _card(ax_ov, "  Overview")
    ax_ov.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)

    ov_rows = [
        ("Total Features",           f"{total_features:,}",              C_ACCENT),
        ("Bounding Box (lon/lat)",    bbox_label,                         C_BODY),
        ("Convex Hull Area",          f"{hull_area_km2:,.2f} km²",        C_GREEN),
        ("Bounding Box Area",         f"{bbox_area_km2:,.2f} km²",        C_GREEN),
        ("Centroid (lon, lat)",       f"({coord_stats['mean_lon']:.4f}, {coord_stats['mean_lat']:.4f})", C_AMBER),
        ("Longitude Spread (σ)",      f"{coord_stats['std_lon']:.5f}°",   C_LABEL),
        ("Latitude Spread (σ)",       f"{coord_stats['std_lat']:.5f}°",   C_LABEL),
        ("Lon Range",                 f"{coord_stats['range_lon']:.4f}°", C_BODY),
        ("Lat Range",                 f"{coord_stats['range_lat']:.4f}°", C_BODY),
        ("Columns (non-geom)",        str(len(non_geom_cols)),            C_PURPLE),
        ("Numeric Columns",           str(len(num_stats)),                C_PURPLE),
    ]
    if has_polygons:
        ov_rows += [
            ("Total Polygon Area",    f"{area_total:,.2f} km²",           C_GREEN),
            ("Mean Polygon Area",     f"{area_mean:,.4f} km²",            C_GREEN),
            ("Median Polygon Area",   f"{area_median:,.4f} km²",          C_GREEN),
            ("Min / Max Area",        f"{area_min:.4f} / {area_max:.2f} km²", C_AMBER),
        ]
    _kv_rows(ax_ov, ov_rows, y_start=0.96, row_h=0.063)

    # Panel 1-B · Geometry type distribution (horizontal bar)
    ax_geom = fig.add_subplot(row1[1])
    _card(ax_geom, "  Geometry Type Distribution")
    geom_labels = list(geom_type_counts.keys())
    geom_vals   = list(geom_type_counts.values())
    geom_colors = PALETTE[:len(geom_labels)]
    y_pos = np.arange(len(geom_labels))
    bars = ax_geom.barh(y_pos, geom_vals, color=geom_colors,
                        edgecolor=C_BORDER, height=0.55, zorder=3)
    ax_geom.set_yticks(y_pos)
    ax_geom.set_yticklabels(geom_labels, fontsize=10, color=C_BODY)
    ax_geom.set_xlabel("Count", fontsize=9, color=C_LABEL)
    for bar in bars:
        w = bar.get_width()
        pct = w / total_features * 100
        ax_geom.text(w + max(geom_vals) * 0.015,
                     bar.get_y() + bar.get_height() / 2,
                     f"{int(w):,}  ({pct:.1f}%)",
                     ha='left', va='center', fontsize=9,
                     fontweight='bold', color=C_ACCENT)
    ax_geom.margins(x=0.25)
    ax_geom.set_axisbelow(True)

    # Panel 1-C · Missing data bar chart
    ax_miss = fig.add_subplot(row1[2])
    _card(ax_miss, "  Missing Data Analysis")

    top_missing = missing_df[missing_df['total'] > 0].head(12)
    if not top_missing.empty:
        y_m   = np.arange(len(top_missing))
        null_v = top_missing['null'].values
        emp_v  = top_missing['empty'].values
        ax_miss.barh(y_m, null_v,  color=C_RED,   edgecolor=C_BORDER,
                     height=0.55, label='Null', zorder=3)
        ax_miss.barh(y_m, emp_v,   color=C_AMBER,  edgecolor=C_BORDER,
                     height=0.55, left=null_v, label='Empty String', zorder=3)
        ax_miss.set_yticks(y_m)
        ax_miss.set_yticklabels(top_missing['column'], fontsize=9, color=C_BODY)
        ax_miss.set_xlabel("Missing Count", fontsize=9, color=C_LABEL)
        ax_miss.legend(facecolor=C_CARD, edgecolor=C_BORDER, fontsize=8,
                       loc='lower right')
        for idx, row in top_missing.reset_index(drop=True).iterrows():
            ax_miss.text(row['total'] + total_features * 0.005,
                         idx, f"{row['pct']}%",
                         ha='left', va='center', fontsize=8,
                         fontweight='bold', color=C_AMBER)
        ax_miss.margins(x=0.18)
        ax_miss.set_axisbelow(True)
    else:
        ax_miss.text(0.5, 0.5, "✓  No missing data detected",
                     ha='center', va='center', fontsize=13,
                     fontweight='bold', color=C_GREEN,
                     transform=ax_miss.transAxes)

    # ── Row 2: three panels ───────────────────────────────────────────────────
    row2 = gridspec.GridSpecFromSubplotSpec(
        1, 3, subplot_spec=outer[2],
        width_ratios=[1.0, 1.1, 1.1],
        wspace=0.06
    )

    # Panel 2-A · Numeric attribute descriptive stats KV
    ax_num = fig.add_subplot(row2[0])
    _card(ax_num, "  Numeric Attribute Stats")
    ax_num.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)

    if num_stats:
        num_rows = []
        for col, st in list(num_stats.items())[:7]:
            short = col[:22] + '…' if len(col) > 22 else col
            num_rows.append((f"── {short} ──", "", C_ACCENT))
            num_rows.append(("  Mean / Median",
                             f"{st['mean']:.3g} / {st['median']:.3g}", C_BODY))
            num_rows.append(("  Std Dev",
                             f"{st['std']:.3g}", C_LABEL))
            num_rows.append(("  Min → Max",
                             f"{st['min']:.3g} → {st['max']:.3g}", C_AMBER))
        _kv_rows(ax_num, num_rows, y_start=0.96, row_h=0.058)
    else:
        ax_num.text(0.5, 0.5, "No numeric columns found",
                    ha='center', va='center', fontsize=11,
                    color=C_MUTED, transform=ax_num.transAxes)

    # Panel 2-B · Nearest-neighbour distance histogram + box-plot inset
    ax_nn = fig.add_subplot(row2[1])
    _card(ax_nn, "  Nearest-Neighbor Distance Distribution")
    ax_nn.set_xlabel("Distance to Nearest Neighbor (km)", fontsize=9, color=C_LABEL)
    ax_nn.set_ylabel("Frequency", fontsize=9, color=C_LABEL)
    ax_nn.set_axisbelow(True)

    if n_pts > 1:
        sns.histplot(nn_km, kde=True, color=C_ACCENT,
                     edgecolor=C_CARD, linewidth=0.8,
                     ax=ax_nn, zorder=3, alpha=0.75)

        # Stat lines
        for val, color, lbl in [
            (nn_stats['mean'],   C_RED,    f"Mean {nn_stats['mean']:.3f}km"),
            (nn_stats['median'], C_GREEN,  f"Median {nn_stats['median']:.3f}km"),
            (nn_stats['p25'],    C_AMBER,  f"P25 {nn_stats['p25']:.3f}km"),
            (nn_stats['p75'],    C_AMBER,  f"P75 {nn_stats['p75']:.3f}km"),
        ]:
            ax_nn.axvline(val, color=color, linewidth=1.6,
                          linestyle='--', zorder=4, label=lbl)

        ax_nn.legend(facecolor=C_CARD, edgecolor=C_BORDER, fontsize=8)

        # Inset box-plot
        ax_box = ax_nn.inset_axes([0.63, 0.60, 0.35, 0.35])
        ax_box.set_facecolor(C_CARD)
        for sp in ax_box.spines.values():
            sp.set_edgecolor(C_BORDER); sp.set_linewidth(1.0)
        bp = ax_box.boxplot(nn_km, vert=True, patch_artist=True,
                            medianprops=dict(color=C_GREEN, linewidth=2),
                            boxprops=dict(facecolor=C_ACCENT+'33', edgecolor=C_ACCENT),
                            whiskerprops=dict(color=C_LABEL),
                            capprops=dict(color=C_LABEL),
                            flierprops=dict(marker='o', color=C_RED,
                                            markerfacecolor=C_RED, markersize=3))
        ax_box.tick_params(colors=C_LABEL, labelsize=7)
        ax_box.set_xticks([])
        ax_box.set_title("Box", fontsize=7, color=C_LABEL, pad=2)

    # Panel 2-C · Numeric box-plots OR categorical bar
    ax_attr = fig.add_subplot(row2[2])

    numeric_plot_cols = [c for c in num_stats.keys()][:6]

    if len(numeric_plot_cols) >= 2:
        _card(ax_attr, "  Numeric Columns — Box Plot Comparison")
        ax_attr.set_axisbelow(True)

        raw_data   = [combined_gdf[c].dropna().values for c in numeric_plot_cols]
        scaled     = []
        tick_lbls  = []
        for col, d in zip(numeric_plot_cols, raw_data):
            rng = d.max() - d.min() if len(d) > 0 else 1
            scaled.append((d - d.min()) / rng if rng > 0 else d - d.min())
            short = col[:14] + '…' if len(col) > 14 else col
            tick_lbls.append(short)

        bp = ax_attr.boxplot(
            scaled,
            vert=True, patch_artist=True, notch=False,
            medianprops=dict(color=C_GREEN, linewidth=2.0),
            whiskerprops=dict(color=C_LABEL, linewidth=1.2),
            capprops=dict(color=C_LABEL, linewidth=1.2),
            flierprops=dict(marker='o', markersize=3,
                            color=C_RED, markerfacecolor=C_RED, alpha=0.5),
        )
        for patch, color in zip(bp['boxes'], PALETTE[:len(scaled)]):
            patch.set_facecolor(color + '33')
            patch.set_edgecolor(color)
            patch.set_linewidth(1.4)

        ax_attr.set_xticks(range(1, len(tick_lbls) + 1))
        ax_attr.set_xticklabels(tick_lbls, rotation=22, ha='right',
                                fontsize=9, color=C_BODY)
        ax_attr.set_ylabel("Min-Max Normalised Value", fontsize=9, color=C_LABEL)
        ax_attr.yaxis.set_major_formatter(mticker.PercentFormatter(xmax=1))

    elif best_cat_col:
        _card(ax_attr, f"  Category Distribution — {best_cat_col.upper()}")
        ax_attr.set_axisbelow(True)
        cat_counts = (
            combined_gdf[best_cat_col].dropna()
            .value_counts().reset_index()
        )
        cat_counts.columns = [best_cat_col, 'count']
        cat_counts = cat_counts.sort_values('count', ascending=True).tail(10)
        y_c = np.arange(len(cat_counts))
        colors_c = PALETTE[:len(y_c)]
        ax_attr.barh(y_c, cat_counts['count'], color=colors_c,
                     edgecolor=C_BORDER, height=0.55, zorder=3)
        ax_attr.set_yticks(y_c)
        ax_attr.set_yticklabels(cat_counts[best_cat_col], fontsize=9, color=C_BODY)
        ax_attr.set_xlabel("Count", fontsize=9, color=C_LABEL)
        for bar in ax_attr.patches:
            w = bar.get_width()
            ax_attr.text(w + cat_counts['count'].max() * 0.01,
                         bar.get_y() + bar.get_height() / 2,
                         f"{int(w):,}", ha='left', va='center',
                         fontsize=8, fontweight='bold', color=C_ACCENT)
        ax_attr.margins(x=0.18)
    else:
        _card(ax_attr, "  Attribute Summary")
        ax_attr.text(0.5, 0.5, "No plottable numeric\nor categorical columns",
                     ha='center', va='center', fontsize=11,
                     color=C_MUTED, transform=ax_attr.transAxes)

    # ── save ─────────────────────────────────────────────────────────────────
    plt.savefig(output_path, dpi=150, facecolor=C_BG, bbox_inches='tight')
    plt.close()

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