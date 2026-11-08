/* tablamorris — Nine Men's Morris (real rules).
   24 points on three concentric squares; place 9 pieces each, then move
   (and fly with 3 left); every mill (3-in-a-line) captures an enemy piece. */
(function () {
  "use strict";
  const PTS = [
    [0, 0], [3, 0], [6, 0], [0, 3], [6, 3], [0, 6], [3, 6], [6, 6],
    [1, 1], [3, 1], [5, 1], [1, 3], [5, 3], [1, 5], [3, 5], [5, 5],
    [2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4], [4, 4],
  ];
  const IDX = (r, c) => PTS.findIndex(([pr, pc]) => pr === r && pc === c);
  const MILLS = [
    [IDX(0, 0), IDX(3, 0), IDX(6, 0)], [IDX(1, 1), IDX(3, 1), IDX(5, 1)], [IDX(2, 2), IDX(3, 2), IDX(4, 2)],
    [IDX(0, 3), IDX(1, 3), IDX(2, 3)], [IDX(4, 3), IDX(5, 3), IDX(6, 3)], [IDX(2, 4), IDX(3, 4), IDX(4, 4)],
    [IDX(1, 5), IDX(3, 5), IDX(5, 5)], [IDX(0, 6), IDX(3, 6), IDX(6, 6)],
    [IDX(0, 0), IDX(0, 3), IDX(0, 6)], [IDX(1, 1), IDX(1, 3), IDX(1, 5)], [IDX(2, 2), IDX(2, 3), IDX(2, 4)],
    [IDX(3, 0), IDX(3, 1), IDX(3, 2)], [IDX(3, 4), IDX(3, 5), IDX(3, 6)], [IDX(4, 2), IDX(4, 3), IDX(4, 4)],
    [IDX(5, 1), IDX(5, 3), IDX(5, 5)], [IDX(6, 0), IDX(6, 3), IDX(6, 6)],
  ];
  const ADJ = PTS.map(() => []);
  // explicit adjacency (neighbors along drawn lines)
  const ADJ_PAIRS = [
    [0, 1], [1, 2], [0, 3], [2, 4], [3, 5], [4, 7], [5, 6], [6, 7],
    [8, 9], [9, 10], [8, 11], [10, 13], [11, 14], [13, 15], [14, 6], [15, 7],
    [16, 17], [17, 18], [16, 19], [18, 20], [19, 21], [20, 22], [21, 22], [22, 23],
    [1, 9], [9, 17], [3, 11], [11, 19], [4, 13], [13, 20], [6, 14], [14, 22],
  ];
  for (const [a, b] of ADJ_PAIRS) {
    ADJ[a].push(b);
    ADJ[b].push(a);
  }

  GameRegistry.register({
    id: "tablamorris",
    name: "Nine Men's Morris",
    icon: "🎯",
    category: "strategy",
    description: "The classic mill game — form 3-in-a-line to capture enemy pieces",
    tags: ["strategy", "classic", "board"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, over = false;
      let board = Array(24).fill(0); // 0 empty, 1 human, 2 ai
      let inHand = [9, 9], onBoard = [0, 0];
      let turn = 1; // 1 human, 2 ai
      let phase = "placing"; // placing | moving
      let selected = -1, mustCapture = 0, aiTimer = null, moveCount = 0;

      const S = 52, PAD = 34; // cell px
      const px = i => PAD + PTS[i][1] * S;
      const py = i => PAD + PTS[i][0] * S;

      function pieceCount(p) {
        return board.filter(v => v === p).length + inHand[p - 1];
      }

      function inMill(i) {
        const p = board[i];
        if (!p) return false;
        return MILLS.some(m => m.includes(i) && m.every(j => board[j] === p));
      }

      function formedMill(i) {
        const p = board[i];
        return MILLS.filter(m => m.includes(i) && m.every(j => board[j] === p)).length > 0;
      }

      function mobile(p) {
        if (inHand[p - 1] > 0) return true;
        const cnt = board.filter(v => v === p).length;
        if (cnt === 3) return board.some((v, i) => v === p); // flying
        return board.some((v, i) => v === p && ADJ[i].some(j => !board[j]));
      }

      function targets(i) {
        const p = board[i];
        const cnt = board.filter(v => v === p).length;
        if (cnt === 3) return board.map((v, j) => v ? -1 : j).filter(j => j >= 0);
        return ADJ[i].filter(j => !board[j]);
      }

      function capturable(p) { // enemy pieces removable (not in a mill unless all are)
        const enemy = p === 1 ? 2 : 1;
        const all = board.map((v, i) => v === enemy ? i : -1).filter(i => i >= 0);
        if (!all.length) return [];
        const open = all.filter(i => !inMill(i));
        return open.length ? open : all;
      }

      function checkEnd() {
        if (pieceCount(2) < 3 || !mobile(2)) {
          finish(1);
          return true;
        }
        if (pieceCount(1) < 3 || !mobile(1)) {
          finish(2);
          return true;
        }
        if (++moveCount > 200) {
          finish(0);
          return true;
        }
        return false;
      }

      function finish(w) {
        over = true;
        const st = root.querySelector("#nmm-status");
        if (w === 1) {
          st.textContent = "🎉 You win!";
          st.className = "status win";
          AudioFX.win();
          App.recordResult(true, moveCount);
        } else if (w === 2) {
          st.textContent = "The AI wins.";
          st.className = "status lose";
          AudioFX.lose();
          App.recordResult(false, moveCount);
        } else {
          st.textContent = "Draw (200 moves).";
          st.className = "status";
        }
      }

      function place(i, p) {
        board[i] = p;
        inHand[p - 1]--;
        onBoard[p - 1]++;
        if (inHand[0] + inHand[1] === 0) phase = "moving";
      }

      function move(i, j) {
        board[j] = board[i];
        board[i] = 0;
      }

      function afterAction(i, p) {
        if (formedMill(i)) {
          const caps = capturable(p);
          if (caps.length) {
            mustCapture = p;
            if (p === 1) {
              setStatus("Mill! Click an enemy piece to remove it.");
              render(-2);
              return false;
            }
            // AI captures: prefer pieces adjacent to potential mills
            const pick = caps[Math.floor(Math.random() * caps.length)];
            board[pick] = 0;
            onBoard[1]--;
            AudioFX.error();
          }
        }
        return true;
      }

      function humanClick(i) {
        if (over || turn !== 1) return;
        if (mustCapture === 1) {
          if (board[i] === 2 && capturable(1).includes(i)) {
            board[i] = 0;
            onBoard[1]--;
            mustCapture = 0;
            AudioFX.error();
            if (checkEnd()) {
              render();
              return;
            }
            endTurn();
          } else App.toast("Pick a removable enemy piece", "warning");
          render();
          return;
        }
        if (phase === "placing") {
          if (board[i]) {
            App.toast("Point occupied", "warning");
            return;
          }
          place(i, 1);
          AudioFX.pop();
          if (!afterAction(i, 1)) return;
          if (checkEnd()) {
            render();
            return;
          }
          endTurn();
        } else {
          if (selected < 0) {
            if (board[i] !== 1) {
              App.toast("Pick your piece first", "info");
              return;
            }
            selected = i;
            AudioFX.click();
          } else if (selected === i) {
            selected = -1;
          } else if (board[i] === 1) {
            selected = i;
            AudioFX.click();
          } else if (!board[i] && targets(selected).includes(i)) {
            move(selected, i);
            selected = -1;
            AudioFX.pop();
            if (!afterAction(i, 1)) return;
            if (checkEnd()) {
              render();
              return;
            }
            endTurn();
          } else App.toast("Not a legal move", "warning");
        }
        render();
      }

      function endTurn() {
        turn = turn === 1 ? 2 : 1;
        selected = -1;
        setStatus(turn === 1 ? statusForHuman() : "AI is thinking…");
        render();
        if (turn === 2 && !over) {
          aiTimer = setTimeout(() => {
            if (alive && !over) aiMove();
          }, 450);
        }
      }

      function statusForHuman() {
        return phase === "placing" ? "Place a piece on any empty point." : (selected >= 0 ? "Move to a highlighted point." : "Click one of your pieces to move it.");
      }

      function setStatus(t) {
        const st = root.querySelector("#nmm-status");
        if (st) {
          st.textContent = t;
          st.className = "status info";
        }
      }

      // ---- AI ----
      function aiMove() {
        const acts = [];
        if (phase === "placing") {
          for (let i = 0; i < 24; i++) if (!board[i]) acts.push({t: "place", i});
        } else {
          const cnt = board.filter(v => v === 2).length;
          for (let i = 0; i < 24; i++) if (board[i] === 2) {
            for (const j of targets(i)) acts.push({t: "move", i, j});
          }
          if (!acts.length) {
            finish(1);
            return;
          }
        }
        // score each action: mill formation big +, blocking human mill +, else 0
        let best = null, bestScore = -1e9;
        for (const a of acts) {
          const save = board.slice();
          if (a.t === "place") board[a.i] = 2; else {
            board[a.j] = 2;
            board[a.i] = 0;
          }
          let sc = Math.random() * 0.1;
          if (formedMill(a.t === "place" ? a.i : a.j)) sc += 10;
          for (const m of MILLS) {
            const hp = m.filter(j => board[j] === 1).length;
            if (hp === 2 && m.some(j => !board[j])) sc += 3; // block threat
          }
          const myNext = m2 => m2.filter(j => board[j] === 2).length;
          if (a.t === "move") {
            // avoid leaving a piece where human can capture pressure
            sc += 0.2 * ADJ[a.j].filter(j => board[j] === 2).length;
          }
          board = save;
          if (sc > bestScore) {
            bestScore = sc;
            best = a;
          }
        }
        if (phase === "placing") place(best.i, 2); else {
          move(best.i, best.j);
        }
        AudioFX.pop();
        afterAction(best.t === "place" ? best.i : best.j, 2);
        if (checkEnd()) {
          render();
          return;
        }
        endTurn();
      }

      // ---- render ----
      root.innerHTML = `
        <style>
          .nmm-svg { display: block; margin: 0 auto; background: var(--bg-elev); border-radius: 12px; }
          .nmm-pt { fill: var(--border); }
          .nmm-pt.sel { fill: #22d3ee; }
          .nmm-pt.tgt { fill: #4ade80; cursor: pointer; }
          .nmm-pc { cursor: pointer; }
          .nmm-line { stroke: var(--border); stroke-width: 2; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="nmm-h">9</div></div>
          <div class="score-cell"><div class="label">Phase</div><div class="val" id="nmm-ph">Placing</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="nmm-a">9</div></div>
        </div>
        <div class="status info" id="nmm-status">Place a piece on any empty point.</div>
        <svg class="nmm-svg" id="nmm-svg" viewBox="0 0 ${PAD * 2 + 6 * S} ${PAD * 2 + 6 * S}" width="360" height="360"></svg>
      `;
      const svg = root.querySelector("#nmm-svg");

      function render() {
        if (!svg) return;
        const marks = [];
        // square frames
        for (const [o, n] of [[0, 6], [1, 5], [2, 4]]) {
          marks.push(`<rect class="nmm-line" fill="none" x="${PAD + o * S}" y="${PAD + o * S}" width="${n * S}" height="${n * S}" rx="4"/>`);
        }
        marks.push(`<line class="nmm-line" x1="${px(IDX(3, 0))}" y1="${py(IDX(3, 0))}" x2="${px(IDX(3, 2))}" y2="${py(IDX(3, 2))}"/>`);
        marks.push(`<line class="nmm-line" x1="${px(IDX(3, 4))}" y1="${py(IDX(3, 4))}" x2="${px(IDX(3, 6))}" y2="${py(IDX(3, 6))}"/>`);
        marks.push(`<line class="nmm-line" x1="${px(IDX(0, 3))}" y1="${py(IDX(0, 3))}" x2="${px(IDX(2, 3))}" y2="${py(IDX(2, 3))}"/>`);
        marks.push(`<line class="nmm-line" x1="${px(IDX(4, 3))}" y1="${py(IDX(4, 3))}" x2="${px(IDX(6, 3))}" y2="${py(IDX(6, 3))}"/>`);
        const tg = selected >= 0 ? targets(selected) : [];
        PTS.forEach(([r, c], i) => {
          const cls = i === selected ? "nmm-pt sel" : (tg.includes(i) ? "nmm-pt tgt" : "nmm-pt");
          marks.push(`<circle class="${cls}" data-i="${i}" cx="${px(i)}" cy="${py(i)}" r="${board[i] ? 13 : 8}"/>`);
          if (board[i]) {
            const col = board[i] === 1 ? "#2563eb" : "#dc2626";
            marks.push(`<circle class="nmm-pc" data-i="${i}" cx="${px(i)}" cy="${py(i)}" r="12" fill="${col}" stroke="#fff" stroke-width="1.5"/>`);
          }
        });
        svg.innerHTML = marks.join("");
        const h = root.querySelector("#nmm-h"), a = root.querySelector("#nmm-a"), ph = root.querySelector("#nmm-ph");
        if (h) h.textContent = pieceCount(1);
        if (a) a.textContent = pieceCount(2);
        if (ph) ph.textContent = phase === "placing" ? "Placing" : "Moving";
      }

      svg.addEventListener("click", e => {
        const t = e.target.closest("[data-i]");
        if (t) humanClick(+t.dataset.i);
      });

      render();
      return function cleanup() {
        alive = false;
        clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Nine Men's Morris",
        "Two players each have 9 pieces." +
        "<br><b>1. Placing</b>: take turns placing pieces on empty points." +
        "<br><b>2. Moving</b>: once all pieces are placed, slide a piece to an adjacent empty point (with only 3 left, you may <i>fly</i> anywhere)." +
        "<br><b>Mills</b>: three of your pieces on one line = a mill → remove one enemy piece (not from a mill, if possible)." +
        "<br><b>Win</b>: reduce the enemy to 2 pieces or block all their moves.");
    },
  });
})();
