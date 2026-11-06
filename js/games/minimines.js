/* Mini Minesweeper — 5x5 with 4 mines. Quick rounds. */
(function () {
  const N = 5, MINES = 4;
  let live = null;

  function inB(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  GameRegistry.register({
    id: "minimines",
    name: "Mini Minesweeper",
    icon: "💣",
    category: "logic",
    description: "5×5 minesweeper with 4 mines — quick rounds",
    tags: ["puzzle", "logic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, started, over, flags, revealed, total, time, timerInt;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mines</div><div class="val" id="mi-mines">4</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="mi-time">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mi-best">-</div></div>
        </div>
        <div class="status info" id="mi-status">Click a cell to start. Right-click / long-press to flag.</div>
        <div class="center"><div id="mi-grid" class="mw-board" style="grid-template-columns:repeat(${N},40px);"></div></div>
        <p class="hint">Reveal all safe cells. <b>R</b> new round.</p>
      `;
      const gridEl = root.querySelector("#mi-grid");
      const statusEl = root.querySelector("#mi-status");
      root.querySelector("#mi-best").textContent = Storage.getBest("minimines") ?? "-";

      function newGame() {
        b = Array.from({length: N}, () => Array.from({length: N}, () => ({
          mine: false,
          n: 0,
          revealed: false,
          flagged: false
        })));
        started = false;
        over = false;
        flags = 0;
        revealed = 0;
        total = N * N - MINES;
        time = 0;
        clearInterval(timerInt);
        statusEl.textContent = "Click a cell to start. Right-click / long-press to flag.";
        statusEl.className = "status info";
        root.querySelector("#mi-time").textContent = 0;
        render();
      }

      function startGame(r, c) {
        // place mines avoiding (r,c) + neighbors
        let placed = 0;
        while (placed < MINES) {
          const rr = Math.floor(Math.random() * N), cc = Math.floor(Math.random() * N);
          if (b[rr][cc].mine) continue;
          if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1) continue;
          b[rr][cc].mine = true;
          placed++;
        }
        for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) {
          if (b[rr][cc].mine) continue;
          let n = 0;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = rr + dr, nc = cc + dc;
            if (inB(nr, nc) && b[nr][nc].mine) n++;
          }
          b[rr][cc].n = n;
        }
        started = true;
        timerInt = setInterval(() => {
          if (!alive) return;
          if (!alive) return clearInterval(timerInt);
          time++;
          root.querySelector("#mi-time").textContent = time;
        }, 1000);
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = b[r][c];
          const el = document.createElement("div");
          el.className = "mw-cell";
          el.style.width = "40px";
          el.style.height = "40px";
          el.style.fontSize = "1.1rem";
          if (cell.revealed) {
            el.classList.add("revealed");
            if (cell.mine) {
              el.classList.add("mine");
              el.textContent = "💣";
            } else if (cell.n > 0) {
              el.dataset.n = cell.n;
              el.textContent = cell.n;
            }
          } else if (cell.flagged) {
            el.classList.add("flagged");
            el.textContent = "🚩";
          }
          el.addEventListener("click", () => onLeft(r, c));
          el.addEventListener("contextmenu", e => {
            e.preventDefault();
            onFlag(r, c);
          });
          let pt;
          el.addEventListener("touchstart", () => {
            pt = setTimeout(() => {
              if (!alive) return;
              if (!alive) return;
              if (alive) onFlag(r, c);
              pt = null;
            }, 350);
          });
          el.addEventListener("touchend", () => {
            if (pt) clearTimeout(pt);
          });
          gridEl.appendChild(el);
        }
        root.querySelector("#mi-mines").textContent = MINES - flags;
      }

      function flood(r, c) {
        const stack = [[r, c]];
        while (stack.length) {
          const [cr, cc] = stack.pop();
          if (!inB(cr, cc)) continue;
          const cell = b[cr][cc];
          if (cell.revealed || cell.flagged || cell.mine) continue;
          cell.revealed = true;
          revealed++;
          if (cell.n === 0) {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
              if (dr || dc) stack.push([cr + dr, cc + dc]);
            }
          }
        }
      }

      function onLeft(r, c) {
        if (over) return;
        if (b[r][c].flagged) return;
        if (!started) startGame(r, c);
        if (b[r][c].mine) {
          b[r][c].revealed = true;
          over = true;
          clearInterval(timerInt);
          statusEl.textContent = "💥 Boom!";
          statusEl.className = "status lose";
          AudioFX.lose();
          for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (b[rr][cc].mine) b[rr][cc].revealed = true;
          render();
          return;
        }
        flood(r, c);
        AudioFX.reveal();
        if (revealed === total) {
          over = true;
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Cleared in ${time}s!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("minimines");
          if (best === null || time < best) {
            Storage.setBest("minimines", time);
            App.toast("New best: " + time + "s", "success");
            root.querySelector("#mi-best").textContent = time;
          }
          for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (b[rr][cc].mine) b[rr][cc].flagged = true;
          flags = MINES;
        }
        render();
      }

      function onFlag(r, c) {
        if (over || !started) return;
        const cell = b[r][c];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        flags += cell.flagged ? 1 : -1;
        AudioFX.click();
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);

      live = {hint: null, solve: null};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
      };
    },
    help: function () {
      App.showModal("How to play Mini Minesweeper",
        `A bite-sized 5×5 minesweeper. 4 mines are hidden.
        <br><br>Click a cell to reveal. The number tells you how many mines touch it. Right-click or long-press to flag a suspected mine.
        <br>Reveal all safe cells to win. First click is always safe. Best time is saved.`);
    },
  });
})();
