#!/usr/bin/env node
/* ============================================================================
   generate-thumbnails.js — Pixel Arcade thumbnail generator (source of truth)
   ============================================================================
   Generates an SVG thumbnail (220x140) for EVERY game in js/catalog.js and
   writes it to assets/thumbnails/<id>.svg. Existing files are OVERWRITTEN —
   that is the point: edit the CONFIG below, re-run, and every thumbnail is
   regenerated to match.

   USAGE (from the repo root):
     node tools/generate-thumbnails.js               # regenerate ALL (overwrites)
     node tools/generate-thumbnails.js --only=2048,shikaku
                                                     # regenerate just these games
     node tools/generate-thumbnails.js --missing     # only create files that don't exist
     node tools/generate-thumbnails.js --dry-run     # print what would happen, write nothing
     node tools/generate-thumbnails.js --check       # verify all games have a valid thumbnail
                                                     # (exits 1 on failure — CI friendly)

   NO DEPENDENCIES — plain Node.js, works on any OS.

   WHAT YOU CAN EDIT (all below, in the CONFIG section):
     - SIZE / RADIUS / OPTIONS ......... canvas size, brand text, layout toggles
     - CATEGORY_HUES ................... hue range per category (color coding)
     - ICON_OVERRIDES .................. per-game icon: an emoji string OR the
                                         name of a vector icon from DRAWN_ICONS
     - DRAWN_ICONS ..................... hand-drawn vector icons (pure SVG paths,
                                         render on every device — no font needed)
     - OVERRIDES ....................... per-game everything: colors, layout, icon

   DESIGN NOTES
     - Emoji icons use the system emoji font stack. A handful of Unicode chars
       (domino tiles U+1F030.., card backs U+1F0A0.., some geometric shapes)
       are NOT covered by common emoji fonts and show up as empty boxes on
       many devices — use an entry in DRAWN_ICONS for those instead.
     - Colors are generated per game: the category picks a hue range, the game
       id picks a deterministic hue inside it (same id = same color, forever).
     - The bottom scrim keeps the game name readable on any background.
   ============================================================================ */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "js", "catalog.js");
const OUT_DIR = path.join(ROOT, "assets", "thumbnails");

/* ============================================================================
   1. CONFIG — edit freely
   ============================================================================ */

// Canvas (matches the layout used by the site's game cards).
const SIZE = {w: 220, h: 140};
const RADIUS = 14;

// Layout toggles.
const OPTIONS = {
  showName: true,          // draw the game name under the icon
  showBrand: true,         // draw the small brand tag at the bottom
  brandText: "PIXEL ARCADE",
  showDots: true,          // decorative corner dots
  iconY: 76,               // baseline of the emoji icon
  nameY: 108,              // baseline of the game name
  brandY: 128,             // baseline of the brand tag
};

// Hue range (degrees) per category — every game gets one deterministic hue
// inside its category range, so colors are stable and category-coded.
const CATEGORY_HUES = {
  logic: [235, 268],   // indigo → violet
  quiz: [15, 48],     // orange → amber
  strategy: [135, 170],   // green → teal
  word: [195, 228],   // cyan → blue
  arcade: [292, 330],   // magenta → pink
};
const FALLBACK_HUES = [200, 240]; // for games with an unknown category

// Saturation / lightness of the gradient stops (dark top-left → light bottom-right).
const GRADIENT = {sat: [72, 80], light: [24, 60]};

// Per-game icon overrides. Value is either:
//   - an emoji/text string, e.g. "🎲"
//   - a key from DRAWN_ICONS,  e.g. "domino"
// These five games previously used Unicode chars that most emoji fonts do not
// cover (domino tiles / playing-card back / white rectangle) — they now use
// hand-drawn vector icons so they render on every device.
const ICON_OVERRIDES = {
  dominoeschain: "dominochain",
  dominoessolitaire: "domino",
  dominosa: "dominodots",
  solitaire: "cards",
  shikaku: "rectgrid",
};

// Full per-game overrides (icon, colors, layout) — highest priority.
// Example:
//   OVERRIDES["2048"] = { icon: "🔢", c1: "#0f172a", c2: "#38bdf8", nameY: 110 };
const OVERRIDES = {};

