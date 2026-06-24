export function fnv1a(str) {
	let h = 0x81_1c_9d_c5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01_00_01_93);
	}
	return h >>> 0;
}
