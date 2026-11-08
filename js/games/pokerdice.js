/* Poker Dice — poker hands with 9/10/J/Q/K/A dice: 3 rolls per hand, hold between
   rolls, score the poker hand. 5 hands per game. */
(function () {
  "use strict";

  const FACES = ["9", "10", "J", "Q", "K", "A"];

  function evalHand(d) {
    const counts = {};
    d.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const cs = Object.values(counts).sort((a, b) => b - a);
    const uniq = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const straight = uniq.length === 5 && uniq.every((v, i) => i === 0 || v === uniq[i - 1] + 1);
    if (cs[0] === 5) return {name: "Five of a Kind", pts: 50};
    if (cs[0] === 4) return {name: "Four of a Kind", pts: 25};
    if (straight) return {name: "Straight", pts: 20};
    if (cs[0] === 3 && cs[1] === 2) return {name: "Full House", pts: 15};
    if (cs[0] === 3) return {name: "Three of a Kind", pts: 10};
    if (cs[0] === 2 && cs[1] === 2) return {name: "Two Pair", pts: 5};
    if (cs[0] === 2) return {name: "One Pair", pts: 2};
    return {name: "Bust", pts: 0};
  }

  GameRegistry.register({
    id: "pokerdice",
    name: "Poker Dice",
    icon: "🃏",
    category: "strategy",
    description: "Poker hands with dice: five 9/10/J/Q/K/A dice, 3 rolls per hand with holds, then score the hand — five of a kind 50 down to one pair 2. Five hands per game.",
    tags: ["dice", "poker", "solo", "classic"],
    age: ["teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, gen = 0;
      let over = false, busy = false, handDone = false;
      let dice = [0, 0, 0, 0, 0], held = [false, false, false, false, false], rollsLeft = 3;
      let handN = 0, total = 0;
      let results = []; // {name, pts} per hand
      const timeouts = [];
      const intervals = [];
      const rnd = () => Math.floor(Math.random() * 6);

      function later(fn, ms) {
        const g = gen;
        const id = setTimeout(() => {
          if (alive && g === gen) fn();
        }, ms);
        timeouts.push(id);
        return id;
      }

      if (!document.getElementById("pk-style")) {
        const s = document.createElement("style");
        s.id = "pk-style";
        s.textContent = `
          .pk-dice { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin:14px 0; }
          .pk-slot { display:flex; flex-direction:column; align-items:center; gap:5px; }
          .pk-die { width:64px; height:64px; background:var(--bg-elev); border:2px solid var(--border); border-radius:12px;
            display:grid; place-items:center; font-family:var(--font-mono); font-weight:700; font-size:1.45rem;
            color:var(--text); cursor:default; padding:0; transition:border-color .12s, box-shadow .12s, transform .12s; }
          button.pk-die:active { transform:scale(.94); }
          .pk-held { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent); color:var(--accent); }
          .pk-empty { opacity:.3; }
          .pk-tag { font-family:var(--font-mono); font-size:.62rem; font-weight:700; letter-spacing:.08em;
            color:var(--text-muted); min-height:1em; }
          .pk-tag.on { color:var(--accent); }
          .pk-card { max-width:420px; margin:14px auto 0; border:1px solid var(--border); border-radius:var(--radius);
            overflow:hidden; font-family:var(--font-mono); font-size:.85rem; }
          .pk-card .pk-h { display:flex; justify-content:space-between; padding:7px 12px; background:var(--bg-soft);
            color:var(--text-muted); font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; }
          .pk-card .pk-r { display:flex; justify-content:space-between; padding:7px 12px; border-top:1px solid var(--border); }
          .pk-card .pk-r b { color:var(--accent); }
          .pk-card .pk-t { display:flex; justify-content:space-between; padding:8px 12px; border-top:2px solid var(--border);
            background:var(--bg-elev); font-weight:700; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hand</div><div class="val" id="pk-hand">1/5</div></div>
          <div class="score-cell"><div class="label">Total</div><div class="val" id="pk-total">0</div></div>
          <div class="score-cell"><div class="label">Rolls left</div><div class="val" id="pk-rolls">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pk-best">—</div></div>
        </div>
        <div class="status info" id="pk-status">Loading…</div>
        <div class="pk-dice" id="pk-dice"></div>
        <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="btn primary" id="pk-roll">Roll</button>
          <button class="btn" id="pk-score">Score hand</button>
          <button class="btn" id="pk-new">New game</button>
        </div>
        <p class="hint">Tap dice to <b>hold</b> them between rolls (3 rolls per hand). After the 3rd roll the hand is scored as
        a poker hand: 5-of-a-kind 50 · 4-of-a-kind 25 · straight 20 · full house 15 · trips 10 · two pair 5 · pair 2 · bust 0.</p>
        <div class="pk-card" id="pk-card"></div>
      `;

      const statusEl = root.querySelector("#pk-status");
      const diceEl = root.querySelector("#pk-dice");
      const cardEl = root.querySelector("#pk-card");
      const rollB = root.querySelector("#pk-roll");
      const scoreB = root.querySelector("#pk-score");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + (cls || "info");
      }

      function render() {
        root.querySelector("#pk-hand").textContent = Math.min(handN + 1, 5) + "/5";
        root.querySelector("#pk-total").textContent = total;
        root.querySelector("#pk-rolls").textContent = rollsLeft;
        const best = Storage.getBest("pokerdice");
        root.querySelector("#pk-best").textContent = best != null ? best : "—";

        diceEl.innerHTML = "";
        const canHold = !over && !busy && !handDone && rollsLeft < 3 && rollsLeft > 0;
        for (let i = 0; i < 5; i++) {
          const slot = document.createElement("div");
          slot.className = "pk-slot";
          let el;
          if (canHold) {
            el = document.createElement("button");
            el.addEventListener("click", () => {
              held[i] = !held[i];
              AudioFX.click();
              render();
            });
          } else {
            el = document.createElement("div");
          }
          el.className = "pk-die" + (held[i] ? " pk-held" : "") + (rollsLeft === 3 ? " pk-empty" : "");
          el.textContent = FACES[dice[i]];
          slot.appendChild(el);
          const tag = document.createElement("div");
          tag.className = "pk-tag" + (held[i] ? " on" : "");
          tag.textContent = held[i] ? "HELD" : "·";
          slot.appendChild(tag);
          diceEl.appendChild(slot);
        }

        let html = `<div class="pk-h"><span>Hand</span><span>Result</span></div>`;
        for (let i = 0; i < 5; i++) {
          const r = results[i];
          html += `<div class="pk-r"><span>Hand ${i + 1}</span><span>${r ? `${r.name} · <b>${r.pts}</b>` : "—"}</span></div>`;
        }
        html += `<div class="pk-t"><span>Total</span><span>${total}</span></div>`;
        cardEl.innerHTML = html;

        rollB.disabled = over || busy || handDone || rollsLeft <= 0;
        scoreB.disabled = over || busy || handDone || rollsLeft === 3;
      }

      // ~400ms shuffle of unheld dice before settling.
      function animateDice(finals, done) {
        const g = gen;
        const els = Array.from(root.querySelectorAll("#pk-dice .pk-die"));
        AudioFX.tick();
        let n = 0;
        const iv = setInterval(() => {
          if (!alive || g !== gen) {
            clearInterval(iv);
            return;
          }
          els.forEach((el, i) => {
            if (!held[i]) el.textContent = FACES[rnd()];
          });
          if (++n >= 7) {
            clearInterval(iv);
            els.forEach((el, i) => {
              el.textContent = FACES[finals[i]];
            });
            AudioFX.pop();
            if (done) done();
          }
        }, 55);
        intervals.push(iv);
      }

      function roll() {
        if (over || busy || handDone || rollsLeft <= 0) return;
        busy = true;
        render();
        const vals = dice.map((v, i) => held[i] ? v : rnd());
        animateDice(vals, () => {
          dice = vals;
          rollsLeft--;
          busy = false;
          if (rollsLeft === 0) {
            setStatus("Out of rolls — scoring the hand…", "info");
            render();
            later(scoreHand, 1300);
          } else {
            setStatus(`${rollsLeft} roll${rollsLeft === 1 ? "" : "s"} left — tap dice to hold, roll again, or score now.`, "info");
            render();
          }
        });
      }

      function scoreHand() {
        if (over || busy || handDone || rollsLeft === 3) return;
        handDone = true;
        const res = evalHand(dice);
        results.push(res);
        total += res.pts;
        render();
        if (res.pts >= 15) AudioFX.win();
        else if (res.pts > 0) AudioFX.place();
        else AudioFX.error();
        setStatus(`Hand ${handN + 1}: ${res.name} — ${res.pts} point${res.pts === 1 ? "" : "s"}.`, res.pts > 0 ? "win" : "lose");
        handN++;
        if (handN >= 5) {
          later(endGame, 1500);
        } else {
          later(newHand, 1500);
        }
      }

      function newHand() {
        if (over) return;
        dice = [0, 0, 0, 0, 0];
        held = [false, false, false, false, false];
        rollsLeft = 3;
        handDone = false;
        setStatus(`Hand ${handN + 1} of 5 — roll to begin.`, "info");
        render();
      }

      function endGame() {
        over = true;
        render();
        App.recordResult(true, total);
        const best = Storage.getBest("pokerdice");
        if (total > (best != null ? best : 0)) {
          Storage.setBest("pokerdice", total);
          App.toast("New best: " + total + " points", "success");
        }
        AudioFX.win();
        setStatus(`Game over — 5 hands, total score ${total}.`, "win");
      }

      function newGame() {
        gen++;
        over = false;
        busy = false;
        handDone = false;
        handN = 0;
        total = 0;
        results = [];
        newHand();
      }

      rollB.addEventListener("click", roll);
      scoreB.addEventListener("click", scoreHand);
      root.querySelector("#pk-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
      };
    },
    help: function () {
      App.showModal("How to play Poker Dice",
        `Poker Dice uses five dice with card faces: <b>9, 10, J, Q, K, A</b>. Play <b>5 hands</b> per game.
        <br><br><b>Each hand:</b>
        <br>1. <b>Roll</b> all five dice.
        <br>2. Tap any dice you want to <b>hold</b>; roll again to reroll the rest. You get <b>3 rolls</b> per hand (you may score early).
        <br>3. After the last roll, the hand is scored as a poker hand:
        <br><br><b>Scoring table:</b>
        <br>• <b>Five of a Kind</b> — 50 points
        <br>• <b>Four of a Kind</b> — 25 points
        <br>• <b>Straight</b> — 20 points (A-K-Q-J-10 or K-Q-J-10-9)
        <br>• <b>Full House</b> (trips + pair) — 15 points
        <br>• <b>Three of a Kind</b> — 10 points
        <br>• <b>Two Pair</b> — 5 points
        <br>• <b>One Pair</b> — 2 points
        <br>• <b>Bust</b> — 0 points
        <br><br>Your game score is the <b>sum of all 5 hands</b> (maximum 250). Beat your best!`);
    },
  });
})();