/* ============================================================================
   2. DRAWN ICONS — vector icons that never depend on fonts
   ----------------------------------------------------------------------------
   Each function receives the icon-box center (cx, cy) and returns raw SVG
   markup. The icon box is roughly 64x64 centered at (cx, cy).
   ============================================================================ */

const DRAWN_ICONS = {

  // A single upright domino tile (1 pip | 2 pips).
  domino(cx, cy) {
    const w = 34, h = 62, x = cx - w / 2, y = cy - h / 2;
    return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#ffffff" stroke="#0f172a" stroke-opacity="0.25"/>
      <line x1="${x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="#0f172a" stroke-opacity="0.3" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy - 15}" r="3.6" fill="#0f172a"/>
      <circle cx="${cx - 7}" cy="${cy + 15}" r="3.6" fill="#0f172a"/>
      <circle cx="${cx + 7}" cy="${cy + 15}" r="3.6" fill="#0f172a"/>
    </g>`;
  },

  // A domino tile with pip counts on both halves (looks like Dominosa clues).
  dominodots(cx, cy) {
    const w = 34, h = 62, x = cx - w / 2, y = cy - h / 2;
    const pip = (px, py) => `<circle cx="${px}" cy="${py}" r="3.2" fill="#0f172a"/>`;
    return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#ffffff" stroke="#0f172a" stroke-opacity="0.25"/>
      <line x1="${x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="#0f172a" stroke-opacity="0.3" stroke-width="2"/>
      ${pip(cx, cy - 14)} ${pip(cx - 6.5, cy + 11)} ${pip(cx + 6.5, cy + 11)} ${pip(cx - 6.5, cy + 20)} ${pip(cx + 6.5, cy + 20)}
    </g>`;
  },

  // Two dominoes mid-topple — the "chain reaction" of Domino Chain.
  dominochain(cx, cy) {
    const tile = (x, y, rot) => `
      <g transform="rotate(${rot} ${x + 13} ${y + 26})">
        <rect x="${x}" y="${y}" width="26" height="52" rx="5" fill="#ffffff" stroke="#0f172a" stroke-opacity="0.25"/>
        <line x1="${x}" y1="${y + 26}" x2="${x + 26}" y2="${y + 26}" stroke="#0f172a" stroke-opacity="0.3" stroke-width="2"/>
        <circle cx="${x + 13}" cy="${y + 12}" r="2.8" fill="#0f172a"/>
        <circle cx="${x + 8}" cy="${y + 39}" r="2.8" fill="#0f172a"/>
        <circle cx="${x + 18}" cy="${y + 39}" r="2.8" fill="#0f172a"/>
      </g>`;
    return tile(cx - 32, cy - 26, -6) + tile(cx + 8, cy - 12, 58);
  },

  // Two fanned playing cards (Solitaire).
  cards(cx, cy) {
    const heart = (hx, hy, s) => `
      <path transform="translate(${hx} ${hy}) scale(${s})" fill="#dc2626"
        d="M0 8.5 C -6 2.5, -8.5 -1, -8.5 -4 C -8.5 -6.5, -6.6 -8.2, -4.4 -8.2
           C -2.4 -8.2, -0.9 -7, 0 -5.2 C 0.9 -7, 2.4 -8.2, 4.4 -8.2
           C 6.6 -8.2, 8.5 -6.5, 8.5 -4 C 8.5 -1, 6 2.5, 0 8.5 Z"/>`;
    return `
    <g>
      <g transform="rotate(-14 ${cx - 6} ${cy})">
        <rect x="${cx - 24}" y="${cy - 28}" width="34" height="48" rx="5" fill="#ffffff" stroke="#0f172a" stroke-opacity="0.25"/>
        <rect x="${cx - 19}" y="${cy - 23}" width="24" height="38" rx="3" fill="#1d4ed8"/>
        <rect x="${cx - 16}" y="${cy - 20}" width="18" height="32" rx="2" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-dasharray="3 3"/>
      </g>
      <g transform="rotate(9 ${cx + 6} ${cy + 2})">
        <rect x="${cx - 12}" y="${cy - 26}" width="34" height="48" rx="5" fill="#ffffff" stroke="#0f172a" stroke-opacity="0.25"/>
        ${heart(cx + 5, cy + 3, 1.5)}
      </g>
    </g>`;
  },

  // A rectangle-division grid (Shikaku) with one region highlighted.
  rectgrid(cx, cy) {
    const cols = 4, rows = 3, cw = 17, ch = 17;
    const gw = cols * cw, gh = rows * ch;
    const x0 = cx - gw / 2, y0 = cy - gh / 2;
    let cells = "";
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells += `<rect x="${x0 + c * cw}" y="${y0 + r * ch}" width="${cw}" height="${ch}"
                   fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.6"/>`;
    return `
    <g>
      ${cells}
      <rect x="${x0}" y="${y0}" width="${cw * 2}" height="${ch * 2}" rx="2"
            fill="#ffffff" fill-opacity="0.92"/>
      <text x="${x0 + cw}" y="${y0 + ch * 1.28}" text-anchor="middle" font-size="12"
            font-weight="700" fill="#0f172a" font-family="'Segoe UI', system-ui, sans-serif">6</text>
    </g>`;
  },
};

