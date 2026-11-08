/* pachisilite — Pachisi Lite (real race rules, simplified).
   2 tokens per side, 24-cell shared loop + 6-cell home column.
   Cowrie dice (mouths up), capture sends back to start, arrow cells are safe. */
(function () {
  "use strict";
  const LOOP = 24, HOMELEN = 6, TOKENS = 2;
  const SAFE = new Set([0, 8, 16]); // arrow (safe) cells on the loop

  GameRegistry.register({
    id: "pachisilite",
    name: "Pachisi Lite",
    icon: "🎲",
    category: "strategy",
    description: "The royal Indian race game — cowries, captures and a dash to home",
    tags: ["strategy", "classic", "dice"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, over = false, aiTimer = null;
      // token: {pos: -1 start | 0..23 loop | 24..29 home column | 30 home}
      let tokens = {1: [-1, -1], 2: [-1, -1]};
      let turn = 1, roll = 0, extra = false;
      let moved = {1: 0, 2: 0}; // tokens brought home

      function rollCowries() {
        // 5 cowries: mouths up counted as pips; all mouths down = 12 & roll again
        const up = Array.from({length: 5}, () => Math.random() < 0.45);
        const n = up.filter(Boolean).length;
        renderCowries(up);
        if (n === 0) {
          extra = true;
          return 12;
        }
        extra = false;
        return n * 2; // 2,4,6,8,10 — pachisi-style even counts
      }

      function renderCowries(up) {
        const el = root.querySelector("#pa-cowries");
        if (el) el.textContent = up.map(u => (u ? "🟤" : "⚪")).join(" ");
      }

      function posOf(p, i) { // absolute cell index for display
        if (i === -1) return null;
        if (i < LOOP) return (p === 1 ? i : (i + LOOP / 2) % LOOP); // players enter offset by 12
        return null; // home column rendered separately
      }

      function canMove(p, t, r) {
        const i = tokens[p][t];
        if (i === 30) return false;
        if (i === -1) return r === 6 ? true : false; // need a 6 to enter (pachisi grace)
        const ni = i + r;
        if (ni > 30) return false; // overshoot home
        return true;
      }

      function anyMove(p, r) {
        return [0, 1].some(t => canMove(p, t, r));
      }

      function moveToken(p, t, r) {
        const i = tokens[p][t];
        if (i === -1) {
          tokens[p][t] = 0;
          AudioFX.pop();
        } else {
          const ni = i + r;
          tokens[p][t] = ni;
          AudioFX.pop();
          if (ni === 30) {
            moved[p]++;
            AudioFX.win();
            App.toast((p === 1 ? "You" : "AI") + " got a token home!", "success");
          } else if (ni < LOOP) {
            // capture: enemy on same non-safe loop cell (absolute)
            const abs = posOf(p, ni);
            for (const et of [0, 1]) {
              const ei = tokens[p === 1 ? 2 : 1][et];
              if (ei >= 0 && ei < LOOP && posOf(p === 1 ? 2 : 1, ei) === abs) {
                tokens[p === 1 ? 2 : 1][et] = -1;
                AudioFX.error();
                App.toast((p === 1 ? "You" : "AI") + " captured a token!", p === 1 ? "success" : "warning");
                extra = true; // capture grants another roll
              }
            }
          }
        }
      }

      function winner() {
        if (moved[1] >= TOKENS) return 1;
        if (moved[2] >= TOKENS) return 2;
        return 0;
      }

      function doRoll() {
        if (over) return;
        roll = rollCowries();
        const el = root.querySelector("#pa-roll-val");
        if (el) el.textContent = roll;
        AudioFX.click();
        if (!anyMove(turn, roll)) {
          setStatus((turn === 1 ? "You" : "AI") + " rolled " + roll + " — no legal move, turn passes.");
          nextTurn();
          render();
          return;
        }
        setStatus(turn === 1 ? "You rolled " + roll + " — click a token to move." : "AI rolled " + roll + ".");
        render();
        if (turn === 2) {
          aiTimer = setTimeout(() => {
            if (alive && !over) aiPlay();
          }, 650);
        }
      }

      function nextTurn() {
        if (extra) {
          extra = false;
          setStatus((turn === 1 ? "You" : "AI") + " get another roll!");
        } else {
          turn = turn === 1 ? 2 : 1;
        }
        roll = 0;
        const el = root.querySelector("#pa-roll-val");
        if (el) el.textContent = "—";
      }

      function humanTokenClick(t) {
        if (over || turn !== 1 || !roll) {
          if (!over) App.toast("Roll the cowries first", "info");
          return;
        }
        if (!canMove(1, t, roll)) {
          App.toast("That token can't move " + roll, "warning");
          return;
        }
        moveToken(1, t, roll);
        const w = winner();
        if (w) {
          finish(w);
          return;
        }
        nextTurn();
        render();
        if (turn === 2) {
          setStatus("AI's turn — rolling…");
          aiTimer = setTimeout(() => {
            if (alive && !over) doRoll();
          }, 700);
        } else {
          setStatus("You get another roll!");
        }
      }

      function aiPlay() {
        const opts = [0, 1].filter(t => canMove(2, t, roll));
        if (!opts.length) {
          nextTurn();
          render();
          return;
        }
        // prefer: finish > enter > capture > farthest
        let best = opts[0], bestScore = -1e9;
        for (const t of opts) {
          const i = tokens[2][t], ni = i === -1 ? 0 : i + roll;
          let sc = Math.random() * 0.1;
          if (ni === 30) sc += 50;
          else if (i === -1) sc += 5;
          else if (ni < LOOP) {
            const abs = posOf(2, ni);
            for (const et of [0, 1]) {
              const ei = tokens[1][et];
              if (ei >= 0 && ei < LOOP && posOf(1, ei) === abs && !SAFE.has(ei)) sc += 20;
            }
            if (SAFE.has(ni)) sc += 3;
          }
          sc += (i === -1 ? 0 : i) * 0.05;
          if (sc > bestScore) {
            bestScore = sc;
            best = t;
          }
        }
        moveToken(2, best, roll);
        const w = winner();
        if (w) {
          finish(w);
          return;
        }
        nextTurn();
        render();
        if (turn === 2) {
          setStatus("AI gets another roll…");
          aiTimer = setTimeout(() => {
            if (alive && !over) doRoll();
          }, 700);
        } else {
          setStatus("Your turn — roll the cowries!");
        }
      }

      function finish(w) {
        over = true;
        const st = root.querySelector("#pa-status");
        st.textContent = w === 1 ? "🎉 All your tokens are home — you win!" : "The AI got all tokens home first.";
        st.className = w === 1 ? "status win" : "status lose";
        if (w === 1) {
          AudioFX.win();
          App.recordResult(true, moved[1] + moved[2]);
        } else {
          AudioFX.lose();
          App.recordResult(false, moved[1] + moved[2]);
        }
        render();
      }

      function setStatus(t) {
        const st = root.querySelector("#pa-status");
        if (st) {
          st.textContent = t;
          st.className = "status info";
        }
      }

      // ---- render ----
      root.innerHTML = `
        <style>
          .pa-board { display: grid; grid-template-columns: repeat(8, 46px); gap: 4px; justify-content: center; margin: 10px 0; }
          .pa-cell { width: 46px; height: 46px; border-radius: 8px; background: var(--bg-elev); border: 1px solid var(--border);
            display: grid; place-items: center; font-size: 1.05rem; position: relative; }
          .pa-cell.safe { border-color: #22c55e; box-shadow: inset 0 0 0 2px #22c55e55; }
          .pa-cell.p1 { background: #1d4ed8; }
          .pa-cell.p2 { background: #b91c1c; }
          .pa-home { display: grid; grid-template-columns: repeat(6, 34px); gap: 4px; justify-content: center; margin-bottom: 8px; }
          .pa-hcell { width: 34px; height: 34px; border-radius: 8px; background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; }
          .pa-tok { cursor: pointer; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You home</div><div class="val" id="pa-h1">0/${TOKENS}</div></div>
          <div class="score-cell"><div class="label">Roll</div><div class="val" id="pa-roll-val">—</div></div>
          <div class="score-cell"><div class="label">AI home</div><div class="val" id="pa-h2">0/${TOKENS}</div></div>
        </div>
        <div class="status info" id="pa-status">Your turn — roll the cowries!</div>
        <div class="pa-home" id="pa-home"></div>
        <div class="pa-board" id="pa-board"></div>
        <div class="row" style="justify-content:center; gap:10px;">
          <span id="pa-cowries" style="font-size:1.2rem; letter-spacing:2px;">⚪⚪⚪⚪⚪</span>
          <button class="btn primary" id="pa-roll">🎲 Roll cowries</button>
        </div>
        <p class="hint" style="text-align:center;">6 to enter · exact roll to land home · ⭑ cells are safe</p>
      `;
      const boardEl = root.querySelector("#pa-board");
      const homeEl = root.querySelector("#pa-home");

      function render() {
        if (!boardEl) return;
        // home columns
        let hh = "";
        for (let p of [1, 2]) {
          hh += `<div style="display:flex; gap:4px;">`;
          for (let k = 0; k < HOMELEN; k++) {
            const cellIdx = LOOP + k;
            let content = "";
            for (const tp of [1, 2]) for (let t = 0; t < TOKENS; t++)
              if (tokens[tp][t] === cellIdx) content += tp === 1 ? "🔵" : "🔴";
            hh += `<div class="pa-hcell" style="${p === 1 ? "border-color:#3b82f6;" : "border-color:#ef4444;"}">${content}</div>`;
          }
          hh += `</div>`;
        }
        homeEl.innerHTML = hh;
        // loop: 24 cells in an 8×3 snake grid
        const snake = [];
        for (let c = 0; c < 8; c++) snake.push(c);
        for (let c = 7; c >= 0; c--) snake.push(15 - c + 0); // 8..15 right→left: 15,14,...,8
        for (let c = 0; c < 8; c++) snake.push(16 + c);
        let h = "";
        for (const cell of snake) {
          let cls = "pa-cell" + (SAFE.has(cell) ? " safe" : "");
          let content = SAFE.has(cell) ? "⭑" : "";
          const tok = [];
          for (const p of [1, 2]) for (let t = 0; t < TOKENS; t++) {
            const i = tokens[p][t];
            if (i >= 0 && i < LOOP && posOf(p, i) === cell) tok.push({p, t});
          }
          if (tok.length) {
            cls += " p" + tok[0].p;
            content = tok.map(x => x.p === 1 ? "🔵" : "🔴").join("");
            if (tok.some(x => x.p === 1)) content = `<span class="pa-tok" data-t="${tok.find(x => x.p === 1).t}">🔵</span>`;
          }
          h += `<div class="${cls}">${content}</div>`;
        }
        boardEl.innerHTML = h;
        const h1 = root.querySelector("#pa-h1"), h2 = root.querySelector("#pa-h2");
        if (h1) h1.textContent = moved[1] + "/" + TOKENS;
        if (h2) h2.textContent = moved[2] + "/" + TOKENS;
      }

      boardEl.addEventListener("click", e => {
        const t = e.target.closest(".pa-tok");
        if (t) humanTokenClick(+t.dataset.t);
      });
      root.querySelector("#pa-roll").addEventListener("click", () => {
        if (over) return;
        if (turn !== 1) {
          App.toast("Wait for the AI", "info");
          return;
        }
        doRoll();
      });

      render();
      return function cleanup() {
        alive = false;
        clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Pachisi Lite",
        "An ancient Indian race game (a Ludo/Parcheesi ancestor). You are blue, the AI is red — 2 tokens each." +
        "<br>Throw the five <b>cowries</b>: the roll is twice the mouths up; all down = 12 and you roll again." +
        "<br>A token needs a <b>6 to enter</b> the loop. Land exactly on an enemy token to <b>capture</b> it (back to start) and take an extra throw." +
        "<br>⭑ cells are <b>safe</b>. Go once around the loop and up your coloured column — an <b>exact roll</b> lands home. First to home both tokens wins.");
    },
  });
})();
