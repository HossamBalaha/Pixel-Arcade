/* memorytransport2 — Transport Memory 2 (auto-generated themed memory) */
(function () {
  "use strict";
  const EMOJIS = ["\ud83d\ude97", "\ud83d\ude95", "\ud83d\ude99", "\ud83d\ude8c", "\ud83d\ude8e", "\ud83c\udfce\ufe0f", "\ud83d\ude93", "\ud83d\ude91", "\ud83d\ude92", "\ud83d\ude90", "\ud83d\ude9a", "\ud83d\ude9b", "\ud83d\ude9c", "\ud83d\udef5", "\ud83d\udeb2", "\ud83d\ude82"];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "memorytransport2", name: "Transport Memory 2", icon: "🚗", category: "logic",
    description: "Transport Memory 2 \u2014 flip pairs of cards to clear the deck.", tags: ["memory", "themed"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, cards = [], flipped = [], matched = 0, lock = false, moves = 0;

      function start() {
        const chosen = shuffle(EMOJIS).slice(0, 8);
        cards = shuffle([...chosen, ...chosen]).map((e, i) => ({emoji: e, idx: i, matched: false, flipped: false}));
        flipped = [];
        matched = 0;
        lock = false;
        moves = 0;
        render();
      }

      function flip(i) {
        if (lock || cards[i].flipped || cards[i].matched) return;
        cards[i].flipped = true;
        flipped.push(i);
        AudioFX.flip();
        if (flipped.length === 2) {
          moves++;
          const [a, b] = flipped;
          if (cards[a].emoji === cards[b].emoji) {
            cards[a].matched = cards[b].matched = true;
            matched++;
            AudioFX.pop();
            flipped = [];
            if (matched === 8) {
              App.recordResult(true, moves);
              AudioFX.win();
              App.toast("Cleared in " + moves + " moves!", "success");
            }
          } else {
            lock = true;
            setTimeout(() => {
              if (!alive) return;
              if (!alive) return;
              cards[a].flipped = false;
              cards[b].flipped = false;
              flipped = [];
              lock = false;
              render();
            }, 800);
          }
        }
        render();
      }

      function render() {
        const stage = root.querySelector("#memorytransport2-stage");
        if (!stage) return;
        stage.innerHTML = "";
        cards.forEach((c, i) => {
          const b = document.createElement("button");
          b.className = "mm-card" + (c.flipped || c.matched ? " flipped" : "") + (c.matched ? " matched" : "");
          b.innerHTML = c.flipped || c.matched ? c.emoji : "?";
          b.addEventListener("click", () => flip(i));
          stage.appendChild(b);
        });
        const mv = root.querySelector("#memorytransport2-moves");
        if (mv) mv.textContent = moves;
        const mt = root.querySelector("#memorytransport2-matched");
        if (mt) mt.textContent = matched + "/8";
      }

      root.innerHTML = `
        <style>
          .mm-stage { display:grid; grid-template-columns: repeat(4, 64px); gap:8px; justify-content:center; padding:14px; }
          .mm-card { width:64px; height:64px; font-size:2rem; border-radius:10px;
            border:2px solid var(--border,#d1d5db); background:var(--bg-elev,#fff); color:var(--text,#111);
            display:flex; align-items:center; justify-content:center; cursor:pointer; transition: transform 0.2s; }
          .mm-card:hover { transform: scale(1.05); }
          .mm-card.flipped { background:var(--accent-soft,#e0e7ff); }
          .mm-card.matched { opacity:0.55; cursor:default; }
        </style>
        <div style="text-align:center; margin-bottom:10px; color:var(--text-muted,#64748b); font-size:0.9rem;">
          Matched: <span id="memorytransport2-matched">0/8</span> | Moves: <span id="memorytransport2-moves">0</span>
        </div>
        <div id="memorytransport2-stage" class="mm-stage"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="memorytransport2-new">New game</button></div>
      `;
      root.querySelector("#memorytransport2-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Transport Memory 2", "Flip cards two at a time. Find all 8 matching pairs.");
    },
  });
})();