/* ============================================================================
   3. HELPERS
   ============================================================================ */

// Deterministic string hash (same id -> same colors every run).
function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

function hsl(h, s, l) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[c]));
}

// Pick a readable font size for the game name.
function nameFont(name) {
  const max = 16;
  const fit = Math.floor(196 / Math.max(1, name.length * 0.58));
  return Math.max(10, Math.min(max, fit));
}

// Resolve the icon spec for a game: override > drawn-icon key > catalog emoji.
function iconFor(game) {
  const o = OVERRIDES[game.id] || {};
  if (o.icon) return o.icon;
  if (ICON_OVERRIDES[game.id]) return ICON_OVERRIDES[game.id];
  return game.icon || "🎮";
}

function colorsFor(game) {
  const o = OVERRIDES[game.id] || {};
  if (o.c1 && o.c2) return {c1: o.c1, c2: o.c2};
  const range = CATEGORY_HUES[game.category] || FALLBACK_HUES;
  const hue = range[0] + (hash(game.id) % Math.max(1, range[1] - range[0]));
  return {
    c1: hsl(hue, GRADIENT.sat[0], GRADIENT.light[0]),
    c2: hsl((hue + 22) % 360, GRADIENT.sat[1], GRADIENT.light[1]),
  };
}

/* ============================================================================
   4. TEMPLATE
   ============================================================================ */

function svgFor(game) {
  const o = Object.assign({}, OPTIONS, OVERRIDES[game.id] || {});
  const {c1, c2} = colorsFor(game);
  const name = escapeXml(game.name);
  const icon = iconFor(game);
  const iconMarkup = DRAWN_ICONS[icon]
    ? DRAWN_ICONS[icon](SIZE.w / 2, o.iconY - 28)
    : `<text x="${SIZE.w / 2}" y="${o.iconY}" text-anchor="middle" font-size="54"
             font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${escapeXml(icon)}</text>`;

  const dots = o.showDots ? `
    <circle cx="16" cy="16" r="2" fill="#ffffff" opacity="0.35"/>
    <circle cx="${SIZE.w - 16}" cy="16" r="2" fill="#ffffff" opacity="0.35"/>
    <circle cx="16" cy="${SIZE.h - 16}" r="2" fill="#ffffff" opacity="0.35"/>
    <circle cx="${SIZE.w - 16}" cy="${SIZE.h - 16}" r="2" fill="#ffffff" opacity="0.35"/>` : "";

  const nameText = o.showName ? `
    <text x="${SIZE.w / 2}" y="${o.nameY}" text-anchor="middle" font-size="${nameFont(game.name)}"
          font-weight="700" fill="#ffffff" font-family="'Segoe UI', system-ui, -apple-system, sans-serif">${name}</text>` : "";

  const brandText = o.showBrand ? `
    <text x="${SIZE.w / 2}" y="${o.brandY}" text-anchor="middle" font-size="8" letter-spacing="2.5"
          fill="#ffffff" fill-opacity="0.78" font-family="'Segoe UI', system-ui, -apple-system, sans-serif">${escapeXml(o.brandText)}</text>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE.w} ${SIZE.h}" width="${SIZE.w}" height="${SIZE.h}" role="img" aria-label="${name} thumbnail">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.30" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE.w}" height="${SIZE.h}" rx="${RADIUS}" fill="url(#bg)"/>
  ${dots}
  ${iconMarkup}
  <rect width="${SIZE.w}" height="${SIZE.h}" rx="${RADIUS}" fill="url(#scrim)"/>
  ${nameText}
  ${brandText}
</svg>
`;
}

