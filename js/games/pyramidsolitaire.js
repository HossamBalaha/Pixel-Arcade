/* Pyramid Solitaire — remove card pairs that add to thirteen */
(function () {
  GameRegistry.register({
    id: "pyramidsolitaire",
    name: "Pyramid Solitaire",
    icon: "🔺",
    category: "strategy",
    description: "Uncover and remove card pairs that add to thirteen",
    tags: ["strategy", "cards", "solitaire"],
    mount: function (root, {App, AudioFX, Storage}) {
      const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const VAL = {A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13};
      const SUITS = ["♠", "♥", "♦", "♣"];
      let pyramid, stock, waste, sel, won, bestScore, score, moves;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Cleared</div><div class="val" id="py2-clear">0/28</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="py2-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="py2-best">0</div></div>
        </div>
        <div class="status info" id="py2-status">Select cards that add to 13 — Kings go alone</div>
        <div class="center" id="py2-board"></div>
        <div class="center" id="py2-row" style="margin-top:10px;"></div>
        <p class="hint">Only uncovered pyramid cards are clickable. Stock recycles once.</p>
      `;

      const boardEl = root.querySelector("#py2-board");
      const rowEl = root.querySelector("#py2-row");
      const statusEl = root.querySelector("#py2-status");
      bestScore = Storage.getBest("pyramidsolitaire") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .py2-card { display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
                    width:44px; height:60px; margin:1px; border-radius:6px; background:#f8fafc; font-weight:800;
                    font-size:13px; cursor:pointer; border:2px solid #cbd5e1; position:relative; user-select:none; }
        .py2-card.red { color:#dc2626; } .py2-card.blk { color:#0f172a; }
        .py2-card.sel { border-color:#f59e0b; box-shadow:0 0 8px rgba(245,158,11,0.6); }
        .py2-card.gone { visibility:hidden; }
        .py2-card.back { background:#1e3a8a; color:#93c5fd; }
      `;
      root.appendChild(style);

      function deal() {
        const deck = [];
        RANKS.forEach(r => SUITS.forEach(s => deck.push({r, s})));
        deck.sort(() => Math.random() - 0.5);
        pyramid = [];
        let idx = 0;
        for (let row = 0; row < 7; row++) {
          const r = [];
          for (let col = 0; col <= row; col++) r.push({card: deck[idx++], gone: false});
          pyramid.push(r);
        }
        stock = deck.slice(idx);
        waste = [];
        sel = null;
        won = null;
        score = 0;
        moves = 0;
        render();
      }

      function uncovered(row, col) {
        if (row === 6) return true;
        return !pyramid[row + 1][col].card && !pyramid[row + 1][col + 1].card ? true :
          (pyramid[row + 1][col].gone && pyramid[row + 1][col + 1].gone);
      }

      function tryRemove(a, b) {
        if (VAL[a.r] + VAL[b.r] === 13) {
          a.goneFlag = true;
          b.goneFlag = true;
          return true;
        }
        return false;
      }

      function cardObj(c) {
        return {r: c.r, s: c.s, goneFlag: false};
      }

      function clickPyramid(row, col) {
        const cell = pyramid[row][col];
        if (cell.gone || !uncovered(row, col)) {
          AudioFX.error();
          return;
        }
        const c = cell.card;
        if (c.r === "K") {
          cell.gone = true;
          score += 10;
          moves++;
          AudioFX.win();
          checkWin();
          render();
          return;
        }
        if (sel && sel.type === "pyr" && sel.row === row && sel.col === col) {
          sel = null;
          render();
          return;
        }
        if (sel) {
          const other = sel.type === "pyr" ? pyramid[sel.row][sel.col].card : waste[waste.length - 1];
          if (VAL[other.r] + VAL[c.r] === 13) {
            if (sel.type === "pyr") pyramid[sel.row][sel.col].gone = true;
            else waste.pop();
            cell.gone = true;
            score += 10;
            moves++;
            sel = null;
            AudioFX.win();
            checkWin();
            render();
            return;
          }
          sel = {type: "pyr", row, col};
          AudioFX.click();
          render();
        } else {
          sel = {type: "pyr", row, col};
          AudioFX.click();
          render();
        }
      }

      function clickWaste() {
        const c = waste[waste.length - 1];
        if (!c || won) return;
        if (sel && sel.type === "waste") {
          sel = null;
          render();
          return;
        }
        if (sel && sel.type === "pyr") {
          const other = pyramid[sel.row][sel.col].card;
          if (VAL[other.r] + VAL[c.r] === 13) {
            pyramid[sel.row][sel.col].gone = true;
            waste.pop();
            score += 10;
            moves++;
            sel = null;
            AudioFX.win();
            checkWin();
            render();
            return;
          }
        }
        sel = {type: "waste"};
        AudioFX.click();
        render();
      }

      function clickStock() {
        if (won) return;
        if (!stock.length) {
          // recycle waste -> stock (once: track via flag)
          if (!recycled && waste.length) {
            stock = waste.splice(0).reverse();
            recycled = true;
            AudioFX.click();
          } else AudioFX.error();
          render();
          return;
        }
        waste.push(stock.pop());
        sel = null;
        AudioFX.click();
        render();
      }

      let recycled = false;

      function checkWin() {
        const left = pyramid.flat().filter(c => !c.gone).length;
        if (left === 0) {
          won = true;
          AudioFX.win();
          statusEl.textContent = "🔺 Pyramid demolished! Perfect clear.";
          statusEl.className = "status win";
          if (score > bestScore) {
            bestScore = score;
            Storage.setBest("pyramidsolitaire", score);
          }
        }
      }

      function render() {
        root.querySelector("#py2-clear").textContent = (28 - pyramid.flat().filter(c => !c.gone).length) + "/28";
        root.querySelector("#py2-score").textContent = score;
        root.querySelector("#py2-best").textContent = bestScore;
        boardEl.innerHTML = "";
        for (let row = 0; row < 7; row++) {
          const line = document.createElement("div");
          line.style.cssText = `display:flex;justify-content:center;`;
          for (let col = 0; col <= row; col++) {
            const cell = pyramid[row][col];
            const c = cell.card;
            const el = document.createElement("div");
            const isSel = sel && sel.type === "pyr" && sel.row === row && sel.col === col;
            const can = !cell.gone && uncovered(row, col);
            el.className = `py2-card ${(c.s === "♥" || c.s === "♦") ? "red" : "blk"} ${cell.gone ? "gone" : ""} ${isSel ? "sel" : ""}`;
            el.style.cssText += can || cell.gone ? "" : "filter:brightness(0.55);";
            el.innerHTML = `${c.r}<br>${c.s}`;
            if (!cell.gone) el.addEventListener("pointerdown", () => clickPyramid(row, col));
            line.appendChild(el);
          }
          boardEl.appendChild(line);
        }
        // stock + waste
        rowEl.innerHTML = `
          <div class="py2-card back" id="py2-stock">${stock.length}<br>🂠</div>
          <div style="width:14px;display:inline-block;"></div>
          <div class="py2-card ${waste.length ? ((waste[waste.length - 1].s === "♥" || waste[waste.length - 1].s === "♦") ? "red" : "blk") : "blk"} ${sel && sel.type === "waste" ? "sel" : ""}" id="py2-waste">
            ${waste.length ? waste[waste.length - 1].r + "<br>" + waste[waste.length - 1].s : "—"}
          </div>
        `;
        rowEl.querySelector("#py2-stock").addEventListener("pointerdown", clickStock);
        rowEl.querySelector("#py2-waste").addEventListener("pointerdown", clickWaste);
        if (won) {
          rowEl.insertAdjacentHTML("beforeend", `<button class="btn btn-sm primary" id="py2-again" style="margin-left:12px;">↻ Play again</button>`);
          rowEl.querySelector("#py2-again").addEventListener("click", deal);
        }
      }

      deal();
      return function cleanup() {
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Pyramid Solitaire",
        `28 cards form the pyramid. Remove them by clicking <b>pairs that add to 13</b>
        (A=1, 2–10 face value, J=11, Q=12) — or a lone <b>King (13)</b>.
        <br><br>Only <b>uncovered</b> cards (with both cards below them removed) are playable.
        Cycle the stock for extra cards; pair the top waste card with pyramid cards too.
        The stock recycles <b>once</b>. Clear all 28 for a perfect game.`);
    },
  });
})();
