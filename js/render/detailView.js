import { EBIRD_SPECIES_URL, RARITY } from "../config.js";
import { COUNTRY_NAMES } from "../data/continents.js";
import {
	containWidth,
	hasPhoto,
	photoCredit,
	photoFallbackUrl,
	photoUrl,
} from "../data/media.js";
import { rarityTier } from "../data/rarity.js";
import { regionName } from "../data/regions.js";
import {
	commonName,
	dexNumber,
	familyIdxOf,
	familyName,
	isExtinct,
	orderIdxOf,
	orderName,
	sciName,
	speciesCode,
} from "../data/taxonomy.js";
import { getLocale, t } from "../i18n.js";
import { state } from "../state.js";
import { clear, el } from "../util/dom.js";
import { flagEmoji, fmtDate } from "../util/format.js";
import { silhouetteSVG } from "./components.js";

const TRAILING_WS_RE = /\s+$/;

let overlay;
let box;
let lightbox;
let lightboxImg;

function mountDetail(rootParent) {
	overlay = el("div", {
		class: "overlay",
		id: "detail-overlay",
		style: { display: "none" },
	});
	box = el("div", { class: "detail-box" });
	overlay.append(box);
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) {
			close();
		}
	});

	lightbox = el("div", { class: "lightbox", style: { display: "none" } });
	lightboxImg = el("img", { class: "lightbox-img", alt: "" });
	lightbox.append(lightboxImg);
	lightbox.addEventListener("click", closeLightbox);
	lightboxImg.addEventListener("load", sizeLightbox);

	document.addEventListener("keydown", (e) => {
		if (e.key !== "Escape") {
			return;
		}
		if (lightbox.style.display !== "none") {
			closeLightbox();
		} else if (overlay.style.display !== "none") {
			close();
		}
	});
	window.addEventListener("resize", () => {
		if (overlay.style.display !== "none") {
			fitCreditAuthor();
		}
		if (lightbox.style.display !== "none") {
			sizeLightbox();
		}
	});
	rootParent.append(overlay, lightbox);
}

let measureCtx;
function fitCreditAuthor() {
	const credit = box?.querySelector(".detail-credit");
	const author = credit?.querySelector(".credit-author");
	if (!author?.dataset.full) {
		return;
	}
	const meta = credit.querySelector(".credit-meta");
	const { full } = author.dataset;
	const cs = getComputedStyle(author);
	measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
	measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
	let metaWidth = 0;
	if (meta) {
		metaWidth = meta.offsetWidth;
	}
	const avail = credit.clientWidth - metaWidth - 6;
	if (avail <= 0 || measureCtx.measureText(full).width <= avail) {
		author.textContent = full;
		return;
	}
	const ellW = measureCtx.measureText("…").width;
	let lo = 1;
	let hi = full.length;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (measureCtx.measureText(full.slice(0, mid)).width + ellW <= avail) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}
	author.textContent = `${full.slice(0, lo).replace(TRAILING_WS_RE, "")}…`;
}

function close() {
	if (lightbox.style.display !== "none") {
		closeLightbox();
	}
	overlay.style.display = "none";
	if (location.hash.startsWith("#/species/")) {
		history.back();
	}
}

function openLightbox(i, rid) {
	lightbox.className = `lightbox r-${rid}`;
	lightboxImg.src = photoUrl(i, 500);
	const full = new Image();
	full.onload = () => {
		if (lightbox.style.display !== "none") {
			lightboxImg.src = full.src;
		}
	};
	const fw = containWidth(i, 1280);
	let triedFallback = false;
	full.onerror = () => {
		if (triedFallback) {
			return;
		}
		triedFallback = true;
		full.src = photoFallbackUrl(i, fw);
	};
	full.src = photoUrl(i, fw);
	lightbox.style.display = "flex";
}

function sizeLightbox() {
	const w = lightboxImg.naturalWidth;
	const h = lightboxImg.naturalHeight;
	if (!(w && h)) {
		return;
	}
	const maxW = window.innerWidth * 0.92 - 6;
	const maxH = window.innerHeight * 0.92 - 6;
	let dw = maxW;
	let dh = (maxW * h) / w;
	if (dh > maxH) {
		dh = maxH;
		dw = (maxH * w) / h;
	}
	lightboxImg.style.width = `${Math.round(dw)}px`;
	lightboxImg.style.height = `${Math.round(dh)}px`;
}

function closeLightbox() {
	lightbox.style.display = "none";
	lightboxImg.removeAttribute("src");
	lightboxImg.style.width = "";
	lightboxImg.style.height = "";
}

