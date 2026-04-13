import { parseArgs } from "node:util";
import { fetchAllPois as fetchNominatim } from "./lib/nominatim.js";
import { fetchAllPois as fetchGoogle } from "./lib/google-maps.js";
import { toCsv } from "./lib/csv.js";
import { uploadToS3 } from "./lib/storage.js";

const USAGE = `
Usage: node cli/collect-pois.js [options]

Options:
  --poi,      -p   POI type (required, e.g. "restaurant")
  --country,  -c   Country name (required)
  --region,   -r   Region or state (optional)
  --city           City name (optional)
  --district, -d   District name (optional)
  --api,      -a   API to use: "nominatim" (default) or "google"
  --help,     -h   Show this help message
`.trim();

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let args;
try {
  ({ values: args } = parseArgs({
    options: {
      poi: { type: "string", short: "p" },
      country: { type: "string", short: "c" },
      region: { type: "string", short: "r" },
      city: { type: "string" },
      district: { type: "string", short: "d" },
      api: { type: "string", short: "a", default: "nominatim" },
      help: { type: "boolean", short: "h" },
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

if (!args.poi || !args.country) {
  console.error("Error: --poi and --country are required.\n");
  console.error(USAGE);
  process.exit(1);
}

const locationParts = [args.district, args.city, args.region, args.country].filter(Boolean);

console.log(`Searching for "${args.poi}" in ${locationParts.join(", ")} using ${args.api} API...`);

const fetchPois = args.api === "google" ? fetchGoogle : fetchNominatim;

const results = await fetchPois(args.poi, locationParts, {
  onBatch(batchNumber, batchSize, totalSoFar) {
    console.log(`  Batch ${batchNumber}: ${batchSize} results (${totalSoFar} total)`);
  },
});

if (results.length === 0) {
  console.warn("Warning: No results found.");
  process.exit(0);
}

console.log(`Found ${results.length} POIs. Generating CSV...`);
const csvContent = toCsv(results);

const keyParts = [args.poi, args.country, args.city].filter(Boolean).map(slugify);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const s3Key = `poi-datasets/${keyParts.join("-")}-${timestamp}.csv`;

console.log(`Uploading to S3 as "${s3Key}"...`);
const { bucket, key } = await uploadToS3(csvContent, s3Key);

console.log(`Done! ${results.length} POIs uploaded to ${bucket}/${key}`);
