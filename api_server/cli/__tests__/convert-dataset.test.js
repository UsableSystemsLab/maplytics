import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'convert-dataset.js');
const FIXTURES = join(__dirname, 'fixtures');

const run = (args = []) => {
    return new Promise((resolve) => {
        execFile('node', [CLI_PATH, ...args], { timeout: 10000 }, (error, stdout, stderr) => {
            resolve({
                exitCode: error ? error.code ?? 1 : 0,
                stdout,
                stderr,
            });
        });
    });
};

describe('convert-dataset CLI', () => {
    it('converts a basic CSV to valid GeoJSON output', async () => {
        const { exitCode, stdout } = await run(['-i', join(FIXTURES, 'basic.csv'), '-q']);

        expect(exitCode).toBe(0);
        const output = JSON.parse(stdout);
        expect(output).toHaveProperty('geojson');
        expect(output).toHaveProperty('fields');
        expect(output.geojson.type).toBe('FeatureCollection');
        expect(output.geojson.features).toHaveLength(3);
    });

    it('handles quoted CSV fields correctly', async () => {
        const { exitCode, stdout } = await run(['-i', join(FIXTURES, 'quoted.csv'), '-q']);

        expect(exitCode).toBe(0);
        const output = JSON.parse(stdout);
        expect(output.geojson.features).toHaveLength(2);

        const descriptions = output.geojson.features.map(f => f.properties.description);
        expect(descriptions[0]).toContain(',');
    });

    it('handles various coordinate field name variants', async () => {
        const { exitCode, stdout } = await run(['-i', join(FIXTURES, 'various-coords.csv'), '-q']);

        expect(exitCode).toBe(0);
        const output = JSON.parse(stdout);
        expect(output.geojson.features).toHaveLength(2);
        // Coordinates should be valid numbers
        output.geojson.features.forEach(f => {
            expect(f.geometry.type).toBe('Point');
            expect(f.geometry.coordinates).toHaveLength(2);
            expect(typeof f.geometry.coordinates[0]).toBe('number');
            expect(typeof f.geometry.coordinates[1]).toBe('number');
        });
    });

    it('writes output to a file with --output flag', async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), 'convert-test-'));
        const outPath = join(tmpDir, 'output.json');

        try {
            const { exitCode } = await run(['-i', join(FIXTURES, 'basic.csv'), '-o', outPath, '-q']);

            expect(exitCode).toBe(0);
            const content = readFileSync(outPath, 'utf-8');
            const output = JSON.parse(content);
            expect(output.geojson.features).toHaveLength(3);
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('uses --name flag for dataset name', async () => {
        const { exitCode, stderr } = await run(['-i', join(FIXTURES, 'basic.csv'), '-n', 'My Dataset']);

        expect(exitCode).toBe(0);
        // The name appears in stderr log output (not suppressed with -q)
        expect(stderr).toBeTruthy();
    });

    it('shows help with --help flag', async () => {
        const { exitCode, stdout } = await run(['--help']);

        expect(exitCode).toBe(0);
        expect(stdout).toContain('Usage:');
        expect(stdout).toContain('--input');
    });

    it('exits with error when no input is provided', async () => {
        const { exitCode, stderr } = await run([]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain('--input');
    });

    it('exits with error for unsupported file extension', async () => {
        const { exitCode, stderr } = await run(['-i', join(FIXTURES, 'unsupported.xml')]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain('Unsupported');
    });

    it('exits with error for non-existent file', async () => {
        const { exitCode, stderr } = await run(['-i', '/nonexistent/path/data.csv']);

        expect(exitCode).toBe(1);
        expect(stderr).toContain('not found');
    });

    it('exits with error for empty CSV (header only)', async () => {
        const { exitCode, stderr } = await run(['-i', join(FIXTURES, 'empty.csv'), '-q']);

        expect(exitCode).toBe(1);
        expect(stderr).toContain('empty');
    });

    it('produces fields with correct types in output', async () => {
        const { stdout } = await run(['-i', join(FIXTURES, 'basic.csv'), '-q']);
        const output = JSON.parse(stdout);

        const categoryField = output.fields.find(f => f.name === 'category');
        expect(categoryField).toBeDefined();
        expect(categoryField.type).toBe('string');
        expect(categoryField.values).toContain('park');
    });
});
