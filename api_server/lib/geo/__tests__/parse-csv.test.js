import { parseCSV } from '../parse-csv.js';

describe('parseCSV', () => {
    it('parses basic CSV into array of objects', () => {
        const csv = 'name,age\nAlice,30\nBob,25';
        const result = parseCSV(csv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Alice', age: 30 });
        expect(result[1]).toEqual({ name: 'Bob', age: 25 });
    });

    it('auto-converts numeric values to numbers', () => {
        const csv = 'val\n42\n3.14\n-7';
        const result = parseCSV(csv);

        expect(result[0].val).toBe(42);
        expect(result[1].val).toBe(3.14);
        expect(result[2].val).toBe(-7);
        result.forEach(row => expect(typeof row.val).toBe('number'));
    });

    it('preserves commas inside quoted fields', () => {
        const csv = 'name,desc\nAlice,"hello, world"';
        const result = parseCSV(csv);

        expect(result).toHaveLength(1);
        expect(result[0].desc).toBe('hello, world');
    });

    it('handles escaped quotes inside quoted fields', () => {
        const csv = 'a\n"say ""hi"""';
        const result = parseCSV(csv);

        expect(result).toHaveLength(1);
        expect(result[0].a).toBe('say hi');
    });

    it('returns empty array for header-only CSV', () => {
        const csv = 'name,age';
        expect(parseCSV(csv)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        expect(parseCSV('')).toEqual([]);
    });

    it('fills missing trailing values with empty string', () => {
        const csv = 'a,b,c\n1,2';
        const result = parseCSV(csv);

        expect(result).toHaveLength(1);
        expect(result[0].c).toBe('');
    });

    it('handles Windows line endings (\\r\\n)', () => {
        const csv = 'a,b\r\n1,2\r\n3,4';
        const result = parseCSV(csv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ a: 1, b: 2 });
        expect(result[1]).toEqual({ a: 3, b: 4 });
    });

    it('filters out blank lines', () => {
        const csv = 'a\n1\n\n2';
        const result = parseCSV(csv);

        expect(result).toHaveLength(2);
        expect(result[0].a).toBe(1);
        expect(result[1].a).toBe(2);
    });

    it('keeps non-numeric strings as strings', () => {
        const csv = 'name\nAlice\nBob';
        const result = parseCSV(csv);

        result.forEach(row => expect(typeof row.name).toBe('string'));
    });

    it('handles single data row', () => {
        const csv = 'x,y\n10,20';
        const result = parseCSV(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ x: 10, y: 20 });
    });
});
