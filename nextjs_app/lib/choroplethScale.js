import chroma from 'chroma-js';

export const COLOR_SCHEMES = {
    YlOrRd: 'YlOrRd',
    Blues: 'Blues',
    Greens: 'Greens',
    OrRd: 'OrRd',
    Purples: 'Purples',
    YlGnBu: 'YlGnBu',
    Viridis: 'Viridis',
};

/**
 * Create a sequential color scale for choropleth mapping.
 *
 * Builds 4 integer-aligned buckets so that every count in the same labeled
 * range always receives exactly the same color (no continuous drift).
 *
 * @param {number[]} values - array of numeric values (counts)
 * @param {string} schemeName - key from COLOR_SCHEMES
 * @param {number} steps - number of discrete color steps for Vega-Lite range (default 7)
 * @returns {{ getColor, getQuantizedColor, buckets, domain, breaks, range }}
 */
export function createChoroplethScale(values, schemeName = 'Blues', steps = 7) {
    const palette = COLOR_SCHEMES[schemeName] || 'YlOrRd';

    let max = 0;
    for (let i = 0; i < values.length; i++) {
        if (values[i] > max) max = values[i];
    }

    const domainMin = 0;
    const domainMax = max === 0 ? 1 : max;

    const scale = chroma.scale(palette).domain([domainMin, domainMax]);

    // Generate discrete color range for Vega-Lite
    const range = [];
    for (let i = 0; i < steps; i++) {
        range.push(scale(domainMin + ((domainMax - domainMin) * i) / (steps - 1)).hex());
    }

    // 5 evenly-spaced break points → 4 intervals
    const breaks = [];
    for (let i = 0; i < 5; i++) {
        breaks.push(domainMin + ((domainMax - domainMin) * i) / 4);
    }

    // Integer-aligned buckets: every integer count in [lo, hi] shares one color.
    // lo of bucket 0 is always 1 (0 is rendered separately as "no data").
    // lo of subsequent buckets = floor(previous break) + 1.
    // hi of all but the last = floor(next break).
    // hi of the last bucket = Infinity (shown as "X+").
    const numBuckets = breaks.length - 1; // 4
    const buckets = [];
    for (let i = 0; i < numBuckets; i++) {
        const lo = i === 0 ? 1 : Math.floor(breaks[i]) + 1;
        const hi = i === numBuckets - 1 ? Infinity : Math.floor(breaks[i + 1]);
        const midVal = (breaks[i] + breaks[i + 1]) / 2;
        buckets.push({ lo, hi, color: scale(midVal).hex() });
    }

    // Quantized lookup: all counts in the same bucket get identical color.
    const getQuantizedColor = (v) => {
        for (const b of buckets) {
            if (v <= b.hi) return b.color;
        }
        return buckets[buckets.length - 1].color;
    };

    return {
        getColor: (v) => scale(v).hex(),
        getQuantizedColor,
        buckets,
        domain: [domainMin, domainMax],
        breaks,
        range,
    };
}

/**
 * Generate a Chroma color range array for a given scheme.
 * Useful for passing directly to Vega-Lite scale.range.
 * @param {string} schemeName - key from COLOR_SCHEMES
 * @param {number} steps - number of colors
 * @returns {string[]} array of hex color strings
 */
export function getColorRange(schemeName = 'Blues', steps = 7) {
    const palette = COLOR_SCHEMES[schemeName] || 'YlOrRd';
    return chroma.scale(palette).colors(steps);
}

/**
 * Generate legend entries from a choropleth scale result.
 * Uses the pre-computed integer-aligned buckets so labels always match colors.
 * @param {{ buckets: Array<{lo,hi,color}> }} scaleResult
 * @returns {Array<{ color: string, rangeLabel: string }>}
 */
export function getLegendEntries(scaleResult) {
    if (!scaleResult?.buckets) return [];

    return scaleResult.buckets.map(({ lo, hi, color }) => {
        let rangeLabel;
        if (hi === Infinity) {
            rangeLabel = `${lo}+`;
        } else if (lo === hi) {
            rangeLabel = `${lo}`;
        } else {
            rangeLabel = `${lo} - ${hi}`;
        }
        return { color, rangeLabel };
    });
}