/* ============================================================================
   5. MAIN
   ============================================================================ */

function loadCatalog() {
  const src = fs.readFileSync(CATALOG_PATH, "utf8");
  const m = src.match(/var CATALOG = (\[[\s\S]*?\]);\s*\n/);
  if (!m) throw new Error("Could not find the CATALOG array in js/catalog.js");
  const games = JSON.parse(m[1]);
  if (!Array.isArray(games) || !games.length) throw new Error("CATALOG is empty");
  return games;
}

// Unicode ranges that common emoji fonts do NOT cover (domino tiles,
// non-emoji mahjong, playing-card backs/suits, geometric-shapes block).
// Anything drawn from these renders as an empty box on many devices.
const RISKY_RANGES = [[0x1f000, 0x1f003], [0x1f005, 0x1f02f], [0x1f030, 0x1f093], [0x1f0a0, 0x1f0ce], [0x25a0, 0x25ff]];
const SAFE_EXCEPTIONS = new Set([0x1f004, 0x1f0cf]); // 🀄 and 🃏 are real emoji
function riskyGlyphs(str) {
  const out = [];
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if (SAFE_EXCEPTIONS.has(cp)) continue;
    if (RISKY_RANGES.some(([a, b]) => cp >= a && cp <= b)) out.push("U+" + cp.toString(16).toUpperCase());
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node tools/generate-thumbnails.js [--only=id1,id2] [--missing] [--dry-run] [--check]");
    return;
  }
  const dryRun = args.includes("--dry-run");
  const onlyMissing = args.includes("--missing");
  const checkOnly = args.includes("--check");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()).filter(Boolean) : null;

  const games = loadCatalog();
  const ids = new Set(games.map((g) => g.id));
  if (only) {
    const bad = only.filter((id) => !ids.has(id));
    if (bad.length) throw new Error("Unknown game id(s): " + bad.join(", "));
  }

  // ---- --check: verify thumbnail coverage & flag font-unsafe glyphs ----
  if (checkOnly) {
    let fail = 0;
    for (const g of games) {
      const p = path.join(OUT_DIR, g.id + ".svg");
      if (!fs.existsSync(p) || fs.statSync(p).size < 60) {
        console.error(`MISSING  ${g.id}.svg`);
        fail++;
        continue;
      }
      const svg = fs.readFileSync(p, "utf8");
      if (!/^<svg[\s\S]*<\/svg>\s*$/.test(svg)) {
        console.error(`MALFORMED ${g.id}.svg`);
        fail++;
        continue;
      }
      const bad = riskyGlyphs(svg);
      if (bad.length) {
        console.error(`RISKY    ${g.id}.svg contains ${bad.join(" ")} (renders as an empty box on many devices)`);
        fail++;
      }
    }
    const extra = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".svg") && !ids.has(f.replace(/\.svg$/, "")));
    for (const f of extra) {
      console.error(`ORPHAN   ${f} (no matching game in catalog)`);
      fail++;
    }
    if (fail) {
      console.error(`\n${fail} problem(s) found.`);
      process.exit(1);
    }
    console.log(`OK — all ${games.length} games have a valid, font-safe thumbnail.`);
    return;
  }

  // ---- generate ----
  let made = 0, skipped = 0;
  for (const g of games) {
    if (only && !only.includes(g.id)) continue;
    const p = path.join(OUT_DIR, g.id + ".svg");
    if (onlyMissing && fs.existsSync(p)) {
      skipped++;
      continue;
    }
    if (!dryRun) fs.writeFileSync(p, svgFor(g));
    made++;
  }
  console.log(`${dryRun ? "[dry-run] " : ""}${made} thumbnail(s) generated${only ? " (" + only.join(", ") + ")" : onlyMissing ? " (missing only)" : " (all games)"}`
    + (skipped ? `, ${skipped} skipped (already existed)` : "")
    + ` -> ${path.relative(ROOT, OUT_DIR)}/`);
  console.log("Edit tools/generate-thumbnails.js and re-run to overwrite them with a new design.");
}

main();
