/* mahjongsolitaire — tile-matching mahjong solitaire: 72 tiles (18 faces × 4) on a 2-layer
   layout, generated in reverse so every deal is guaranteed solvable. */
(function () {
  "use strict";
  const FACES = ["🀄", "🎋", "🀅", "🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🐉", "🐯", "🐔", "🌸", "🍑", "🀙", "🀚", "🀛"];
  const TW = 44, TH = 58, GAP = 2, LIFT = 16;

  // positions: layer 0 = 6×8 (48), layer 1 = 4×6 (24) centred on top → 72 tiles
  const POSITIONS = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) POSITIONS.push({l: 0, r: r, c: c});
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) POSITIONS.push({l: 1, r: r, c: c});
  const pk = function (p) {
    return p.l + "," + p.r + "," + p.c;
  };

  function isFree(live, p) {
    if (p.l === 0) {
      // a layer-1 tile at (r-1,c-1) sits on top of layer-0 (r,c)
      if (live.has("1," + (p.r - 1) + "," + (p.c - 1))) return false;
    }
    const left = live.has(p.l + "," + p.r + "," + (p.c - 1));
    const right = live.has(p.l + "," + p.r + "," + (p.c + 1));
    return !left || !right;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  // Generate a solvable deal: simulate removing random FREE pairs from the full layout,
  // then give each removed pair a matching face — replaying that order solves the deal.
  function generateDeal() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const live = new Set(POSITIONS.map(pk));
      const pairs = [];
      let ok = true;
      for (let k = 0; k < 36; k++) {
        const free = POSITIONS.filter(function (p) {
          return live.has(pk(p)) && isFree(live, p);
        });
        if (free.length < 2) {
          ok = false;
          break;
        }
        const a = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        const b = free.splice(Math.floor(Math.random() * free.length), 1)[0];
        live.delete(pk(a));
        live.delete(pk(b));
        pairs.push([a, b]);
      }
      if (!ok) continue;
      const faceBag = [];
      for (let i = 0; i < 2; i++) for (const f of FACES) faceBag.push(f);
      shuffle(faceBag);
      const deal = new Map();
      pairs.forEach(function (pr, i) {
        deal.set(pk(pr[0]), faceBag[i]);
        deal.set(pk(pr[1]), faceBag[i]);
      });
      if (deal.size === 72) return deal;
    }
    return null; // practically unreachable
  }

  GameRegistry.register({
    id: "mahjongsolitaire",
    name: "Mahjong Solitaire",
    icon: "🀄",
    category: "strategy",
    description: "Match pairs of free tiles and clear the 72-tile two-layer layout — every deal is solvable.",
    tags: ["strategy", "solitaire", "matching", "relaxing"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let live, sel, over, seconds, hintsUsed, recorded, hintPair, hintTimer;
      let badKeys = [];
      const timers = [];
      let tick = null;

      function later(fn, ms) {
        const id = setTimeout(function () {
          if (alive) fn();
        }, ms);
        timers.push(id);
        return id;
      }

      root.innerHTML = `
        <style>
          #mj-board { position:relative; width:392px; height:392px; margin:0 auto; }
          .mj-tile { position:absolute; width:${TW}px; height:${TH}px; box-sizing:border-box;
            border-radius:6px; background:var(--bg-elev); border:1px solid var(--border);
            display:grid; place-items:center; font-size:25px; line-height:1; user-select:none;
            box-shadow:0 3px 0 var(--border), inset 0 2px 0 rgba(255,255,255,0.28);
            transition:transform .1s; }
          .mj-tile.free { cursor:pointer; }
          .mj-tile.blocked { opacity:0.8; filter:saturate(0.8); }
          .mj-tile.sel { transform:translateY(-4px); outline:3px solid var(--accent); outline-offset:-3px;
            box-shadow:0 7px 0 var(--border); }
          .mj-tile.hint { outline:3px solid var(--warning); outline-offset:-3px; animation:mj-pulse 0.7s infinite alternate; }
          .mj-tile.bad { animation:mj-shake .3s; }
          @keyframes mj-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
          @keyframes mj-pulse { from { outline-color:var(--warning); } to { outline-color:transparent; } }
          .mj-center-badge { position:absolute; right:2px; bottom:2px; font-size:0.72rem; color:var(--text-muted);
            font-family:var(--font-mono,monospace); }
        </style>
        <div class="status info" id="mj-status">Clear the board — 72 tiles left</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Tiles left</div><div class="val" id="mj-left">72</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="mj-time">0:00</div></div>
          <div class="score-cell"><div class="label">Pairs</div><div class="val" id="mj-pairs">0 / 36</div></div>
        </div>
        <div class="center"><div id="mj-board"></div></div>
        <p class="hint">A tile is <b>free</b> when nothing lies on top and its left or right side is open. Match two free tiles to remove them.</p>
        <div class="row center" style="gap:10px;margin-top:8px;">
          <button class="btn" id="mj-new">New deal</button>
          <button class="btn primary" id="mj-hint">Hint</button>
        </div>
      `;

      const boardEl = root.querySelector("#mj-board");
      const statusEl = root.querySelector("#mj-status");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function xy(p) {
        const col = p.l === 0 ? p.c : p.c + 1;
        const row = p.l === 0 ? p.r : p.r + 1;
        return [col * (TW + GAP), row * (TH + GAP) - (p.l === 1 ? LIFT : 0)];
      }

      function newGame() {
        const deal = generateDeal();
        live = deal || new Map();
        sel = null;
        over = false;
        seconds = 0;
        hintsUsed = 0;
        recorded = false;
        hintPair = null;
        if (tick) clearInterval(tick);
        tick = setInterval(function () {
          if (!alive || over) return;
          seconds++;
          root.querySelector("#mj-time").textContent = fmt(seconds);
        }, 1000);
        setStatus("Clear the board — 72 tiles left");
        render();
      }

      function fmt(s) {
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      }

      function render() {
        boardEl.innerHTML = "";
        for (const p of POSITIONS) {
          const key = pk(p);
          if (!live.has(key)) continue;
          const face = live.get(key);
          const d = document.createElement("div");
          d.className = "mj-tile";
          d.textContent = face;
          const pos = xy(p);
          d.style.left = pos[0] + "px";
          d.style.top = pos[1] + "px";
          d.style.zIndex = 10 * p.l + p.r;
          const free = isFree(live, p);
          if (free) d.classList.add("free"); else d.classList.add("blocked");
          if (sel && sel.key === key) d.classList.add("sel");
          if (hintPair && (hintPair[0] === key || hintPair[1] === key)) d.classList.add("hint");
          d.addEventListener("click", function () {
            onTile(p, key, d);
          });
          boardEl.appendChild(d);
        }
        root.querySelector("#mj-left").textContent = live.size;
        root.querySelector("#mj-pairs").textContent = (36 - live.size / 2) + " / 36";
        root.querySelector("#mj-time").textContent = fmt(seconds);
      }

      function onTile(p, key, el) {
        if (over) return;
        if (!isFree(live, p)) {
          AudioFX.error();
          el.classList.remove("bad");
          void el.offsetWidth;
          el.classList.add("bad");
          setStatus("That tile is blocked — it's covered or boxed in on both sides", "warning");
          return;
        }
        if (sel && sel.key === key) {
          sel = null;
          AudioFX.click();
          render();
          return;
        }
        if (!sel) {
          sel = {key: key, face: live.get(key)};
          AudioFX.click();
          render();
          return;
        }
        // second tile
        if (live.get(key) === sel.face) {
          live.delete(key);
          live.delete(sel.key);
          sel = null;
          hintPair = null;
          AudioFX.pop();
          if (!live.size) {
            over = true;
            setStatus("🎉 Board cleared — you win!", "win");
            AudioFX.win();
            if (!recorded) {
              recorded = true;
              const score = Math.max(50, 1000 - seconds - hintsUsed * 25);
              App.recordResult(true, score);
              App.toast("Cleared in " + fmt(seconds) + (hintsUsed ? " with " + hintsUsed + " hint(s)" : ""), "success");
            }
            render();
            return;
          }
          if (!findFreePair()) {
            setStatus("😵 No matching free pairs left — press New deal", "lose");
            App.toast("Stuck! No free pairs remain — deal again", "warning");
          } else {
            setStatus("Nice — " + live.size + " tiles left");
          }
          render();
          return;
        }
        // mismatch
        AudioFX.error();
        const first = boardEl.querySelector(".mj-tile.sel");
        if (first) {
          first.classList.remove("bad");
          void first.offsetWidth;
          first.classList.add("bad");
        }
        el.classList.remove("bad");
        void el.offsetWidth;
        el.classList.add("bad");
        setStatus("Those tiles don't match — pick two identical free tiles", "warning");
        sel = {key: key, face: live.get(key)};
        render();
      }

      function findFreePair() {
        const byFace = new Map();
        for (const p of POSITIONS) {
          const key = pk(p);
          if (!live.has(key) || !isFree(live, p)) continue;
          const f = live.get(key);
          if (byFace.has(f)) return [byFace.get(f), key];
          byFace.set(f, key);
        }
        return null;
      }

      function doHint() {
        if (over) return;
        const pair = findFreePair();
        if (!pair) {
          App.toast("No free matching pairs — press New deal", "warning");
          AudioFX.error();
          return;
        }
        hintsUsed++;
        hintPair = pair;
        AudioFX.reveal();
        render();
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = later(function () {
          hintPair = null;
          if (!over) render();
        }, 1800);
      }

      root.querySelector("#mj-new").addEventListener("click", function () {
        AudioFX.click();
        newGame();
      });
      root.querySelector("#mj-hint").addEventListener("click", doHint);

      newGame();
      return function cleanup() {
        alive = false;
        timers.forEach(clearTimeout);
        if (tick) clearInterval(tick);
      };
    },
    help: function () {
      App.showModal("How to play Mahjong Solitaire",
        `A relaxed tile-matching game with <b>72 tiles</b>: 18 distinct faces, 4 copies of each, stacked on a two-layer layout (a full 6×8 bottom layer with a centred 4×6 layer on top).
        <br><br><b>Free tiles:</b> a tile can be tapped only when <b>nothing lies on top of it</b> and at least one of its <b>long sides (left/right) is open</b>. Blocked tiles look dimmed.
        <br><br><b>Play:</b> tap one free tile, then a second free tile with the <b>same face</b> — the pair disappears. Clear all 36 pairs to win.
        <br><br>Every deal is <b>guaranteed solvable</b> — it's built by removing free pairs in reverse. Careful though: you can still paint yourself into a corner; if no free pairs remain you'll have to deal again.
        <br><br><b>Hint</b> flashes a currently removable pair (costs score). <b>New deal</b> reshuffles a fresh solvable layout and resets the timer.`);
    },
  });
})();
