/* Nim — classic. 3 piles, take any number from one pile. Take the last stone to win or lose. */
(function () {
  let live = null;

  function nimSum(piles) {
    return piles.reduce((a, b) => a ^ b, 0);
  }

  function aiPick(piles, misere) {
    const xor = nimSum(piles);
    if (xor === 0) {
      // losing position: take 1 from any non-empty pile
      for (let i = 0; i < piles.length; i++) if (piles[i] > 0) return {i, n: 1};
    }
    // find a move that leaves xor = 0
    for (let i = 0; i < piles.length; i++) {
      const target = piles[i] ^ xor;
      if (target < piles[i] && target >= 0) {
        let take = piles[i] - target;
        // misere adjustment: in endgame, leave odd singletons
        if (misere) {
          const nonEmptyAfter = piles.filter((_, j) => j !== i).filter(p => p > 0).length;
          if (target === 0 && nonEmptyAfter === 0) {
            // leave 1 instead of 0 so opponent takes last
            take = piles[i] - 1;
            if (take < 1) take = 1;
          }
        }
        return {i, n: take};
      }
    }
    return null;
  }

  GameRegistry.register({
    id: "nim",
    name: "Nim",
    icon: "🪨",
    category: "strategy",
    description: "Take stones from one pile — last stone wins or loses (you pick)",
    tags: ["strategy", "classic", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let piles = [3, 5, 7], turn = "you", over = false, misere = false, selected = null, aiTimer = null;
      root.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div class="difficulty" id="nm-mode">
            <button class="diff-btn active" data-m="win">Last wins</button>
            <button class="diff-btn" data-m="lose">Last loses</button>
          </div>
        </div>
        <div class="status info" id="nm-status">Click a pile, then click stones to take (or use Take button). Your turn.</div>
        <div class="center" style="margin:14px 0;"><div id="nm-piles" class="col" style="gap:14px;align-items:center;"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn primary" id="nm-take" disabled>Take</button>
          <button class="btn" id="nm-restart">Restart</button>
        </div>
        <p class="hint">Pick a pile, select how many stones to remove, then click Take. The AI plays optimally.</p>
      `;
      const statusEl = root.querySelector("#nm-status");
      const pilesEl = root.querySelector("#nm-piles");
      const takeBtn = root.querySelector("#nm-take");
      if (!document.getElementById("nm-style")) {
        const s = document.createElement("style");
        s.id = "nm-style";
        s.textContent = `.nm-pile{display:flex;gap:4px;padding:8px;border-radius:var(--radius-sm);background:var(--bg-elev);border:1px solid var(--border);}.nm-pile.sel{border-color:var(--accent);}.nm-stone{width:22px;height:22px;border-radius:50%;background:var(--accent);cursor:pointer;}.nm-stone.sel{background:var(--danger);opacity:0.5;}.nm-stone.gone{background:transparent;border:1px dashed var(--border);cursor:default;}`;
        document.head.appendChild(s);
      }

      function render() {
        pilesEl.innerHTML = "";
        piles.forEach((count, i) => {
          const pileEl = document.createElement("div");
          pileEl.className = "nm-pile" + (selected && selected.pile === i ? " sel" : "");
          for (let k = 0; k < count; k++) {
            const stone = document.createElement("div");
            stone.className = "nm-stone";
            if (selected && selected.pile === i && k >= count - selected.n) stone.classList.add("sel");
            stone.addEventListener("click", () => {
              if (over || turn !== "you") return;
              const take = count - k;
              selected = {pile: i, n: take};
              AudioFX.tick();
              render();
              takeBtn.disabled = false;
            });
            pileEl.appendChild(stone);
          }
          // Show original count placeholders for visual context
          pileEl.addEventListener("click", e => {
            if (e.target !== pileEl) return;
            if (over || turn !== "you") return;
            selected = {pile: i, n: 1};
            AudioFX.tick();
            render();
            takeBtn.disabled = false;
          });
          pilesEl.appendChild(pileEl);
        });
      }

      function aiTurn() {
        if (over) return;
        const move = aiPick(piles, misere);
        if (!move) return;
        piles[move.i] -= move.n;
        AudioFX.flip();
        render();
        if (piles.every(p => p === 0)) {
          endGame(false);
          return;
        }
        turn = "you";
        statusEl.textContent = "Your turn — pick a pile.";
        statusEl.className = "status info";
      }

      function takeSelected() {
        if (over || turn !== "you" || !selected) return;
        piles[selected.pile] -= selected.n;
        AudioFX.pop();
        selected = null;
        takeBtn.disabled = true;
        render();
        if (piles.every(p => p === 0)) {
          endGame(true);
          return;
        }
        turn = "ai";
        statusEl.textContent = "AI is thinking…";
        statusEl.className = "status info";
        aiTimer = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          aiTurn();
        }, 500);
      }

      function endGame(youTookLast) {
        over = true;
        // misere = last loses; normal = last wins
        const youWin = misere ? !youTookLast : youTookLast;
        if (youWin) {
          statusEl.textContent = `🎉 You ${misere ? "made the AI take the last" : "took the last"} stone — you win!`;
          statusEl.className = "status win";
          AudioFX.win();
          const wins = (Storage.getBest("nim") || 0) + 1;
          Storage.setBest("nim", wins);
          App.toast("You won!", "success");
        } else {
          statusEl.textContent = `AI ${misere ? "made you take the last" : "took the last"} — you lose.`;
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      }

      function newGame() {
        piles = [3 + Math.floor(Math.random() * 4), 4 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)];
        turn = "you";
        over = false;
        selected = null;
        takeBtn.disabled = true;
        statusEl.textContent = `Your turn — ${misere ? "last stone LOSES" : "last stone WINS"}.`;
        statusEl.className = "status info";
        render();
      }

      takeBtn.addEventListener("click", takeSelected);
      root.querySelector("#nm-restart").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      root.querySelectorAll("#nm-mode .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#nm-mode .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        misere = b.dataset.m === "lose";
        newGame();
      }));
      live = {newGame};
      newGame();
      return function cleanup() {
        alive = false;
        if (aiTimer) clearTimeout(aiTimer);
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Nim",
        `Three piles of stones. On your turn, take <b>any number</b> of stones from <b>one</b> pile.
        <br><br><b>Last wins</b>: take the last stone to win.
        <br><b>Last loses</b> (misère): force the AI to take the last stone.
        <br><br>Click a stone in a pile to select how many to remove (stones to the right of your click), then press <b>Take</b>. The AI plays optimally — winning requires careful play!`);
    },
  });
})();
