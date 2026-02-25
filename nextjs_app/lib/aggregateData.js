/**
 * Aggregation utilities for GeoJSON features.
 * - aggregateToGrid: 1km² grid density choropleth (default)
 * - aggregateByField: groups by categorical field (for bar chart + future district mode)
 */

const DEG_PER_METER_LAT = 1 / 111320;
const degPerMeterLng = (lat) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));

/**
 * Generate a circle polygon around a center point.
 * @param {[number,number]} center - [lng, lat]
 * @param {number} radiusMeters
 * @param {number} segments
 * @returns {Array<[number,number]>} ring of [lng, lat] coordinates
 */
export function bufferPoint(center, radiusMeters = 500, segments = 32) {
    const [lng, lat] = center;
    const dLat = radiusMeters * DEG_PER_METER_LAT;
    const dLng = radiusMeters * degPerMeterLng(lat);
    const ring = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        ring.push([
            lng + dLng * Math.cos(angle),
            lat + dLat * Math.sin(angle),
        ]);
    }
    return ring;
}

/**
 * Generate a rectangle polygon buffering a line between two points.
 * @param {[number,number]} pointA - [lng, lat]
 * @param {[number,number]} pointB - [lng, lat]
 * @param {number} widthMeters
 * @returns {Array<[number,number]>} ring of [lng, lat] coordinates
 */
export function bufferLine(pointA, pointB, widthMeters = 500) {
    const [lngA, latA] = pointA;
    const [lngB, latB] = pointB;
    const halfW = widthMeters / 2;

    const dx = lngB - lngA;
    const dy = latB - latA;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-10;

    // Perpendicular unit vector in degree-space, scaled to meters
    const perpLatDeg = halfW * DEG_PER_METER_LAT;
    const midLat = (latA + latB) / 2;
    const perpLngDeg = halfW * degPerMeterLng(midLat);

    const nx = (-dy / len) * perpLngDeg;
    const ny = (dx / len) * perpLatDeg;

    return [
        [lngA + nx, latA + ny],
        [lngB + nx, latB + ny],
        [lngB - nx, latB - ny],
        [lngA - nx, latA - ny],
        [lngA + nx, latA + ny], // close ring
    ];
}

/**
 * Compute convex hull of 2D points using Andrew's monotone chain algorithm.
 * @param {Array<[number,number]>} points - array of [x, y]
 * @returns {Array<[number,number]>} convex hull as closed ring
 */
export function computeConvexHull(points) {
    if (points.length < 3) return null;

    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (O, A, B) =>
        (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);

    // Lower hull
    const lower = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
            lower.pop();
        lower.push(p);
    }

    // Upper hull
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
            upper.pop();
        upper.push(p);
    }

    // Remove last point of each half because it's repeated
    lower.pop();
    upper.pop();

    const hull = lower.concat(upper);
    // Close the ring
    hull.push(hull[0]);

    // Check for collinear (degenerate hull)
    if (hull.length < 4) return null; // need at least 3 distinct points + closing

    return hull;
}

/**
 * Aggregate GeoJSON point features by a categorical field.
 * Returns an array of groups with count, centroid, and polygon boundary.
 *
 * @param {Array} features - GeoJSON features
 * @param {string} categoryField - property name to group by
 * @returns {Array<{ category: string, count: number, centroid: [number,number], polygon: Array }>}
 */
export function aggregateByField(features, categoryField) {
    if (!features || !categoryField) return [];

    // Group features by category
    const groups = {};
    for (const feature of features) {
        if (feature.geometry?.type !== 'Point') continue;
        const cat = String(feature.properties?.[categoryField] ?? 'Unknown');
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(feature.geometry.coordinates); // [lng, lat]
    }

    const result = [];

    for (const [category, coords] of Object.entries(groups)) {
        const count = coords.length;

        // Centroid (mean of coordinates)
        const centroid = [
            coords.reduce((s, c) => s + c[0], 0) / count,
            coords.reduce((s, c) => s + c[1], 0) / count,
        ];

        let polygon;

        if (count === 1) {
            // Single point: buffer circle
            polygon = bufferPoint(coords[0], 500);
        } else if (count === 2) {
            // Two points: buffer rectangle
            polygon = bufferLine(coords[0], coords[1], 500);
        } else {
            // Try convex hull
            const hull = computeConvexHull(coords);
            if (hull) {
                polygon = hull;
            } else {
                // Collinear or degenerate: buffer around centroid using max distance
                const maxDist = Math.max(
                    ...coords.map(c => {
                        const dlat = (c[1] - centroid[1]) * 111320;
                        const dlng = (c[0] - centroid[0]) * 111320 * Math.cos((centroid[1] * Math.PI) / 180);
                        return Math.sqrt(dlat * dlat + dlng * dlng);
                    })
                );
                polygon = bufferPoint(centroid, Math.max(maxDist * 1.2, 500));
            }
        }

        result.push({ category, count, centroid, polygon });
    }

    // Sort by count descending
    result.sort((a, b) => b.count - a.count);

    return result;
}

