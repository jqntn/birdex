import { RARITY } from "../config.js";
import { hasPhoto, photoFallbackUrl, photoUrl } from "../data/media.js";
import { rarityTier } from "../data/rarity.js";
import { commonName, dexNumber } from "../data/taxonomy.js";
import { getLocale } from "../i18n.js";
import { el } from "../util/dom.js";

const EGG =
	"M36 8C47 8 55 24 55 37C55 46 47 53 36 53C25 53 17 46 17 37C17 24 25 8 36 8Z";

function silhouetteSvg() {
	return `<svg viewBox="0 0 72 60" class="sil" aria-hidden="true"><path d="${EGG}"/></svg>`;
}

const rarityId = (i) => RARITY[rarityTier(i)].id;

function card(i, { caught, isNew, shiny } = {}) {
	const rid = rarityId(i);
	const name = commonName(i, getLocale());
	const photo = hasPhoto(i);
	let caughtClass = "unseen";
	if (caught) {
		caughtClass = "caught";
	}
	let newClass = "";
	if (isNew) {
		newClass = " is-new";
	}
	let shinyClass = "";
	if (shiny) {
		shinyClass = " shiny";
	}
	let photoClass = "";
	if (photo) {
		photoClass = " has-photo";
	}
	const node = el("button", {
		class: `card r-${rid} ${caughtClass}${newClass}${shinyClass}${photoClass}`,
		dataset: { idx: i },
		type: "button",
	});
	let photoImg = "";
	if (photo) {
		photoImg = `<img class="card-photo" src="${photoUrl(i, 250)}" alt="" data-fb="${photoFallbackUrl(i, 250)}" onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.removeAttribute('data-fb')}else{this.remove()}">`;
	}
	node.innerHTML =
		`<span class="card-sil">${silhouetteSvg(i)}</span>` +
		photoImg +
		`<span class="card-num">#${String(dexNumber(i)).padStart(4, "0")}</span>` +
		`<span class="card-name">${escapeHtml(name)}</span>`;
	if (shiny) {
		node.insertAdjacentHTML("beforeend", '<span class="card-shiny">✦</span>');
	}
	if (isNew) {
		node.insertAdjacentHTML("beforeend", '<span class="card-new">NEW</span>');
	}
	return node;
}

function escapeHtml(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}

function progressBar(done, total, label) {
	let p = 0;
	if (total) {
		p = (done / total) * 100;
	}
	let labelEl = null;
	if (label) {
		labelEl = el("div", { class: "progress-label" }, label);
	}
	return el(
		"div",
		{ class: "progress" },
		labelEl,
		el(
			"div",
			{ class: "progress-track" },
			el("div", { class: "progress-fill", style: { width: `${p}%` } }),
		),
		el(
			"div",
			{ class: "progress-val" },
			`${done} / ${total} · ${Math.round(p * 10) / 10}%`,
		),
	);
}

export { card, progressBar, rarityId, silhouetteSvg };
