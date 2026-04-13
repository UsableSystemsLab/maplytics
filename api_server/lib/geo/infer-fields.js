export const inferFields = (geojson) => {
    const fields = [];
    if (!geojson.features || geojson.features.length === 0) return fields;

    const keySet = new Set();
    geojson.features.forEach(f => {
        if (f.properties) {
            Object.keys(f.properties).forEach(k => keySet.add(k));
        }
    });

    keySet.forEach(key => {
        const values = geojson.features
            .map(f => f.properties?.[key])
            .filter(v => v !== undefined && v !== null && v !== '');

        const allNumbers = values.length > 0 && values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && typeof v !== 'boolean'));
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
};