/**
 * Aggregate GeoJSON point features into a uniform grid.
 * Every cell is returned (including empty ones) so the map shows
 * full coverage with faint color for 0-POI areas.
 *
 * @param {Array} features - GeoJSON features
 * @param {number} cellSizeKm - cell edge length in kilometres (default 1)
 * @returns {{ cells: Array<{ row, col, count, bounds }>, rows, cols, maxCount }}
 */
export function aggregateToGrid(features, cellSizeKm = 1) {
    if (!features || features.length === 0) return { cells: [], rows: 0, cols: 0, maxCount: 0 };

    // Extract point coordinates
    const points = [];
    for (const f of features) {
        if (f.geometry?.type === 'Point') {
            points.push(f.geometry.coordinates); // [lng, lat]
        }
    }
    if (points.length === 0) return { cells: [], rows: 0, cols: 0, maxCount: 0 };

    // Bounding box
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of points) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    // Cell size in degrees (at the centre latitude of the dataset)
    const centerLat = (minLat + maxLat) / 2;
    const cellLatDeg = (cellSizeKm * 1000) * DEG_PER_METER_LAT;
    const cellLngDeg = (cellSizeKm * 1000) * degPerMeterLng(centerLat);

    // Pad by one full cell so edge points aren't on the boundary
    minLng -= cellLngDeg;
    maxLng += cellLngDeg;
    minLat -= cellLatDeg;
    maxLat += cellLatDeg;

    const cols = Math.ceil((maxLng - minLng) / cellLngDeg);
    const rows = Math.ceil((maxLat - minLat) / cellLatDeg);

    // Safety cap — if the area is too large, bail out
    if (rows * cols > 10000) {
        return { cells: [], rows: 0, cols: 0, maxCount: 0 };
    }

    // Count points per cell
    const counts = new Uint32Array(rows * cols);
    for (const [lng, lat] of points) {
        const c = Math.floor((lng - minLng) / cellLngDeg);
        const r = Math.floor((lat - minLat) / cellLatDeg);
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
            counts[r * cols + c]++;
        }
    }

    let maxCount = 0;
    for (let i = 0; i < counts.length; i++) {
        if (counts[i] > maxCount) maxCount = counts[i];
    }

    // Build cell array — each cell has Leaflet-style bounds [[lat,lng],[lat,lng]]
    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const count = counts[r * cols + c];
            const cellMinLat = minLat + r * cellLatDeg;
            const cellMaxLat = cellMinLat + cellLatDeg;
            const cellMinLng = minLng + c * cellLngDeg;
            const cellMaxLng = cellMinLng + cellLngDeg;

            cells.push({
                row: r,
                col: c,
                count,
                bounds: [[cellMinLat, cellMinLng], [cellMaxLat, cellMaxLng]],
            });
        }
    }

    return { cells, rows, cols, maxCount };
}

/**
 * Ray-casting point-in-polygon test.
 * @param {[number,number]} point - [lng, lat]
 * @param {Array<[number,number]>} ring - outer ring of polygon coordinates
 * @returns {boolean}
 */
export function pointInPolygon(point, ring) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Test if a point falls inside any ring of a Polygon or MultiPolygon geometry.
 * @param {[number,number]} point - [lng, lat]
 * @param {object} geometry - GeoJSON geometry (Polygon or MultiPolygon)
 * @returns {boolean}
 */
function pointInGeometry(point, geometry) {
    if (!geometry) return false;

    if (geometry.type === 'Polygon') {
        return pointInPolygon(point, geometry.coordinates[0]);
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(poly => pointInPolygon(point, poly[0]));
    }

    return false;
}

/**
 * Count point features that fall inside each boundary polygon.
 * Supports both Polygon and MultiPolygon boundaries.
 * @param {Array} features - GeoJSON point features (the POIs)
 * @param {Array} boundaryFeatures - GeoJSON polygon features (districts/regions)
 * @returns {Array<{ name: string, count: number, feature: object }>}
 */
export function countPointsInBoundaries(features, boundaryFeatures) {
    if (!features || !boundaryFeatures) return [];

    // Extract point coords once
    const points = [];
    for (const f of features) {
        if (f.geometry?.type === 'Point') {
            points.push(f.geometry.coordinates); // [lng, lat]
        }
    }

    return boundaryFeatures.map(bf => {
        let count = 0;
        for (const pt of points) {
            if (pointInGeometry(pt, bf.geometry)) count++;
        }

        return {
            name: bf.properties?.name_en || bf.properties?.name_ar || 'Unknown',
            count,
            feature: bf,
        };
    });
}
