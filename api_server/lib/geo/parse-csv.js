export const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const parseRow = (row) => {
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        fields.push(current.trim());
        return fields;
    };

    const headers = parseRow(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseRow(lines[i]);
        const obj = {};
        headers.forEach((h, idx) => {
            let val = values[idx] ?? '';
            if (val !== '' && !isNaN(Number(val))) {
                val = Number(val);
            }
            obj[h] = val;
        });
        rows.push(obj);
    }
    return rows;
};
