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
 * @param {number[]} values - array of numeric values (counts)
 * @param {string} schemeName - key from COLOR_SCHEMES
 * @param {number} steps - number of discrete color steps (default 7)
 * @returns {{ getColor, domain, breaks, range }}
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

    // Legend breaks
    const breaks = [];
    for (let i = 0; i < 5; i++) {
        breaks.push(domainMin + ((domainMax - domainMin) * i) / 4);
    }

    return {
        getColor: (v) => scale(v).hex(),
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
 * @param {{ getColor: Function, breaks: number[] }} scaleResult
 * @returns {Array<{ color: string, rangeLabel: string }>}
 */
export function getLegendEntries(scaleResult) {
    if (!scaleResult?.breaks) return [];

    const { getColor, breaks } = scaleResult;
    const entries = [];

    for (let i = 0; i < breaks.length - 1; i++) {
        const midVal = (breaks[i] + breaks[i + 1]) / 2;
        entries.push({
            color: getColor(midVal),
            rangeLabel: `${Math.round(breaks[i])} - ${Math.round(breaks[i + 1])}`,
        });
    }

    entries.push({
        color: getColor(breaks[breaks.length - 1]),
        rangeLabel: `${Math.round(breaks[breaks.length - 1])}+`,
    });

    return entries;
}
