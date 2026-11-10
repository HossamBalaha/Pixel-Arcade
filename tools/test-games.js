#!/usr/bin/env node
/* ============================================================================
   test-games.js — headless smoke test for every game

   Mounts each game from js/games/ in a fresh JSDOM sandbox (stubbed canvas,
   audio, storage) and verifies:
     1. the file parses and registers with GameRegistry
     2. mount() runs without throwing
     3. the game actually rendered something (stage has child elements)
     4. the returned cleanup function (if any) runs without throwing
     5. calling help() / hint() / solve() (when declared) does not throw
   Any failure exits with code 1 — CI friendly.

   USAGE (from the repo root):
     node tools/test-games.js                    # test all 300 games
     node tools/test-games.js --only=wordle,2048 # test just these
     node tools/test-games.js --verbose          # log every game, not just failures

   DEPENDENCIES: jsdom (dev only — `npm i -D jsdom`). No browser needed,
   which keeps GitHub Actions fast (~20s for all 300 games).
   ============================================================================ */

"use strict";

const fs = require("fs");
const path = require("path");

let jsdom;
try {
  jsdom = require("jsdom");
} catch (e) {
  console.error("jsdom is required: npm i -D jsdom");
  process.exit(2);
}

const ROOT = path.join(__dirname, "..");
const GAMES_DIR = path.join(ROOT, "js", "games");

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const onlyArg = args.find(a => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").map(s => s.trim()).filter(Boolean) : null;

function makeWindow() {
  const dom = new jsdom.JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  // Stub the bits games touch that JSDOM lacks.
  w.matchMedia = () => ({
    matches: false, addEventListener: () => {
    }, removeEventListener: () => {
    }
  });
  // Recursive canvas stub: any method call returns another versatile proxy,
  // so chained calls like ctx.createLinearGradient(...).addColorStop(...) work.
  const makeCtxStub = () => new Proxy(function () {
  }, {
    get(t, p) {
      if (p === "canvas") return {};
      if (p === "measureText") return () => ({width: 10});
      if (p === "getImageData") return () => ({data: new Uint8ClampedArray(4)});
      if (p === Symbol.toPrimitive) return () => "";
      return makeCtxStub();
    },
    set() {
      return true;
    },
    apply() {
      return makeCtxStub();
    },
  });
  w.HTMLCanvasElement.prototype.getContext = function () {
    return makeCtxStub();
  };
  w.App = {
    toast: () => {
    }, showModal: () => {
    }, announce: () => {
    },
    recordResult: () => {
    }, openGame: () => {
    }, closeGame: () => {
    },
    restart: () => {
    }, passTurn: () => {
    }, updateMeta: () => {
    },
    _fireConfetti: () => {
    }, _randomPick: () => null, getDailyGame: () => null,
  };
  w.__results = [];
  w.addEventListener("error", () => {
  }); // swallow script errors — we catch them per-game
  return w;
}

function loadCore(w) {
  for (const rel of ["js/storage.js", "js/audio.js", "js/wordlist.js", "js/registry.js"]) {
    w.eval(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  }
}

function testGame(w, gid) {
  const file = path.join(GAMES_DIR, gid + ".js");
  if (!fs.existsSync(file)) return {gid, ok: false, error: "game file missing"};
  const src = fs.readFileSync(file, "utf8");
  let game;
  try {
    // Fresh registry state per game? The registry keeps global order; instead
    // we mount into a detached root and clean up after each test.
    w.eval(src);
    game = w.GameRegistry.get(gid);
    if (!game) return {gid, ok: false, error: "did not register with GameRegistry"};
  } catch (e) {
    return {gid, ok: false, error: "parse/register threw: " + e.message};
  }
  const root = w.document.createElement("div");
  w.document.body.appendChild(root);
  let cleanup = null;
  try {
    cleanup = game.mount(root, {App: w.App, AudioFX: w.AudioFX, Storage: w.Storage});
  } catch (e) {
    return {gid, ok: false, error: "mount threw: " + e.message};
  }
  try {
    const kids = root.querySelectorAll("*").length;
    if (kids === 0) return {gid, ok: false, error: "mount rendered nothing"};
    // Exercise the optional API surface — regressions here are common.
    if (typeof game.help === "function") game.help();
    if (typeof game.hint === "function") game.hint();
    if (typeof game.solve === "function") game.solve();
  } catch (e) {
    return {gid, ok: false, error: "help/hint/solve threw: " + e.message};
  }
  try {
    if (typeof cleanup === "function") cleanup();
  } catch (e) {
    return {gid, ok: false, error: "cleanup threw: " + e.message};
  }
  root.remove();
  return {gid, ok: true};
}

function main() {
  const catalogSrc = fs.readFileSync(path.join(ROOT, "js", "catalog.js"), "utf8");
  const m = catalogSrc.match(/var CATALOG = (\[[\s\S]*\]);/);
  if (!m) {
    console.error("could not parse catalog");
    process.exit(2);
  }
  const catalog = JSON.parse(m[1]);
  let ids = catalog.map(e => e.id);
  if (only) ids = ids.filter(id => only.includes(id));
  if (!ids.length) {
    console.error("no games to test");
    process.exit(2);
  }

  const w = makeWindow();
  loadCore(w);

  const results = [];
  const t0 = Date.now();
  for (const gid of ids) {
    const r = testGame(w, gid);
    results.push(r);
    if (!r.ok) console.error(`FAIL ${r.gid}: ${r.error}`);
    else if (verbose) console.log(`ok   ${r.gid}`);
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} games passed in ${dt}s`);
  if (fails.length) {
    console.error("\nFailed games:");
    fails.forEach(f => console.error(`  ${f.gid}: ${f.error}`));
    process.exit(1);
  }
}

main();
