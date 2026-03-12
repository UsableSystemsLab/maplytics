// Extract field type.. and statistics computation.


/**
 * Determine field names, types, and metadata from an array of property objects.
**/
export function inferFieldTypes(propertiesList) {
    if (!propertiesList || propertiesList.length === 0) return [];

    const keySet = new Set();
    for (const props of propertiesList) {
        if (props && typeof props === 'object') {
            Object.keys(props).forEach(k => keySet.add(k));
        }
    }

    const fields = [];

    keySet.forEach(key => {
        const values = propertiesList
            .map(p => p?.[key])
            .filter(v => v !== undefined && v !== null && v !== '');

        const allNumbers = values.length > 0 &&
            values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && typeof v !== 'boolean'));

        const type = allNumbers ? 'number' : 'string';
        const field = { name: key, type };

        if (type === 'string') {
            const unique = [...new Set(values.map(String))];
            if (unique.length <= 100) {
                field.values = unique;
            }
        } else {
            const nums = values.map(Number);
            field.min = Math.min(...nums);
            field.max = Math.max(...nums);
        }

        fields.push(field);
    });

    return fields;
}

/**
 * Compute per-field statistics from an array of property objects and field definitions.
**/
export function computeFieldStats(propertiesList, fields) {
    const stats = {};

    for (const field of fields) {
        if (field.type === 'string') {
            const counts = {};
            for (const props of propertiesList) {
                const val = String(props?.[field.name] ?? 'Unknown');
                counts[val] = (counts[val] || 0) + 1;
            }

            const total = propertiesList.length;
            stats[field.name] = {
                type: 'string',
                breakdown: Object.entries(counts)
                    .map(([category, count]) => ({
                        category,
                        count,
                        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
                    }))
                    .sort((a, b) => b.count - a.count),
            };
        } else {
            const values = propertiesList
                .map(p => Number(p?.[field.name]))
                .filter(v => !isNaN(v));

            if (values.length > 0) {
                const sum = values.reduce((s, v) => s + v, 0);
                stats[field.name] = {
                    type: 'number',
                    count: values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: Math.round((sum / values.length) * 100) / 100,
                    sum,
                };
            } else {
                stats[field.name] = { type: 'number', count: 0 };
            }
        }
    }

    return stats;
}
