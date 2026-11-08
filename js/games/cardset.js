/* cardset — the classic game of SET: find triples where every feature is all-same or all-different. */
(function () {
  "use strict";
  const COLORS = ["#ef4444", "#3b82f6", "#22c55e"];
  const SHAPES = ["●", "▲", "■"];
  const FILLS = ["solid", "open", "stripe"];

  GameRegistry.register({
    id: "cardset", name: "SET", icon: "🃏", category: "logic",
    description: "Spot triples where every feature is all-same or all-different", tags: ["cards", "pattern", "classic"],
    age: ["teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, timer = null;
      let deck = [], table = [], selected = [], found = 0, timeLeft = 180, over = false;

      function isSet(a, b, c) {
        for (let f = 0; f < 4; f++) {
          const v = [a[f], b[f], c[f]];
          const same = v[0] === v[1] && v[1] === v[2];
          const diff = v[0] !== v[1] && v[1] !== v[2] && v[0] !== v[2];
          if (!same && !diff) return false;
        }
        return true;
      }

      function tableHasSet() {
        for (let i = 0; i < table.length; i++)
          for (let j = i + 1; j < table.length; j++)
            for (let k = j + 1; k < table.length; k++)
              if (isSet(table[i], table[j], table[k])) return true;
        return false;
      }

      function newDeck() {
        deck = [];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++)
          deck.push([a, b, c, d]);
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
      }

      function refill() {
        while (table.length < 12 && deck.length) table.push(deck.pop());
        if (!tableHasSet() && deck.length) {
          table.push(deck.pop(), deck.pop(), deck.pop());
          refill();
        }
      }

      function start() {
        newDeck();
        table = [];
        selected = [];
        found = 0;
        timeLeft = 180;
        over = false;
        refill();
        render();
      }

      function click(i) {
        if (over) return;
        const at = selected.indexOf(i);
        if (at >= 0) selected.splice(at, 1);
        else {
          if (selected.length >= 3) return;
          selected.push(i);
        }
        AudioFX.click();
        if (selected.length === 3) {
          const [a, b, c] = selected.map(x => table[x]);
          if (isSet(a, b, c)) {
            // remove chosen, refill
            selected.sort((x, y) => y - x).forEach(x => table.splice(x, 1));
            found++;
            timeLeft = Math.min(180, timeLeft + 10);
            AudioFX.pop();
            refill();
            selected = [];
            if (!tableHasSet() && !deck.length) {
              over = true;
              setStatus(`🎉 Deck cleared! ${found} sets found.`, "win");
              AudioFX.win();
              App.recordResult(true, found);
            }
          } else {
            AudioFX.error();
            setStatus("Not a set — each feature must be all-same or all-different.", "");
            selected = [];
          }
        }
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#cs-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      root.innerHTML = `
        <style>
          #cs-grid { display: grid; grid-template-columns: repeat(4, 78px); gap: 8px; justify-content: center; margin: 10px 0; }
          .cs-card { width: 78px; height: 108px; border-radius: 10px; background: #fff; cursor: pointer;
            display: grid; place-items: center; border: 3px solid transparent; user-select: none; }
          .cs-card.sel { border-color: #f59e0b; box-shadow: 0 0 10px #f59e0b88; }
          .cs-in { font-size: 1.7rem; letter-spacing: 1px; font-weight: 800; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Sets</div><div class="val" id="cs-f">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="cs-t">180s</div></div>
          <div class="score-cell"><div class="label">Deck</div><div class="val" id="cs-d">81</div></div>
        </div>
        <div class="status info" id="cs-status">Find sets of three — each feature all-same or all-different.</div>
        <div id="cs-grid"></div>
        <div class="row" style="justify-content:center;"><button class="btn" id="cs-new">🔀 New game</button></div>
      `;

      function cardHTML(c) {
        const [col, shape, fill, count] = c;
        const style = fill === 0 ? "" : (fill === 1 ? "-webkit-text-stroke: 1.5px currentColor; color: transparent;" : "opacity: .55;");
        const glyphs = SHAPES[shape].repeat(count + 1);
        return `<div class="cs-in" style="color:${COLORS[col]};${style}">${glyphs}</div>`;
      }

      function render() {
        const el = root.querySelector("#cs-grid");
        el.innerHTML = table.map((c, i) =>
          `<div class="cs-card ${selected.includes(i) ? "sel" : ""}" data-i="${i}">${cardHTML(c)}</div>`).join("");
        const f = root.querySelector("#cs-f"), t = root.querySelector("#cs-t"), d = root.querySelector("#cs-d");
        if (f) f.textContent = found;
        if (t) t.textContent = timeLeft + "s";
        if (d) d.textContent = deck.length;
      }

      root.querySelector("#cs-grid").addEventListener("click", e => {
        const c = e.target.closest("[data-i]");
        if (c) click(+c.dataset.i);
      });
      root.querySelector("#cs-new").addEventListener("click", () => {
        AudioFX.click();
        start();
      });

      timer = setInterval(() => {
        if (!alive || over) return;
        timeLeft--;
        const t = root.querySelector("#cs-t");
        if (t) t.textContent = timeLeft + "s";
        if (timeLeft <= 0) {
          over = true;
          setStatus(`⏰ Time! You found ${found} sets.`, "lose");
          AudioFX.lose();
          App.recordResult(false, found);
        }
      }, 1000);

      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play SET",
        "Each card has 4 features: <b>colour</b>, <b>shape</b>, <b>fill</b> and <b>count</b>." +
        "<br>A valid <b>set</b> is three cards where, for <i>every</i> feature, the three cards are either all the same or all different." +
        "<br>Tap three cards to call a set. Correct: +10s. Wrong: keep hunting. Find as many as you can in 3 minutes!");
    },
  });
})();
