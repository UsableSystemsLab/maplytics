const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Maplytics-POI-Collector/1.0";
const BATCH_LIMIT = 50;
const RATE_LIMIT_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(poiType, locationParts) {
  const location = locationParts.filter(Boolean).join(", ");
  return location ? `${poiType} in ${location}` : poiType;
}

export async function fetchAllPois(poiType, locationParts, { onBatch } = {}) {
  const query = buildQuery(poiType, locationParts);
  const allResults = [];
  const seenPlaceIds = [];
  let batchNumber = 0;

  while (true) {
    batchNumber++;

    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: String(BATCH_LIMIT),
    });

    if (seenPlaceIds.length > 0) {
      params.set("exclude_place_ids", seenPlaceIds.join(","));
    }

    const url = `${NOMINATIM_BASE}?${params}`;

    let response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
    } catch (err) {
      throw new Error(`Network error querying Nominatim: ${err.message}`);
    }

    if (response.status === 414) {
      console.warn(
        `Pagination stopped: URL exceeded server limit after ${allResults.length} results ` +
        `(${seenPlaceIds.length} excluded place IDs). Returning collected results.`
      );
      break;
    } else if (response.status === 429) {
      await sleep(2000);
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) {
        throw new Error(`Nominatim API error after retry: ${response.status} ${response.statusText}`);
      }
    } else if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      seenPlaceIds.push(item.place_id);
    }
    allResults.push(...batch);

    if (onBatch) {
      onBatch(batchNumber, batch.length, allResults.length);
    }

    if (batch.length < BATCH_LIMIT) {
      break;
    }

    await sleep(RATE_LIMIT_MS);
  }

  return allResults;
}