function openDetail(i) {
	const rid = RARITY[rarityTier(i)].id;
	const sci = sciName(i);
	const caught = state.caughtSet.has(i);
	let rec = null;
	if (caught) {
		rec = state.save.species[speciesCode(i)];
	}
	const shiny = Boolean(rec?.shiny);

	clear(box);
	let shinyClass = "";
	if (shiny) {
		shinyClass = " shiny";
	}
	box.className = `detail-box r-${rid}${shinyClass}`;

	const media = el("div", { class: "detail-media" });
	media.innerHTML = `<div class="detail-sil">${silhouetteSVG()}</div>`;
	let credit = null;
	if (hasPhoto(i)) {
		const c = photoCredit(i);
		const meta = [c.license, "Wikimedia Commons"].filter(Boolean).join(" · ");
		let creditAuthor = null;
		if (c.by) {
			creditAuthor = el(
				"span",
				{ class: "credit-author", dataset: { full: `© ${c.by}` } },
				`© ${c.by}`,
			);
		}
		let creditMetaText = meta;
		if (c.by) {
			creditMetaText = ` · ${meta}`;
		}
		credit = el(
			"a",
			{
				class: "detail-credit",
				href: c.fileUrl,
				target: "_blank",
				rel: "noopener",
			},
			creditAuthor,
			el("span", { class: "credit-meta" }, creditMetaText),
		);
		const img = el("img", {
			class: "detail-photo",
			src: photoUrl(i, 500),
			alt: "",
			title: t("viewFull"),
		});
		let triedFallback = false;
		img.onerror = () => {
			if (triedFallback) {
				img.remove();
				media.classList.remove("has-photo");
				credit.remove();
			} else {
				triedFallback = true;
				img.src = photoFallbackUrl(i, 500);
			}
		};
		img.addEventListener("click", () => openLightbox(i, rid));
		media.append(img);
		media.classList.add("has-photo");
	}
	if (shiny) {
		media.insertAdjacentHTML("beforeend", '<span class="shiny-mark">✦</span>');
	}

	let ext = null;
	if (isExtinct(i)) {
		ext = el("span", { class: "tag tag-extinct" }, t("extinct"));
	}
	let oor = null;
	if (rec?.outOfRegion) {
		oor = el("span", { class: "tag tag-oor" }, t("outOfRegion"));
	}

	let rarityLabel = RARITY[rarityTier(i)].en;
	if (getLocale() === "fr") {
		rarityLabel = RARITY[rarityTier(i)].fr;
	}
	let shinyTag = null;
	if (shiny) {
		shinyTag = el("span", { class: "tag tag-shiny" }, `✦ ${t("shiny")}`);
	}
	const header = el(
		"div",
		{ class: "detail-head" },
		el(
			"div",
			{ class: "detail-num" },
			`#${String(dexNumber(i)).padStart(4, "0")}`,
		),
		el("h2", { class: "detail-name" }, commonName(i, getLocale())),
		el("div", { class: "detail-sci" }, sci),
		el(
			"div",
			{ class: "detail-tags" },
			el("span", { class: `tag tag-rarity r-${rid}` }, rarityLabel),
			shinyTag,
			ext,
			oor,
		),
	);

	let firstSeenFact = null;
	if (caught) {
		let firstSeenValue = "—";
		if (rec?.date) {
			firstSeenValue = fmtDate(rec.date, getLocale());
		}
		firstSeenFact = fact(t("firstSeen"), firstSeenValue);
	}
	let lastSeenFact = null;
	if (caught) {
		let lastSeenValue = "—";
		if (rec?.lastDate || rec?.date) {
			lastSeenValue = fmtDate(rec.lastDate || rec.date, getLocale());
		}
		lastSeenFact = fact(t("lastSeen"), lastSeenValue);
	}
	let locationFact = null;
	if (caught && rec?.country) {
		locationFact = fact(
			t("location"),
			`${flagEmoji(rec.country)} ${[regionName(rec.sp), COUNTRY_NAMES[rec.country] || rec.country].filter(Boolean).join(", ")}`,
		);
	}
	let countFact = null;
	if (caught && (rec?.totalCount ?? rec?.count)) {
		countFact = fact(t("count"), String(rec?.totalCount ?? rec?.count));
	}
	let statusText = t("notCaught");
	if (caught) {
		statusText = `✓ ${t("caught")}`;
	}
	const facts = el(
		"div",
		{ class: "detail-facts" },
		fact(t("order"), orderName(orderIdxOf(i))),
		fact(t("family"), familyName(familyIdxOf(i), getLocale())),
		firstSeenFact,
		lastSeenFact,
		locationFact,
		countFact,
		el("div", { class: "detail-status" }, statusText),
	);

	const ebird = el(
		"a",
		{
			class: "detail-ebird",
			href: EBIRD_SPECIES_URL(speciesCode(i)),
			target: "_blank",
			rel: "noopener",
		},
		`${t("ebirdPage")} ↗`,
	);

	box.append(media);
	if (credit) {
		box.append(credit);
	}
	box.append(header, facts, ebird);

	overlay.style.display = "flex";
	fitCreditAuthor();
}

function fact(label, value) {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	return el(
		"div",
		{ class: "fact" },
		el("span", { class: "fact-label" }, label),
		el("span", { class: "fact-value" }, value),
	);
}

export { close, mountDetail, openDetail };
