export function parseCsv(text) {
	let input = text;
	if (input.charCodeAt(0) === 0xfe_ff) {
		input = input.slice(1);
	}

	const rows = [];
	let row = [];
	let field = "";
	let inQuotes = false;
	let i = 0;
	const n = input.length;

	while (i < n) {
		const c = input[i];

		if (inQuotes) {
			if (c === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i += 2;
				} else {
					inQuotes = false;
					i += 1;
				}
			} else {
				field += c;
				i += 1;
			}
			continue;
		}

		if (c === '"') {
			inQuotes = true;
			i += 1;
		} else if (c === ",") {
			row.push(field);
			field = "";
			i += 1;
		} else if (c === "\r") {
			i += 1;
		} else if (c === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
			i += 1;
		} else {
			field += c;
			i += 1;
		}
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}

export function parseCsvObjects(text) {
	const rows = parseCsv(text);
	if (rows.length === 0) {
		return [];
	}
	const header = rows[0].map((h) => h.trim());
	const out = [];
	for (let r = 1; r < rows.length; r += 1) {
		const cells = rows[r];
		if (cells.length === 1 && cells[0] === "") {
			continue;
		}
		const obj = {};
		for (let c = 0; c < header.length; c += 1) {
			obj[header[c]] = cells[c] ?? "";
		}
		out.push(obj);
	}
	return out;
}
