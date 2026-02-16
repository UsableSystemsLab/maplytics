const COLUMNS = [
  "name",
  "category",
  "address",
  "city",
  "country",
  "latitude",
  "longitude",
  "osm_id",
  "osm_type",
  "place_id",
];

function escapeField(value) {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mapResult(r) {
  const addr = r.address || {};
  return {
    name: r.name || (r.display_name ? r.display_name.split(",")[0].trim() : ""),
    category: r.type || "",
    address: r.display_name || "",
    city: addr.city || addr.town || addr.village || addr.municipality || "",
    country: addr.country || "",
    latitude: r.lat || "",
    longitude: r.lon || "",
    osm_id: r.osm_id || "",
    osm_type: r.osm_type || "",
    place_id: r.place_id || "",
  };
}

export function toCsv(results) {
  const header = COLUMNS.map(escapeField).join(",");
  const rows = results.map((r) => {
    const mapped = mapResult(r);
    return COLUMNS.map((col) => escapeField(mapped[col])).join(",");
  });
  return [header, ...rows].join("\n");
}
