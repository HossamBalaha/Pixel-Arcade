/* Mancala — ancient seed-sowing strategy game vs AI. */
(function () {
  // 6 pits per player + 2 stores. Player's pits are indices 0-5; AI's are 7-12; player store = 6; AI store = 13.
  const PITS = 14;
  const SEEDS = 4;

  let live = null;
  GameRegistry.register({
    id: "mancala",
    name: "Mancala",
    icon: "🫘",
    category: "strategy",
    description: "Ancient seed-sowing strategy game vs AI",
    tags: ["strategy", "ai", "classic"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let board = [], turn = "P", over = false, aiTimer = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="mn-p">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="mn-turn">You</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="mn-a">0</div></div>
        </div>
        <div class="status info" id="mn-status">Click one of your pits (bottom row) to sow the seeds.</div>
        <div class="center" style="margin:14px 0;">
          <svg id="mn-svg" viewBox="0 0 360 200" style="max-width:480px;width:100%;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);"></svg>
        </div>
        <p class="hint">Sow all seeds from a pit, one per pit counter-clockwise. Skip opponent's store. Land in your store = extra turn. Land empty in your pit = capture (your pit + opposite). Most seeds in store at end wins.</p>
      `;
      const statusEl = root.querySelector("#mn-status");
      const svgEl = root.querySelector("#mn-svg");

      function reset() {
        board = Array(PITS).fill(SEEDS);
        board[6] = 0;
        board[13] = 0;
        turn = "P";
        over = false;
      }

      function isPlayerPit(i) {
        return i >= 0 && i <= 5;
      }

      function isAiPit(i) {
        return i >= 7 && i <= 12;
      }

      function playerStore() {
        return 6;
      }

      function aiStore() {
        return 13;
      }

      function opponentStore() {
        return turn === "P" ? aiStore() : playerStore();
      }

      function ownStore() {
        return turn === "P" ? playerStore() : aiStore();
      }

      function ownPit(i) {
        return turn === "P" ? isPlayerPit(i) : isAiPit(i);
      }

      function sow(start) {
        let n = board[start];
        board[start] = 0;
        let i = start;
        let last = start;
        while (n > 0) {
          i = (i + 1) % PITS;
          if (i === opponentStore()) continue; // skip opponent's store
          board[i]++;
          n--;
          last = i;
        }
        // Extra turn if last in own store
        let extra = (last === ownStore());
        // Capture: last in empty own pit → take that pit + opposite
        if (ownPit(last) && board[last] === 1) {
          const opposite = PITS - 2 - last; // 0↔12, 1↔11, 2↔10, 3↔9, 4↔8, 5↔7
          if (board[opposite] > 0) {
            board[ownStore()] += board[opposite] + board[last];
            board[opposite] = 0;
            board[last] = 0;
          }
        }
        return {extra, last};
      }

      function checkGameOver() {
        const pEmpty = board.slice(0, 6).every(v => v === 0);
        const aEmpty = board.slice(7, 13).every(v => v === 0);
        if (pEmpty || aEmpty) {
          // Collect remaining
          for (let i = 0; i < 6; i++) {
            board[6] += board[i];
            board[i] = 0;
          }
          for (let i = 7; i < 13; i++) {
            board[13] += board[i];
            board[i] = 0;
          }
          over = true;
          const ps = board[6], as = board[13];
          if (ps > as) {
            statusEl.textContent = `🎉 You win ${ps}–${as}!`;
            statusEl.className = "status win";
            AudioFX.win();
            Storage.submitScore("mancala", (Storage.getBest("mancala") || 0) + 1);
          } else if (as > ps) {
            statusEl.textContent = `AI wins ${as}–${ps}.`;
            statusEl.className = "status lose";
            AudioFX.lose();
          } else {
            statusEl.textContent = `Tie ${ps}–${as}.`;
            statusEl.className = "status info";
          }
          return true;
        }
        return false;
      }

      function render() {
        svgEl.innerHTML = "";
        const W = 360, H = 200;
        // Layout:
        //   - AI store (left): vertical rectangle, x=5..35
        //   - Player store (right): vertical rectangle, x=325..355
        //   - Top row: AI pits 12,11,10,9,8,7 (left→right)
        //   - Bottom row: player pits 0,1,2,3,4,5 (left→right)
        //   - 6 pit columns between the stores, evenly spaced with no overlap
        const pitR = 20;
        const storeX = 5;            // left store x; right store mirrors with offset 320
        const storeW = 30, storeH = 160, storeY = 20;
        const pitCx = (i) => 60 + i * 48;   // 60, 108, 156, 204, 252, 300
        const topCy = 60, botCy = 140;
        // Draw stores
        const drawStore = (x, label, count) => {
          const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          r.setAttribute("x", x);
          r.setAttribute("y", storeY);
          r.setAttribute("width", storeW);
          r.setAttribute("height", storeH);
          r.setAttribute("rx", 8);
          r.setAttribute("fill", "var(--bg-soft)");
          r.setAttribute("stroke", "var(--border)");
          r.setAttribute("stroke-width", "1");
          svgEl.appendChild(r);
          // Label (small, near top of store)
          const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
          lab.setAttribute("x", x + storeW / 2);
          lab.setAttribute("y", storeY + 14);
          lab.setAttribute("text-anchor", "middle");
          lab.setAttribute("fill", "var(--text-muted)");
          lab.setAttribute("font-family", "var(--font-mono)");
          lab.setAttribute("font-size", "10");
          lab.textContent = label;
          svgEl.appendChild(lab);
          // Count (centered)
          const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.setAttribute("x", x + storeW / 2);
          t.setAttribute("y", storeY + storeH / 2 + 6);
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("fill", "var(--text)");
          t.setAttribute("font-family", "var(--font-mono)");
          t.setAttribute("font-size", "18");
          t.setAttribute("font-weight", "700");
          t.textContent = count;
          svgEl.appendChild(t);
        };
        drawStore(storeX, "AI", board[13]);
        drawStore(storeX + 320, "YOU", board[6]);
        // Draw AI pits (top row, indices 12..7 left→right)
        for (let i = 0; i < 6; i++) {
          const pitIdx = 12 - i;
          drawPit(pitCx(i), topCy, pitIdx, board[pitIdx], false);
        }
        // Player pits (bottom row, indices 0..5 left→right)
        for (let i = 0; i < 6; i++) {
          drawPit(pitCx(i), botCy, i, board[i], true);
        }
        root.querySelector("#mn-p").textContent = board[6];
        root.querySelector("#mn-a").textContent = board[13];
        root.querySelector("#mn-turn").textContent = over ? "—" : (turn === "P" ? "You" : "AI");
      }

      function drawPit(cx, cy, idx, count, isPlayer) {
        const clickable = isPlayer && turn === "P" && !over && count > 0;
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", cx);
        c.setAttribute("cy", cy);
        c.setAttribute("r", 20);
        c.setAttribute("fill", clickable ? "var(--accent-soft)" : "var(--bg-soft)");
        c.setAttribute("stroke", clickable ? "var(--accent)" : "var(--border)");
        c.setAttribute("stroke-width", clickable ? "2.5" : "1");
        c.style.cursor = clickable ? "pointer" : "default";
        c.addEventListener("click", () => {
          if (!isPlayer || turn !== "P" || over || count === 0) return;
          playerMove(idx);
        });
        svgEl.appendChild(c);
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", cx);
        t.setAttribute("y", cy + 5);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("fill", "var(--text)");
        t.setAttribute("font-family", "var(--font-mono)");
        t.setAttribute("font-size", "14");
        t.setAttribute("font-weight", "700");
        t.setAttribute("pointer-events", "none");
        t.textContent = count;
        svgEl.appendChild(t);
      }

      function playerMove(pit) {
        if (over || turn !== "P") return;
        if (!isPlayerPit(pit) || board[pit] === 0) return;
        AudioFX.place();
        const {extra} = sow(pit);
        render();
        if (checkGameOver()) {
          render();
          return;
        }
        if (extra) {
          statusEl.textContent = "Landed in your store — extra turn!";
          statusEl.className = "status info";
        } else {
          turn = "A";
          statusEl.textContent = "AI thinking…";
          statusEl.className = "status info";
          aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiMove();
          }, 800);
        }
      }

      function aiMove() {
        if (over || turn !== "A") return;
        // Pick best move: prefer extra turn, then capture, else random
        const validMoves = [];
        for (let i = 7; i <= 12; i++) if (board[i] > 0) validMoves.push(i);
        if (!validMoves.length) return;
        // Simulate each move
        let bestMove = validMoves[0], bestScore = -Infinity;
        for (const m of validMoves) {
          const saved = board.slice();
          const {extra, last} = sow(m);
          // Score: AI store gain + bonus for extra turn + bonus for capture
          let score = board[13] - saved[13];
          if (extra) score += 5;
          if (isAiPit(last) && board[last] === 1 && (13 - 2 - last) >= 0) score += 3;
          board = saved;
          if (score > bestScore) {
            bestScore = score;
            bestMove = m;
          }
        }
        AudioFX.move();
        const {extra} = sow(bestMove);
        render();
        if (checkGameOver()) {
          render();
          return;
        }
        if (extra) {
          statusEl.textContent = "AI landed in its store — extra turn for AI.";
          statusEl.className = "status info";
          aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiMove();
          }, 800);
        } else {
          turn = "P";
          statusEl.textContent = "Your turn.";
          statusEl.className = "status info";
        }
      }

      function newGame() {
        if (aiTimer) clearTimeout(aiTimer);
        reset();
        const best = Storage.getBest("mancala");
        statusEl.textContent = "Click one of your pits (bottom row) to sow the seeds.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (!over) App.toast("Sow seeds to capture them — try to outscore the AI!", "info");
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
      App.showModal("How to play Mancala",
        `<b>Goal:</b> collect more seeds in your store (right) than the AI collects in its store (left).
        <br><br><b>Move:</b> click one of your pits (bottom row). All seeds in it are sown <b>one per pit counter-clockwise</b> — into your pit, your store, opponent's pits, etc. — skipping the opponent's store.
        <br><br><b>Extra turn:</b> if the last seed lands in your store, you get another turn.
        <br><br><b>Capture:</b> if the last seed lands in an empty pit on your side, you capture that seed plus all seeds in the opposite pit — they go to your store.
        <br><br><b>End:</b> when one side is empty, the game ends. Remaining seeds on the non-empty side go to that player's store.`);
    },
  });
})();
