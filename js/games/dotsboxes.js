/* Dots and Boxes — players take turns drawing lines; completing a box claims it. Most boxes wins. */
(function () {
  // 4×4 dots → 3×3 boxes
  const DOTS = 4;

  let live = null;
  GameRegistry.register({
    id: "dotsboxes",
    name: "Dots and Boxes",
    icon: "⬜",
    category: "strategy",
    description: "Draw lines, complete boxes — vs AI",
    tags: ["strategy", "ai", "classic"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      // hLines[r][c] = horizontal line below dot (r,c) connecting to (r,c+1)
      // vLines[r][c] = vertical line below dot (r,c) connecting to (r+1,c)
      let hLines = [], vLines = [], owners = [], turn = "P", over = false, aiTimer = null;
      const scores = {P: 0, A: 0};

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="db-p">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="db-turn">You</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="db-a">0</div></div>
        </div>
        <div class="status info" id="db-status">Click a line between two dots to draw it.</div>
        <div class="center" style="margin:14px 0;">
          <svg id="db-svg" viewBox="0 0 280 280" style="max-width:380px;width:100%;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);"></svg>
        </div>
        <p class="hint">Take turns drawing lines between adjacent dots. Completing the 4th side of a box claims it (and you go again). Most boxes wins.</p>
      `;
      const statusEl = root.querySelector("#db-status");
      const svgEl = root.querySelector("#db-svg");
      const CELL = 70, PAD = 20;

      function reset() {
        hLines = Array.from({length: DOTS}, () => Array(DOTS - 1).fill(false));
        vLines = Array.from({length: DOTS - 1}, () => Array(DOTS).fill(false));
        owners = Array.from({length: DOTS - 1}, () => Array(DOTS - 1).fill(null));
        scores.P = 0;
        scores.A = 0;
        turn = "P";
        over = false;
      }

      function checkBox(r, c) {
        if (r < 0 || r >= DOTS - 1 || c < 0 || c >= DOTS - 1) return false;
        return hLines[r][c] && hLines[r + 1][c] && vLines[r][c] && vLines[r][c + 1];
      }

      function tryClaim(player) {
        let claimed = 0;
        for (let r = 0; r < DOTS - 1; r++) for (let c = 0; c < DOTS - 1; c++) {
          if (owners[r][c] === null && checkBox(r, c)) {
            owners[r][c] = player;
            scores[player]++;
            claimed++;
          }
        }
        return claimed;
      }

      function dotPos(r, c) {
        return [PAD + c * CELL, PAD + r * CELL];
      }

      function render() {
        svgEl.innerHTML = "";
        // Boxes (drawn first, behind lines)
        for (let r = 0; r < DOTS - 1; r++) for (let c = 0; c < DOTS - 1; c++) {
          if (owners[r][c]) {
            const [x, y] = dotPos(r, c);
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
            rect.setAttribute("width", CELL);
            rect.setAttribute("height", CELL);
            rect.setAttribute("fill", owners[r][c] === "P" ? "var(--accent)" : "var(--accent-2)");
            rect.setAttribute("opacity", "0.25");
            svgEl.appendChild(rect);
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", x + CELL / 2);
            t.setAttribute("y", y + CELL / 2 + 8);
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("font-size", "28");
            t.setAttribute("font-weight", "700");
            t.setAttribute("font-family", "var(--font-heading)");
            t.setAttribute("fill", owners[r][c] === "P" ? "var(--accent)" : "var(--accent-2)");
            t.textContent = owners[r][c] === "P" ? "P" : "A";
            svgEl.appendChild(t);
          }
        }
        // Dots
        for (let r = 0; r < DOTS; r++) for (let c = 0; c < DOTS; c++) {
          const [x, y] = dotPos(r, c);
          const d = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          d.setAttribute("cx", x);
          d.setAttribute("cy", y);
          d.setAttribute("r", 4);
          d.setAttribute("fill", "var(--text)");
          svgEl.appendChild(d);
        }
        // Horizontal lines (clickable)
        for (let r = 0; r < DOTS; r++) for (let c = 0; c < DOTS - 1; c++) {
          const [x1, y1] = dotPos(r, c);
          const [x2, y2] = dotPos(r, c + 1);
          if (hLines[r][c]) {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute("x1", x1);
            l.setAttribute("y1", y1);
            l.setAttribute("x2", x2);
            l.setAttribute("y2", y2);
            l.setAttribute("stroke", "var(--accent)");
            l.setAttribute("stroke-width", "3");
            svgEl.appendChild(l);
          } else {
            const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
            hit.setAttribute("x1", x1);
            hit.setAttribute("y1", y1);
            hit.setAttribute("x2", x2);
            hit.setAttribute("y2", y2);
            hit.setAttribute("stroke", "transparent");
            hit.setAttribute("stroke-width", "16");
            hit.style.cursor = (turn === "P" && !over) ? "pointer" : "default";
            hit.addEventListener("click", () => playMove("h", r, c));
            svgEl.appendChild(hit);
          }
        }
        // Vertical lines
        for (let r = 0; r < DOTS - 1; r++) for (let c = 0; c < DOTS; c++) {
          const [x1, y1] = dotPos(r, c);
          const [x2, y2] = dotPos(r + 1, c);
          if (vLines[r][c]) {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute("x1", x1);
            l.setAttribute("y1", y1);
            l.setAttribute("x2", x2);
            l.setAttribute("y2", y2);
            l.setAttribute("stroke", "var(--accent)");
            l.setAttribute("stroke-width", "3");
            svgEl.appendChild(l);
          } else {
            const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
            hit.setAttribute("x1", x1);
            hit.setAttribute("y1", y1);
            hit.setAttribute("x2", x2);
            hit.setAttribute("y2", y2);
            hit.setAttribute("stroke", "transparent");
            hit.setAttribute("stroke-width", "16");
            hit.style.cursor = (turn === "P" && !over) ? "pointer" : "default";
            hit.addEventListener("click", () => playMove("v", r, c));
            svgEl.appendChild(hit);
          }
        }
        root.querySelector("#db-p").textContent = scores.P;
        root.querySelector("#db-a").textContent = scores.A;
        root.querySelector("#db-turn").textContent = over ? "—" : (turn === "P" ? "You" : "AI");
      }

      function playMove(type, r, c) {
        if (over || turn !== "P") return;
        if (type === "h" && hLines[r][c]) return;
        if (type === "v" && vLines[r][c]) return;
        if (type === "h") hLines[r][c] = true; else vLines[r][c] = true;
        AudioFX.place();
        const claimed = tryClaim("P");
        render();
        if (checkOver()) return;
        if (claimed === 0) turn = "A";
        if (turn === "A") {
          statusEl.textContent = "AI thinking…";
          statusEl.className = "status info";
          aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiMove();
          }, 600);
        } else {
          statusEl.textContent = claimed > 0 ? `You claimed ${claimed} box${claimed === 1 ? "" : "s"}! Go again.` : "Your turn.";
          statusEl.className = "status info";
        }
      }

      function aiMove() {
        if (over || turn !== "A") return;
        // Find lines that don't complete a 3-side box (avoid giving player a free box)
        const allMoves = [];
        for (let r = 0; r < DOTS; r++) for (let c = 0; c < DOTS - 1; c++) {
          if (!hLines[r][c]) allMoves.push({type: "h", r, c});
        }
        for (let r = 0; r < DOTS - 1; r++) for (let c = 0; c < DOTS; c++) {
          if (!vLines[r][c]) allMoves.push({type: "v", r, c});
        }
        if (!allMoves.length) return;
        // 1. Try moves that claim a box (3-sided boxes)
        const claimMoves = allMoves.filter(m => {
          if (m.type === "h") {
            // Check boxes above (r-1, c) and below (r, c)
            if (r >= 1 && hLines[r - 1][c] && vLines[r - 1][c] && vLines[r - 1][c + 1] && !hLines[r][c]) return true;
            if (r < DOTS - 1 && hLines[r + 1][c] && vLines[r][c] && vLines[r][c + 1]) return true;
          } else {
            if (c >= 1 && vLines[r][c - 1] && hLines[r][c - 1] && hLines[r + 1][c - 1]) return true;
            if (c < DOTS - 1 && vLines[r][c + 1] && hLines[r][c] && hLines[r + 1][c]) return true;
          }
          return false;
        });
        let move;
        if (claimMoves.length) move = claimMoves[Math.floor(Math.random() * claimMoves.length)];
        else {
          // Avoid moves that create 3-sided boxes
          const safe = allMoves.filter(m => {
            if (m.type === "h") {
              if (m.r >= 1) {
                const sides = hLines[m.r - 1][m.c] ? 1 : 0;
                sides += vLines[m.r - 1][m.c] ? 1 : 0;
                sides += vLines[m.r - 1][m.c + 1] ? 1 : 0;
                if (sides === 2) return false;
              }
              if (m.r < DOTS - 1) {
                const sides = hLines[m.r + 1][m.c] ? 1 : 0;
                sides += vLines[m.r][m.c] ? 1 : 0;
                sides += vLines[m.r][m.c + 1] ? 1 : 0;
                if (sides === 2) return false;
              }
            } else {
              if (m.c >= 1) {
                const sides = vLines[m.r][m.c - 1] ? 1 : 0;
                sides += hLines[m.r][m.c - 1] ? 1 : 0;
                sides += hLines[m.r + 1][m.c - 1] ? 1 : 0;
                if (sides === 2) return false;
              }
              if (m.c < DOTS - 1) {
                const sides = vLines[m.r][m.c + 1] ? 1 : 0;
                sides += hLines[m.r][m.c] ? 1 : 0;
                sides += hLines[m.r + 1][m.c] ? 1 : 0;
                if (sides === 2) return false;
              }
            }
            return true;
          });
          move = (safe.length ? safe : allMoves)[Math.floor(Math.random() * (safe.length ? safe.length : allMoves.length))];
        }
        if (move.type === "h") hLines[move.r][move.c] = true; else vLines[move.r][move.c] = true;
        AudioFX.move();
        const claimed = tryClaim("A");
        render();
        if (checkOver()) return;
        if (claimed > 0) {
          statusEl.textContent = `AI claimed ${claimed} box${claimed === 1 ? "" : "s"}. AI goes again.`;
          statusEl.className = "status info";
          aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiMove();
          }, 600);
        } else {
          turn = "P";
          statusEl.textContent = "Your turn.";
          statusEl.className = "status info";
        }
      }

      function checkOver() {
        const total = (DOTS - 1) * (DOTS - 1);
        if (scores.P + scores.A === total) {
          over = true;
          if (scores.P > scores.A) {
            statusEl.textContent = `🎉 You win ${scores.P}–${scores.A}!`;
            statusEl.className = "status win";
            AudioFX.win();
            Storage.submitScore("dotsboxes", (Storage.getBest("dotsboxes") || 0) + 1);
          } else if (scores.A > scores.P) {
            statusEl.textContent = `AI wins ${scores.A}–${scores.P}.`;
            statusEl.className = "status lose";
            AudioFX.lose();
          } else {
            statusEl.textContent = `Tie ${scores.P}–${scores.A}.`;
            statusEl.className = "status info";
          }
          return true;
        }
        return false;
      }

      function newGame() {
        if (aiTimer) clearTimeout(aiTimer);
        reset();
        statusEl.textContent = "Click a line between two dots to draw it.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (!over) App.toast("Try to complete boxes by drawing the 4th side.", "info");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        if (aiTimer) clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Dots and Boxes",
        `Players alternate drawing a single line between two adjacent dots.
        <br><br>If your line <b>completes the fourth side</b> of a 1×1 box, you claim that box (it gets your color) and you get to draw <b>another line</b>.
        <br><br>The game ends when all boxes are claimed. <b>Most boxes wins.</b>
        <br><br>Strategy: avoid drawing the third side of a box (it hands a free box to your opponent).`);
    },
  });
})();
