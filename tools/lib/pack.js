export function deltaPack(indices) {
	const sorted = [...indices].sort((a, b) => a - b);
	const deltas = [];
	let prev = 0;
	for (const v of sorted) {
		deltas.push(v - prev);
		prev = v;
	}
	return deltas;
}

export function deltaUnpack(deltas) {
	const out = new Array(deltas.length);
	let acc = 0;
	for (let i = 0; i < deltas.length; i++) {
		acc += deltas[i];
		out[i] = acc;
	}
	return out;
}
