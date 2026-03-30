import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, accessSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import {
    parseCSV,
    buildGeoJSONFromObjects,
    inferFields,
    standardizeFieldNames,
    standardizeValues,
    deduplicateFeatures
} from "../lib/geo/index.js";
import { uploadGeoJSONToS3 } from "./lib/storage.js";

const USAGE = `
Usage: node cli/convert-dataset.js [options]

Converts CSV, JSON, or GeoJSON files into a standardized GeoJSON format.

Options:
  --input,   -i   Path to input file (required)
  --output,  -o   Path to output GeoJSON file (default: stdout)
  --upload        Upload result to S3
  --name,    -n   Dataset name (default: derived from filename)
  --help,    -h   Show this help message
`.trim();

function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function deriveDatasetName(filename) {
    return basename(filename, extname(filename))
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function log(msg) {
    if (!quiet) process.stderr.write(msg + "\n");
}

// Parse arguments
let args;
try {
    ({ values: args } = parseArgs({
        options: {
            input:  { type: "string",  short: "i" },
            output: { type: "string",  short: "o" },
            upload: { type: "boolean" },
            name:   { type: "string",  short: "n" },
            quiet:  { type: "boolean", short: "q" },
            help:   { type: "boolean", short: "h" },
        },
        strict: true,
    }));
} catch (err) {
    console.error(`Error: ${err.message}\n`);
    console.error(USAGE);
    process.exit(1);
}

if (args.help) {
    console.log(USAGE);
    process.exit(0);
}

const quiet = args.quiet ?? false;

if (!args.input) {
    console.error("Error: --input is required.\n");
    console.error(USAGE);
    process.exit(1);
}

try {
    accessSync(args.input);
} catch {
    console.error(`Error: File not found: ${args.input}`);
    process.exit(1);
}

// Read the file
const inputPath = args.input;
const fileSize = statSync(inputPath).size;
const datasetName = args.name || deriveDatasetName(inputPath);
const ext = extname(inputPath).toLowerCase().replace(".", "");

log(`Reading ${basename(inputPath)} (${formatBytes(fileSize)})...`);
const content = readFileSync(inputPath, "utf-8");

// Parse based on format
let items;

if (ext === "csv") {
    items = parseCSV(content);
    log(`Parsed ${items.length} rows with ${items.length > 0 ? Object.keys(items[0]).length : 0} columns`);
} else if (ext === "json" || ext === "geojson") {
    const parsed = JSON.parse(content);

    if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) {
        // Already GeoJSON — extract items from features for standardization
        items = parsed.features.map(f => {
            const coords = f.geometry?.coordinates;
            const props = f.properties || {};
            if (coords && f.geometry?.type === "Point") {
                return { ...props, longitude: coords[0], latitude: coords[1] };
            }
            return { ...props, geometry: f.geometry };
        });
        log(`Parsed GeoJSON with ${items.length} features`);
    } else if (Array.isArray(parsed)) {
        items = parsed;
        log(`Parsed JSON array with ${items.length} objects`);
    } else if (parsed.type === "Feature" && parsed.geometry) {
        const coords = parsed.geometry?.coordinates;
        const props = parsed.properties || {};
        if (coords && parsed.geometry?.type === "Point") {
            items = [{ ...props, longitude: coords[0], latitude: coords[1] }];
        } else {
            items = [{ ...props, geometry: parsed.geometry }];
        }
        log(`Parsed single GeoJSON Feature`);
    } else if (Array.isArray(parsed.data)) {
        items = parsed.data;
        log(`Parsed wrapped JSON with ${items.length} objects`);
    } else {
        items = [parsed];
        log(`Parsed single JSON object`);
    }
} else {
    console.error(`Error: Unsupported file format ".${ext}". Use .csv, .json, or .geojson`);
    process.exit(1);
}

if (items.length === 0) {
    console.error("Error: File is empty or has no data rows.");
    process.exit(1);
}

// Standardize field names
const { items: standardizedItems, renamedFields } = standardizeFieldNames(items);

if (Object.keys(renamedFields).length > 0) {
    const renames = Object.entries(renamedFields).map(([from, to]) => `${from} → ${to}`).join(", ");
    log(`Renamed fields: ${renames}`);
}

// Build GeoJSON
const geojson = buildGeoJSONFromObjects(standardizedItems);
const droppedCount = standardizedItems.length - geojson.features.length;

log(`Built GeoJSON: ${geojson.features.length} features${droppedCount > 0 ? ` (${droppedCount} rows dropped — invalid coordinates)` : ""}`);

if (geojson.features.length === 0) {
    console.error("Error: No valid coordinates found. Ensure your data has latitude/longitude columns.");
    process.exit(1);
}

// Standardize values
const { filledCount } = standardizeValues(geojson);
if (filledCount > 0) {
    log(`Standardized: ${filledCount} missing values filled as "Unknown"`);
}

// Deduplicate
const { duplicatesRemoved } = deduplicateFeatures(geojson);
if (duplicatesRemoved > 0) {
    log(`Dedup: removed ${duplicatesRemoved} duplicate features`);
}

// Infer fields
const fields = inferFields(geojson);
const fieldSummary = fields.map(f =>
    f.type === "string" ? `${f.name}(string, ${f.values?.length ?? "many"} values)` : `${f.name}(number, ${f.min}–${f.max})`
).join(", ");
log(`Fields: ${fieldSummary}`);
log(`Final: ${geojson.features.length} features, ${fields.length} fields`);

// Build output
const output = { geojson, fields };
const outputJSON = JSON.stringify(output, null, 2);

// Write output
if (args.output) {
    writeFileSync(args.output, outputJSON, "utf-8");
    log(`\nWritten to ${args.output} (${formatBytes(Buffer.byteLength(outputJSON))})`);
} else if (!args.upload) {
    // Default: stdout
    process.stdout.write(outputJSON + "\n");
}

// Upload to S3
if (args.upload) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const s3Key = `datasets/${slugify(datasetName)}-${timestamp}.geojson`;

    log(`Uploading to S3 as "${s3Key}"...`);
    const { bucket, key } = await uploadGeoJSONToS3(outputJSON, s3Key);
    log(`Uploaded to S3: ${bucket}/${key}`);
}

log("\nDone!");
