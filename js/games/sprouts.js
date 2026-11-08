/* sprouts — Conway's Sprouts (real rules, two players hot-seat).
   Connect two spots with a curve; a fresh spot appears on it. Each spot
   supports at most 3 links. The player who makes the last move wins. */
(function () {
  "use strict";
  const N_SPOTS = 4;

  GameRegistry.register({
    id: "sprouts",
    name: "Sprouts",
    icon: "🌱",
    category: "strategy",
    description: "Conway's pencil game — connect spots, grow new ones, make the last move",
    tags: ["strategy", "classic", "2p"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "2p",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, over = false, moveNo = 0;
      let spots = []; // {x, y, links}
      let curves = []; // {path: [pts], a, b, mid: spotIdx}
      let pickA = -1, turn = 1;

      function newGame() {
        spots = [];
        curves = [];
        pickA = -1;
        turn = 1;
        over = false;
        moveNo = 0;
        for (let i = 0; i < N_SPOTS; i++) {
          spots.push({
            x: 100 + 160 * (i % 2) + (Math.random() * 40 - 20),
            y: 90 + 130 * Math.floor(i / 2) + (Math.random() * 40 - 20),
            links: 0
          });
        }
        setStatus("Player 1: click a spot to start a curve.");
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#sp-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function alive_(s) {
        return s.links < 3;
      }

      function anyMove() {
        return spots.some(alive_);
      }

      function clickSpot(i) {
        if (over) return;
        const s = spots[i];
        if (!alive_(s)) {
          App.toast("That spot is full (3 links)", "warning");
          return;
        }
        if (pickA < 0) {
          pickA = i;
          AudioFX.click();
          setStatus(`Player ${turn}: now click the second spot (or the same one for a loop).`);
          render();
          return;
        }
        const a = pickA;
        pickA = -1;
        if (!alive_(spots[a])) {
          setStatus(`Player ${turn}: pick a starting spot.`);
          render();
          return;
        }
        // draw curve a→i, new spot on it
        const mx = (spots[a].x + spots[i].x) / 2 + (Math.random() * 50 - 25);
        const my = (spots[a].y + spots[i].y) / 2 + (Math.random() * 50 - 25);
        const mid = spots.length;
        spots.push({x: mx, y: my, links: 0});
        curves.push({a, b: i, mid, bend: Math.random() * 0.6 + 0.2});
        spots[a].links++;
        spots[i].links++;
        spots[mid].links = 2;
        moveNo++;
        AudioFX.pop();
        if (!anyMove()) {
          over = true;
          setStatus(`🎉 Player ${turn} made the last move and wins! (${moveNo} moves)`, "win");
          AudioFX.win();
          App.recordResult(turn === 1, moveNo);
          render();
          return;
        }
        turn = turn === 1 ? 2 : 1;
        setStatus(`Player ${turn}: click a spot to start a curve.`);
        render();
      }

      root.innerHTML = `
        <style>
          .sp-svg { display: block; margin: 0 auto; background: var(--bg-elev); border-radius: 12px; }
          .sp-spot { fill: #4ade80; cursor: pointer; }
          .sp-spot.full { fill: #94a3b8; }
          .sp-spot.pick { fill: #22d3ee; }
          .sp-curve { fill: none; stroke: #cbd5e1; stroke-width: 3; stroke-linecap: round; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Move</div><div class="val" id="sp-mv">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="sp-tn">P1</div></div>
          <div class="score-cell"><div class="label">Spots</div><div class="val" id="sp-ct">4</div></div>
        </div>
        <div class="status info" id="sp-status"></div>
        <svg class="sp-svg" id="sp-svg" viewBox="0 0 480 360" width="480" style="max-width:100%;"></svg>
        <div class="row" style="justify-content:center;"><button class="btn" id="sp-new">↺ New game</button></div>
      `;
      const svg = root.querySelector("#sp-svg");

      function curvePath(c) {
        const A = spots[c.a], B = spots[c.b], M = spots[c.mid];
        return `M ${A.x} ${A.y} Q ${(A.x + M.x) / 2 + c.bend * (M.y - A.y)} ${(A.y + M.y) / 2 - c.bend * (M.x - A.x)} ${M.x} ${M.y} ` +
          `Q ${(M.x + B.x) / 2 + c.bend * (B.y - M.y)} ${(M.y + B.y) / 2 - c.bend * (B.x - M.x)} ${B.x} ${B.y}`;
      }

      function render() {
        if (!svg) return;
        let html = "";
        for (const c of curves) html += `<path class="sp-curve" d="${curvePath(c)}"/>`;
        spots.forEach((s, i) => {
          const cls = i === pickA ? "sp-spot pick" : (s.links >= 3 ? "sp-spot full" : "sp-spot");
          html += `<circle class="${cls}" data-i="${i}" cx="${s.x}" cy="${s.y}" r="13"/>` +
            `<text x="${s.x}" y="${s.y + 4}" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a" pointer-events="none">${3 - s.links}</text>`;
        });
        svg.innerHTML = html;
        const mv = root.querySelector("#sp-mv"), tn = root.querySelector("#sp-tn"), ct = root.querySelector("#sp-ct");
        if (mv) mv.textContent = moveNo;
        if (tn) tn.textContent = "P" + turn;
        if (ct) ct.textContent = spots.length;
      }

      svg.addEventListener("click", e => {
        const t = e.target.closest("[data-i]");
        if (t) clickSpot(+t.dataset.i);
      });
      root.querySelector("#sp-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Sprouts",
        "A pencil-and-paper game by Conway & Paterson. Two players take turns." +
        "<br>On your turn, <b>connect two spots</b> with a curve (a spot may connect to itself as a loop), then a <b>new spot</b> appears on your curve." +
        "<br>Each spot can have at most <b>3 links</b> — the number shows how many are left." +
        "<br>The player who draws the <b>last legal curve wins</b>. Try to leave your opponent without moves!" +
        "<br><i>Casual variant: curves may cross each other (the classic paper rule forbids it).</i>");
    },
  });
})();
