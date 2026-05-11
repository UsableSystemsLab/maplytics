import { parseArgs } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const USAGE = `
Usage: node cli/overpass-cli.js [options]

Options:
  --poi,      -p   POI type (required, e.g. "restaurant")
  --country,  -c   Country name (required)
  --city           City name (optional)
  --district, -d   District name (optional)
  --help,     -h   Show this help message
`.trim();

let args;
try {
  ({ values: args } = parseArgs({
    options: {
      poi: { type: "string", short: "p" },
      country: { type: "string", short: "c" },
      city: { type: "string" },
      district: { type: "string", short: "d" },
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

async function run() {
  let areaQuery = `
(
  area["name"="${args.country}"];
  area["name:en"="${args.country}"];
  area["name:ar"="${args.country}"];
)->.country;
`;
  let searchArea = "area.country";

  if (args.city) {
    areaQuery += `
(
  area["name"="${args.city}"](area.country);
  area["name:en"="${args.city}"](area.country);
  area["name:ar"="${args.city}"](area.country);
)->.city;
`;
    searchArea = "area.city";
  }

  if (args.district) {
    areaQuery += `
(
  area["name"="${args.district}"](area.city);
  area["name:en"="${args.district}"](area.city);
  area["name:ar"="${args.district}"](area.city);
)->.district;
`;
    searchArea = "area.district";
  }

  const overpassQuery = `
[out:json][timeout:60];
${areaQuery}
(
  node["amenity"="${args.poi}"](${searchArea});
  way["amenity"="${args.poi}"](${searchArea});
  relation["amenity"="${args.poi}"](${searchArea});
  
  node["shop"="${args.poi}"](${searchArea});
  way["shop"="${args.poi}"](${searchArea});
  relation["shop"="${args.poi}"](${searchArea});
);
out body;
>;
out skel qt;
  `.trim();

  console.log("Generated Overpass Query:\n---------------------------");
  console.log(overpassQuery.trim());
  console.log("---------------------------\n");

  const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

  console.log("Fetching data from Overpass API (this might take a moment)...");
  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: "data=" + encodeURIComponent(overpassQuery),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "Maplytics/1.0 (internal tooling)"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Overpass API responded with status: ${response.status}\n${text}`);
    }

    const data = await response.json();

    console.log(`Found ${data.elements?.length || 0} elements.`);

    // Save to out folder relative to this script
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outDir = path.join(__dirname, "out");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let filenameParts = [args.country, args.city, args.district, args.poi, timestamp].filter(Boolean);
    const filename = filenameParts.join("_").replace(/\s+/g, "_") + ".json";

    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

    console.log(`Data saved successfully to ${outPath}`);

  } catch (err) {
    console.error("Error fetching data:", err.message);
    process.exit(1);
  }
}

run();
