import {
    generateDistrictColor,
    getDistrictColor,
    resetDistrictColors,
    getDistrictColorCache
} from '../districtColors';

describe('districtColors.js', () => {
    beforeEach(() => {
        resetDistrictColors();
    });

    describe('generateDistrictColor', () => {
        it('should generate an hsl color string based on seed', () => {
            const color0 = generateDistrictColor(0);
            expect(color0).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
            
            const color1 = generateDistrictColor(1);
            expect(color1).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
            
            expect(color0).not.toBe(color1); // Colors should differ for different seeds
        });
    });

    describe('getDistrictColor', () => {
        it('should return gray for null or undefined district', () => {
            expect(getDistrictColor()).toBe('#6B7280');
            expect(getDistrictColor(null)).toBe('#6B7280');
        });

        it('should assign a color to a new district and cache it', () => {
            const colorA = getDistrictColor('District A');
            expect(colorA).toMatch(/^hsl/);
            
            // Should return same color from cache
            const colorA_cached = getDistrictColor('District A');
            expect(colorA_cached).toBe(colorA);
        });

        it('should assign different colors to different districts sequentially', () => {
            const colorA = getDistrictColor('District A');
            const colorB = getDistrictColor('District B');
            
            expect(colorA).not.toBe(colorB);
            
            const cache = getDistrictColorCache();
            expect(cache.size).toBe(2);
            expect(cache.get('District A')).toBe(colorA);
            expect(cache.get('District B')).toBe(colorB);
        });
    });

    describe('resetDistrictColors', () => {
        it('should clear the cache and reset the index', () => {
            const colorA1 = getDistrictColor('District A');
            expect(getDistrictColorCache().size).toBe(1);
            
            resetDistrictColors();
            
            expect(getDistrictColorCache().size).toBe(0);
            
            const colorA2 = getDistrictColor('District A');
            // Since index was reset, District A should get the color that corresponds to index 0 again,
            // which means colorA1 should equal colorA2.
            expect(colorA2).toBe(colorA1);
        });
    });
});
