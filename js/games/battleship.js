/* Battleship — find and sink all 5 enemy ships before the AI sinks yours */
(function () {
  const SHIPS = [5, 4, 3, 3, 2]; // carrier, battleship, cruiser, sub, destroyer
  const SIZE = 10;

  function placeShips() {
    const b = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    for (const len of SHIPS) {
      let placed = false, tries = 0;
      while (!placed && tries < 200) {
        tries++;
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? SIZE : SIZE - len + 1));
        const c = Math.floor(Math.random() * (horiz ? SIZE - len + 1 : SIZE));
        let ok = true;
        if (horiz) {
          for (let i = 0; i < len; i++) if (b[r][c + i] !== 0) {
            ok = false;
            break;
          }
        } else {
          for (let i = 0; i < len; i++) if (b[r + i][c] !== 0) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        if (horiz) for (let i = 0; i < len; i++) b[r][c + i] = 1;
        else for (let i = 0; i < len; i++) b[r + i][c] = 1;
        placed = true;
      }
    }
    return b;
  }

  function countRemaining(board) {
    return board.flat().filter(v => v === 1).length;
  }

  GameRegistry.register({
    id: "battleship",
    name: "Battleship",
    icon: "🚢",
    category: "strategy",
    description: "Sink all 5 enemy ships before AI sinks yours",
    tags: ["strategy", "classic", "ai"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      let playerShips, aiShips, playerShots, aiShots, turn, over, winner, hitsOnPlayer, hitsOnAI;
      // AI memory: parity targeting
      let aiQueue = [];
      let aiHits = [];

      function newGame() {
        playerShips = placeShips();
        aiShips = placeShips();
        playerShots = Array.from({length: SIZE}, () => Array(SIZE).fill(0)); // 0=unknown, 1=miss, 2=hit
        aiShots = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
        turn = "player";
        over = false;
        winner = null;
        hitsOnPlayer = 0;
        hitsOnAI = 0;
        aiQueue = [];
        aiHits = [];
        render();
      }

      root.innerHTML = `
        <div class="status info" id="bs-status">Tap a cell on the enemy grid to fire</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Enemy hits</div><div class="val" id="bs-e">0/${SHIPS.reduce((a, b) => a + b, 0)}</div></div>
          <div class="score-cell"><div class="label">Your hits</div><div class="val" id="bs-y">0/${SHIPS.reduce((a, b) => a + b, 0)}</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="bs-turn">You</div></div>
        </div>
        <div class="row" style="justify-content:center;gap:24px;flex-wrap:wrap;">
          <div class="col">
            <div class="text-sm text-muted center" style="margin-bottom:6px;">Enemy fleet — fire here</div>
            <div id="bs-enemy" style="display:inline-block;"></div>
          </div>
          <div class="col">
            <div class="text-sm text-muted center" style="margin-bottom:6px;">Your fleet</div>
            <div id="bs-yours" style="display:inline-block;"></div>
          </div>
        </div>
        <p class="hint">Click an enemy cell to fire. Press <b>R</b> to restart.</p>
      `;

      const enemyEl = root.querySelector("#bs-enemy");
      const yoursEl = root.querySelector("#bs-yours");
      const statusEl = root.querySelector("#bs-status");

      function makeBoard(el, board, shots, interactive) {
        el.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "bs-board";
        grid.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement("div");
            cell.className = "bs-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            if (interactive) {
              // Show enemy grid — only show shots
              if (shots[r][c] === 1) {
                cell.classList.add("miss");
                cell.textContent = "•";
              } else if (shots[r][c] === 2) {
                cell.classList.add("hit");
                cell.textContent = "💥";
              } else if (over && board[r][c] === 1) {
                cell.classList.add("sunk");
                cell.textContent = "🚢";
              }
              cell.addEventListener("click", () => fire(r, c));
            } else {
              // Show player's own fleet + AI's shots
              if (board[r][c] === 1) cell.style.background = "var(--accent-soft)";
              if (shots[r][c] === 1) {
                cell.classList.add("miss");
                cell.textContent = "•";
              } else if (shots[r][c] === 2) {
                cell.classList.add("hit");
                cell.textContent = "💥";
              }
            }
            grid.appendChild(cell);
          }
        }
        el.appendChild(grid);
      }

      function render() {
        makeBoard(enemyEl, aiShips, playerShots, true);
        makeBoard(yoursEl, playerShips, aiShots, false);
        root.querySelector("#bs-e").textContent = `${hitsOnAI}/${SHIPS.reduce((a, b) => a + b, 0)}`;
        root.querySelector("#bs-y").textContent = `${hitsOnPlayer}/${SHIPS.reduce((a, b) => a + b, 0)}`;
        root.querySelector("#bs-turn").textContent = over ? (winner === "player" ? "You won" : "AI won") : (turn === "player" ? "You" : "AI");
      }

      function fire(r, c) {
        if (over || turn !== "player") return;
        if (playerShots[r][c] !== 0) return;
        const hit = aiShips[r][c] === 1;
        playerShots[r][c] = hit ? 2 : 1;
        if (hit) {
          hitsOnAI++;
          AudioFX.pop();
          statusEl.textContent = "Hit! Fire again.";
          statusEl.className = "status win";
        } else {
          AudioFX.move();
          statusEl.textContent = "Miss. AI's turn…";
          statusEl.className = "status info";
        }
        if (hitsOnAI === SHIPS.reduce((a, b) => a + b, 0)) {
          win("player");
          return;
        }
        if (hit) {
          render();
          return;
        }
        turn = "ai";
        render();
        later(aiFire, 700);
      }

      function aiFire() {
        if (over) return;
        let r, c;
        if (aiQueue.length) {
          [r, c] = aiQueue.shift();
        } else {
          // Random with parity (only fire on checkerboard to cover both orientations efficiently)
          do {
            r = Math.floor(Math.random() * SIZE);
            c = Math.floor(Math.random() * SIZE);
          } while (aiShots[r][c] !== 0 || (r + c) % 2 !== 0);
        }
        if (aiShots[r][c] !== 0) {
          aiFire();
          return;
        }
        const hit = playerShips[r][c] === 1;
        aiShots[r][c] = hit ? 2 : 1;
        if (hit) {
          hitsOnPlayer++;
          AudioFX.error();
          aiHits.push([r, c]);
          // Add neighbors to queue
          const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && aiShots[nr][nc] === 0) aiQueue.push([nr, nc]);
          }
          statusEl.textContent = "AI hit your ship!";
          statusEl.className = "status lose";
        } else {
          AudioFX.move();
          statusEl.textContent = "AI missed. Your turn.";
          statusEl.className = "status info";
        }
        if (hitsOnPlayer === SHIPS.reduce((a, b) => a + b, 0)) {
          win("ai");
          return;
        }
        if (hit) {
          render();
          later(aiFire, 700);
          return;
        }
        turn = "player";
        render();
      }

      function win(who) {
        over = true;
        winner = who;
        if (who === "player") {
          statusEl.textContent = "🎉 Victory! All enemy ships sunk.";
          statusEl.className = "status win";
          AudioFX.win();
          Storage.submitScore("battleship", (Storage.getBest("battleship") || 0) + 1);
        } else {
          statusEl.textContent = "💀 Your fleet has been destroyed.";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);

      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Battleship",
        `You and the AI each have 5 ships hidden on your own 10×10 grid (sizes 5, 4, 3, 3, 2 — auto-placed randomly).
        <br><br>Take turns firing at the enemy grid. Click an enemy cell to fire. If you hit, you get another turn. If you miss, the AI fires.
        <br><br>Sink all enemy ship segments (17 total) before the AI sinks yours. The AI uses "hunt and target" logic — after a hit, it tries adjacent cells. Press <b>R</b> to restart.`);
    },
  });
})();
