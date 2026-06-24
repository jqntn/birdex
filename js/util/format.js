export const normSci = (s) =>
	String(s).toLowerCase().trim().replace(/\s+/g, " ");

const MONTHS = {
	jan: 0,
	feb: 1,
	mar: 2,
	apr: 3,
	may: 4,
	jun: 5,
	jul: 6,
	aug: 7,
	sep: 8,
	oct: 9,
	nov: 10,
	dec: 11,
};
export function parseEbirdDate(s) {
	if (!s) {
		return null;
	}
	const str = String(s).trim();
	const p = (n) => String(n).padStart(2, "0");

	const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) {
		const y = Number(iso[1]);
		const mon = Number(iso[2]) - 1;
		const d = Number(iso[3]);
		if (mon < 0 || mon > 11) {
			return null;
		}
		return { y, m: mon, d, iso: `${y}-${p(mon + 1)}-${p(d)}` };
	}

	const m = str.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
	if (!m) {
		return null;
	}
	const day = Number(m[1]);
	const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
	const year = Number(m[3]);
	if (mon == null) {
		return null;
	}
	return { y: year, m: mon, d: day, iso: `${year}-${p(mon + 1)}-${p(day)}` };
}

export const countryOf = (sp) => {
	if (!sp) {
		return null;
	}
	const c = String(sp).trim().split("-")[0];
	return c.length === 2 ? c.toUpperCase() : c || null;
};

export const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

export function flagEmoji(cc) {
	if (cc?.length !== 2) {
		return "🏳️";
	}
	const base = 0x1_f1_e6;
	return String.fromCodePoint(
		base + (cc.charCodeAt(0) - 65),
		base + (cc.charCodeAt(1) - 65),
	);
}

export const fmtDate = (iso, locale = "fr") => {
	if (!iso) {
		return "";
	}
	const d = new Date(`${iso}T00:00:00`);
	return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};
