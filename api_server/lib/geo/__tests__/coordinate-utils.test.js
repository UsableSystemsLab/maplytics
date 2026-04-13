import {
    LAT_FIELD_NAMES,
    LNG_FIELD_NAMES,
    isLatField,
    isLngField,
    isCoordinateField,
    extractLatitude,
    extractLongitude,
    validateCoordinates,
    removeCoordinateFields,
} from '../coordinate-utils.js';

describe('isLatField', () => {
    it.each(LAT_FIELD_NAMES)('recognizes "%s" as a latitude field', (name) => {
        expect(isLatField(name)).toBe(true);
    });

    it('rejects non-latitude names', () => {
        expect(isLatField('longitude')).toBe(false);
        expect(isLatField('name')).toBe(false);
        expect(isLatField('LATITUDE')).toBe(false);
    });
});

describe('isLngField', () => {
    it.each(LNG_FIELD_NAMES)('recognizes "%s" as a longitude field', (name) => {
        expect(isLngField(name)).toBe(true);
    });

    it('rejects non-longitude names', () => {
        expect(isLngField('latitude')).toBe(false);
        expect(isLngField('name')).toBe(false);
        expect(isLngField('LONGITUDE')).toBe(false);
    });
});

describe('isCoordinateField', () => {
    it('returns true for any lat or lng variant', () => {
        expect(isCoordinateField('lat')).toBe(true);
        expect(isCoordinateField('longitude')).toBe(true);
        expect(isCoordinateField('Y')).toBe(true);
        expect(isCoordinateField('X')).toBe(true);
    });

    it('returns false for non-coordinate fields', () => {
        expect(isCoordinateField('name')).toBe(false);
        expect(isCoordinateField('address')).toBe(false);
    });
});

describe('extractLatitude', () => {
    it('extracts from "latitude" field', () => {
        expect(extractLatitude({ latitude: 40.7 })).toBe(40.7);
    });

    it('extracts from "lat" field', () => {
        expect(extractLatitude({ lat: 40.7 })).toBe(40.7);
    });

    it('extracts from "Lat" field', () => {
        expect(extractLatitude({ Lat: 40.7 })).toBe(40.7);
    });

    it('extracts from "LAT" field', () => {
        expect(extractLatitude({ LAT: 40.7 })).toBe(40.7);
    });

    it('extracts from "Y" field', () => {
        expect(extractLatitude({ Y: 40.7 })).toBe(40.7);
    });

    it('extracts from "y" field', () => {
        expect(extractLatitude({ y: 40.7 })).toBe(40.7);
    });

    it('returns null when no latitude field exists', () => {
        expect(extractLatitude({ name: 'test' })).toBeNull();
    });

    it('prefers "latitude" over "lat" when both exist', () => {
        expect(extractLatitude({ latitude: 1, lat: 2 })).toBe(1);
    });
});

describe('extractLongitude', () => {
    it('extracts from "longitude" field', () => {
        expect(extractLongitude({ longitude: -74 })).toBe(-74);
    });

    it('extracts from "lng" field', () => {
        expect(extractLongitude({ lng: -74 })).toBe(-74);
    });

    it('extracts from "lon" field', () => {
        expect(extractLongitude({ lon: -74 })).toBe(-74);
    });

    it('extracts from "X" field', () => {
        expect(extractLongitude({ X: -74 })).toBe(-74);
    });

    it('extracts from "x" field', () => {
        expect(extractLongitude({ x: -74 })).toBe(-74);
    });

    it('returns null when no longitude field exists', () => {
        expect(extractLongitude({ name: 'test' })).toBeNull();
    });
});

describe('validateCoordinates', () => {
    it('returns true for valid coordinates', () => {
        expect(validateCoordinates(40.7, -74)).toBe(true);
    });

    it('returns true for boundary values', () => {
        expect(validateCoordinates(90, 180)).toBe(true);
        expect(validateCoordinates(-90, -180)).toBe(true);
        expect(validateCoordinates(0, 0)).toBe(true);
    });

    it('returns false when lat is out of range', () => {
        expect(validateCoordinates(91, 0)).toBe(false);
        expect(validateCoordinates(-91, 0)).toBe(false);
    });

    it('returns false when lng is out of range', () => {
        expect(validateCoordinates(0, 181)).toBe(false);
        expect(validateCoordinates(0, -181)).toBe(false);
    });

    it('returns false for null inputs', () => {
        expect(validateCoordinates(null, -74)).toBe(false);
        expect(validateCoordinates(40, null)).toBe(false);
        expect(validateCoordinates(null, null)).toBe(false);
    });

    it('returns false for undefined inputs', () => {
        expect(validateCoordinates(undefined, -74)).toBe(false);
        expect(validateCoordinates(40, undefined)).toBe(false);
    });

    it('returns false for NaN strings', () => {
        expect(validateCoordinates('abc', 0)).toBe(false);
        expect(validateCoordinates(0, 'xyz')).toBe(false);
    });

    it('returns true for string numbers (coercion)', () => {
        expect(validateCoordinates('40.7', '-74')).toBe(true);
    });
});

describe('removeCoordinateFields', () => {
    it('removes all lat/lng field variants', () => {
        const obj = { name: 'Park', latitude: 40, longitude: -74, lat: 40, lng: -74 };
        const result = removeCoordinateFields(obj);

        expect(result).toEqual({ name: 'Park' });
    });

    it('removes the geometry key', () => {
        const obj = { name: 'Park', geometry: { type: 'Point' } };
        const result = removeCoordinateFields(obj);

        expect(result).toEqual({ name: 'Park' });
    });

    it('preserves non-coordinate fields', () => {
        const obj = { name: 'Park', category: 'nature', rating: 4.5 };
        const result = removeCoordinateFields(obj);

        expect(result).toEqual({ name: 'Park', category: 'nature', rating: 4.5 });
    });

    it('returns empty object when all fields are coordinate fields', () => {
        const obj = { latitude: 40, longitude: -74 };
        expect(removeCoordinateFields(obj)).toEqual({});
    });
});
