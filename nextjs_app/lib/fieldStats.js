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
