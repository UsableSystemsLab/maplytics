function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(poiType, locationParts) {
  const location = locationParts.filter(Boolean).join(", ");
  return location ? `${poiType} in ${location}` : poiType;
}

export async function fetchAllPois(poiType, locationParts, { onBatch } = {}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY environment variable is required for Google Maps API.");
  }

  const query = buildQuery(poiType, locationParts);
  const allResults = [];
  let batchNumber = 0;
  let pageToken = null;

  while (true) {
    batchNumber++;

    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    if (pageToken) {
      url.searchParams.set("pagetoken", pageToken);
    } else {
      url.searchParams.set("query", query);
    }
    url.searchParams.set("key", apiKey);

    let response;
    let retries = 3;
    while (retries > 0) {
      response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === "INVALID_REQUEST" && pageToken) {
        retries--;
        await sleep(2000);
        continue;
      }
      
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Maps API returned status: ${data.status}`);
      }
      
      const batch = data.results || [];
      
      const mappedBatch = batch.map(place => ({
        name: place.name,
        display_name: place.formatted_address,
        type: place.types && place.types.length > 0 ? place.types[0] : "",
        lat: place.geometry?.location?.lat || "",
        lon: place.geometry?.location?.lng || "",
        place_id: place.place_id,
        address: {
          country: locationParts[locationParts.length - 1] || "",
          city: locationParts.length > 2 ? locationParts[1] : (locationParts[0] !== locationParts[locationParts.length - 1] ? locationParts[0] : "")
        }
      }));

      allResults.push(...mappedBatch);

      if (onBatch) {
        onBatch(batchNumber, mappedBatch.length, allResults.length);
      }

      pageToken = data.next_page_token;
      break;
    }

    if (!pageToken) {
      break;
    }

    await sleep(2000);
  }

  return allResults;
}
