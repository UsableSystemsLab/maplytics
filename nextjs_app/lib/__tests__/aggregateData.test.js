import {
    bufferPoint,
    bufferLine,
    computeConvexHull,
    aggregateByField,
    aggregateToGrid,
    pointInPolygon,
    pointInGeometry,
    countPointsInBoundaries
} from '../aggregateData';

describe('aggregateData.js', () => {
    describe('bufferPoint', () => {
        it('should return a polygon ring with the specified number of segments', () => {
            const ring = bufferPoint([39.0, 21.0], 500, 32);
            expect(ring.length).toBe(33); // 32 segments + closing point
            // Check that the first and last points are roughly the same (closing ring)
            expect(ring[0][0]).toBeCloseTo(ring[32][0]);
            expect(ring[0][1]).toBeCloseTo(ring[32][1]);
        });
    });

    describe('bufferLine', () => {
        it('should return a rectangle polygon around the line', () => {
            const ring = bufferLine([39.0, 21.0], [39.1, 21.1], 500);
            expect(ring.length).toBe(5); // 4 corners + closing point
            expect(ring[0][0]).toBeCloseTo(ring[4][0]);
            expect(ring[0][1]).toBeCloseTo(ring[4][1]);
        });
    });

    describe('computeConvexHull', () => {
        it('should return null for less than 3 points', () => {
            expect(computeConvexHull([[1, 1], [2, 2]])).toBeNull();
        });

        it('should compute convex hull for valid points', () => {
            const points = [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]];
            const hull = computeConvexHull(points);
            expect(hull).not.toBeNull();
            expect(hull.length).toBeGreaterThanOrEqual(4); // At least 3 points + closing
            expect(hull[0]).toEqual(hull[hull.length - 1]);
        });

        it('should return null for collinear points', () => {
            const points = [[0, 0], [1, 1], [2, 2]];
            expect(computeConvexHull(points)).toBeNull();
        });
    });

    describe('aggregateByField', () => {
        it('should handle empty or invalid inputs', () => {
            expect(aggregateByField([], 'type')).toEqual([]);
            expect(aggregateByField([{ geometry: { type: 'Point', coordinates: [0, 0] } }], null)).toEqual([]);
        });

        it('should group features by field and compute proper polygons', () => {
            const features = [
                { geometry: { type: 'Point', coordinates: [39.0, 21.0] }, properties: { type: 'school' } },
                { geometry: { type: 'Point', coordinates: [39.1, 21.1] }, properties: { type: 'school' } },
                { geometry: { type: 'Point', coordinates: [39.2, 21.2] }, properties: { type: 'school' } },
                { geometry: { type: 'Point', coordinates: [39.0, 21.0] }, properties: { type: 'hospital' } },
                { geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: { type: 'school' } } // Ignored
            ];

            const result = aggregateByField(features, 'type');
            expect(result.length).toBe(2);
            // Hospital should have count 1 (bufferPoint)
            const hospital = result.find(r => r.category === 'hospital');
            expect(hospital.count).toBe(1);
            expect(hospital.polygon.length).toBeGreaterThan(5); // Circle

            // School should have count 3 (convex hull or buffer)
            const school = result.find(r => r.category === 'school');
            expect(school.count).toBe(3);
        });

        it('should group 2 features and generate bufferLine', () => {
            const features = [
                { geometry: { type: 'Point', coordinates: [39.0, 21.0] }, properties: { type: 'park' } },
                { geometry: { type: 'Point', coordinates: [39.1, 21.1] }, properties: { type: 'park' } }
            ];

            const result = aggregateByField(features, 'type');
            expect(result[0].count).toBe(2);
            expect(result[0].polygon.length).toBe(5); // Rectangle
        });
    });

    describe('aggregateToGrid', () => {
        it('should handle empty inputs', () => {
            expect(aggregateToGrid([])).toEqual({ cells: [], rows: 0, cols: 0, maxCount: 0 });
        });

        it('should aggregate points into a grid', () => {
            const features = [
                { geometry: { type: 'Point', coordinates: [39.0, 21.0] } },
                { geometry: { type: 'Point', coordinates: [39.001, 21.001] } },
                { geometry: { type: 'Point', coordinates: [39.1, 21.1] } }
            ];

            const result = aggregateToGrid(features, 5); // 5km grid
            expect(result.cells.length).toBeGreaterThan(0);
            expect(result.maxCount).toBeGreaterThanOrEqual(1);
            expect(result.rows).toBeGreaterThan(0);
            expect(result.cols).toBeGreaterThan(0);
        });

        it('should handle too large area safely', () => {
            const features = [
                { geometry: { type: 'Point', coordinates: [0, 0] } },
                { geometry: { type: 'Point', coordinates: [100, 100] } }
            ];
            // 1km grid over 100 degrees will yield millions of cells, should bail out
            const result = aggregateToGrid(features, 1);
            expect(result).toEqual({ cells: [], rows: 0, cols: 0, maxCount: 0 });
        });
    });

    describe('pointInPolygon & pointInGeometry', () => {
        const ring = [[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]];

        it('should identify point inside polygon ring', () => {
            expect(pointInPolygon([1, 1], ring)).toBe(true);
            expect(pointInPolygon([3, 3], ring)).toBe(false);
        });

        it('should handle pointInGeometry for Polygon', () => {
            const geom = { type: 'Polygon', coordinates: [ring] };
            expect(pointInGeometry([1, 1], geom)).toBe(true);
            expect(pointInGeometry([3, 3], geom)).toBe(false);
        });

        it('should handle pointInGeometry for MultiPolygon', () => {
            const geom = { type: 'MultiPolygon', coordinates: [[ring]] };
            expect(pointInGeometry([1, 1], geom)).toBe(true);
            expect(pointInGeometry([3, 3], geom)).toBe(false);
        });

        it('should return false for unsupported geometry or null', () => {
            expect(pointInGeometry([1, 1], null)).toBe(false);
            expect(pointInGeometry([1, 1], { type: 'Point' })).toBe(false);
        });
    });

    describe('countPointsInBoundaries', () => {
        it('should return counts of points inside boundaries', () => {
            const points = [
                { geometry: { type: 'Point', coordinates: [1, 1] } },
                { geometry: { type: 'Point', coordinates: [1.5, 1.5] } },
                { geometry: { type: 'Point', coordinates: [5, 5] } }, // outside
            ];
            const boundaries = [
                {
                    properties: { name_en: 'Test District' },
                    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] }
                }
            ];

            const result = countPointsInBoundaries(points, boundaries);
            expect(result.length).toBe(1);
            expect(result[0].count).toBe(2);
            expect(result[0].name).toBe('Test District');
        });

        it('should handle missing properties gracefully', () => {
            const boundaries = [
                { geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] } }
            ];
            const result = countPointsInBoundaries([], boundaries);
            expect(result[0].name).toBe('Unknown');
        });

        it('should return empty array for invalid inputs', () => {
            expect(countPointsInBoundaries(null, [])).toEqual([]);
            expect(countPointsInBoundaries([], null)).toEqual([]);
        });
    });
});
