/* Yacht Dice — the pre-Yahtzee classic: full 13-category scorecard, 5 dice,
   3 rolls per turn with holds, upper bonus at 63+. */
(function () {
  "use strict";

  const PIP = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [30, 70], [70, 30], [70, 70]],
    5: [[30, 30], [30, 70], [50, 50], [70, 30], [70, 70]],
    6: [[30, 30], [30, 70], [50, 30], [50, 70], [70, 30], [70, 70]],
  };

  function faceHTML(v) {
    return PIP[v].map(p => `<span class="yt-pip" style="left:${p[0]}%;top:${p[1]}%"></span>`).join("");
  }

  const rnd6 = () => 1 + Math.floor(Math.random() * 6);

  function counts(d) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (const v of d) c[v]++;
    return c;
  }

  const sumAll = d => d.reduce((a, b) => a + b, 0);

  function longestRun(d) {
    const s = [...new Set(d)].sort((a, b) => a - b);
    let best = 0, cur = 0, prev = -9;
    for (const v of s) {
      cur = v === prev + 1 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = v;
    }
    return best;
  }

  const CATS = [
    {id: "ones", sec: "upper", name: "Ones", fn: c => c[1]},
    {id: "twos", sec: "upper", name: "Twos", fn: c => c[2] * 2},
    {id: "threes", sec: "upper", name: "Threes", fn: c => c[3] * 3},
    {id: "fours", sec: "upper", name: "Fours", fn: c => c[4] * 4},
    {id: "fives", sec: "upper", name: "Fives", fn: c => c[5] * 5},
    {id: "sixes", sec: "upper", name: "Sixes", fn: c => c[6] * 6},
    {id: "t3", sec: "lower", name: "3 of a Kind", fn: c => c.some(x => x >= 3) ? null : 0, sum: true},
    {id: "t4", sec: "lower", name: "4 of a Kind", fn: c => c.some(x => x >= 4) ? null : 0, sum: true},
    {id: "fh", sec: "lower", name: "Full House", fn: c => (c.includes(3) && c.includes(2)) ? 25 : 0},
    {id: "ss", sec: "lower", name: "Small Straight", fn: (c, d) => longestRun(d) >= 4 ? 30 : 0},
    {id: "ls", sec: "lower", name: "Large Straight", fn: (c, d) => longestRun(d) >= 5 ? 40 : 0},
    {id: "yz", sec: "lower", name: "Yacht", fn: c => c.some(x => x === 5) ? 50 : 0},
    {id: "ch", sec: "lower", name: "Chance", fn: (c, d) => sumAll(d)},
  ];

  function scoreCat(cat, dice) {
    const c = counts(dice);
    const v = cat.fn(c, dice);
    return v === null ? sumAll(dice) : v; // kind categories score the sum of all dice
  }

  GameRegistry.register({
    id: "yachtdice",
    name: "Yacht Dice",
    icon: "🛥️",
    category: "strategy",
    description: "The pre-Yahtzee classic: 5 dice, 3 rolls per turn, and a full 13-category scorecard — upper bonus at 63, straights, full house and the 50-point Yacht. 13 turns, aim high.",
    tags: ["dice", "yahtzee", "solo", "classic", "scorecard"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, gen = 0;
      let over = false, busy = false;
      let dice = [1, 1, 1, 1, 1], held = [false, false, false, false, false], rollsLeft = 3;
      let turnN = 0;
      let scores = {}; // id -> points
      const timeouts = [];
      const intervals = [];

      function later(fn, ms) {
        const g = gen;
        const id = setTimeout(() => {
          if (alive && g === gen) fn();
        }, ms);
        timeouts.push(id);
        return id;
      }

      if (!document.getElementById("yt-style")) {
        const s = document.createElement("style");
        s.id = "yt-style";
        s.textContent = `
          .yt-dice { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:14px 0; }
          .yt-slot { display:flex; flex-direction:column; align-items:center; gap:4px; }
          .yt-die { width:58px; height:58px; background:var(--bg-elev); border:2px solid var(--border); border-radius:12px;
            position:relative; padding:0; cursor:default; transition:border-color .12s, box-shadow .12s, transform .12s; }
          button.yt-die:active { transform:scale(.94); }
          .yt-pip { position:absolute; width:20%; height:20%; background:var(--text); border-radius:50%; transform:translate(-50%,-50%); }
          .yt-held { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent); }
          .yt-empty { opacity:.35; }
          .yt-tag { font-family:var(--font-mono); font-size:.6rem; font-weight:700; letter-spacing:.08em; color:var(--text-muted); min-height:1em; }
          .yt-tag.on { color:var(--accent); }
          .yt-card { max-width:440px; margin:14px auto 0; border:1px solid var(--border); border-radius:var(--radius);
            overflow:hidden; font-family:var(--font-mono); font-size:.85rem; }
          .yt-sec { padding:6px 12px; background:var(--bg-soft); color:var(--text-muted); font-size:.68rem;
            text-transform:uppercase; letter-spacing:.1em; border-top:1px solid var(--border); }
          .yt-row { display:flex; justify-content:space-between; align-items:center; width:100%; padding:8px 12px;
            border:0; border-top:1px solid var(--border); background:transparent; color:var(--text); font:inherit;
            text-align:left; cursor:pointer; }
          .yt-row:hover:not(:disabled) { background:var(--bg-elev); }
          .yt-row:disabled { cursor:default; }
          .yt-row .yt-name { flex:1; }
          .yt-row .yt-val { font-weight:700; }
          .yt-pot { color:var(--text-muted); font-weight:400; }
          .yt-used { opacity:.55; }
          .yt-used .yt-val { color:var(--accent); }
          .yt-total { display:flex; justify-content:space-between; padding:7px 12px; border-top:1px solid var(--border);
            font-weight:700; }
          .yt-grand { display:flex; justify-content:space-between; padding:9px 12px; border-top:2px solid var(--border);
            background:var(--bg-elev); font-size:1rem; font-weight:700; color:var(--accent); }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="yt-turn">1/13</div></div>
          <div class="score-cell"><div class="label">Total</div><div class="val" id="yt-total">0</div></div>
          <div class="score-cell"><div class="label">Rolls left</div><div class="val" id="yt-rolls">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="yt-best">—</div></div>
        </div>
        <div class="status info" id="yt-status">Loading…</div>
        <div class="yt-dice" id="yt-dice"></div>
        <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="btn primary" id="yt-roll">Roll</button>
          <button class="btn" id="yt-new">New game</button>
        </div>
        <p class="hint">3 rolls per turn — tap dice to <b>hold</b> them. Then pick a category on the scorecard (each fits once; a 0 is a scratch).
        Upper bonus <b>+35</b> if the top reaches 63. Aim for <b>150+</b> for a winning game.</p>
        <div class="yt-card" id="yt-card"></div>
      `;

      const statusEl = root.querySelector("#yt-status");
      const diceEl = root.querySelector("#yt-dice");
      const cardEl = root.querySelector("#yt-card");
      const rollB = root.querySelector("#yt-roll");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + (cls || "info");
      }

      function upperSum() {
        return CATS.filter(c => c.sec === "upper").reduce((a, c) => a + (scores[c.id] || 0), 0);
      }

      function lowerSum() {
        return CATS.filter(c => c.sec === "lower").reduce((a, c) => a + (scores[c.id] || 0), 0);
      }

      function bonus() {
        return upperSum() >= 63 ? 35 : 0;
      }

      function grandTotal() {
        return upperSum() + bonus() + lowerSum();
      }

      function render() {
        root.querySelector("#yt-turn").textContent = Math.min(turnN + 1, 13) + "/13";
        root.querySelector("#yt-total").textContent = grandTotal();
        root.querySelector("#yt-rolls").textContent = rollsLeft;
        const best = Storage.getBest("yachtdice");
        root.querySelector("#yt-best").textContent = best != null ? best : "—";

        // dice
        diceEl.innerHTML = "";
        const canHold = !over && !busy && rollsLeft < 3 && rollsLeft > 0;
        for (let i = 0; i < 5; i++) {
          const slot = document.createElement("div");
          slot.className = "yt-slot";
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
          el.className = "yt-die" + (held[i] ? " yt-held" : "") + (rollsLeft === 3 ? " yt-empty" : "");
          el.innerHTML = faceHTML(dice[i]);
          slot.appendChild(el);
          const tag = document.createElement("div");
          tag.className = "yt-tag" + (held[i] ? " on" : "");
          tag.textContent = held[i] ? "HOLD" : "·";
          slot.appendChild(tag);
          diceEl.appendChild(slot);
        }

        // scorecard
        const canScore = !over && !busy && rollsLeft < 3;
        let html = `<div class="yt-sec">Upper section</div>`;
        for (const cat of CATS.filter(c => c.sec === "upper")) html += catRow(cat, canScore);
        html += `<div class="yt-total"><span>Bonus (upper ≥ 63)</span><span>${bonus()}</span></div>`;
        html += `<div class="yt-total"><span>Upper total</span><span>${upperSum()}</span></div>`;
        html += `<div class="yt-sec">Lower section</div>`;
        for (const cat of CATS.filter(c => c.sec === "lower")) html += catRow(cat, canScore);
        html += `<div class="yt-total"><span>Lower total</span><span>${lowerSum()}</span></div>`;
        html += `<div class="yt-grand"><span>Grand total</span><span>${grandTotal()}</span></div>`;
        cardEl.innerHTML = html;

        cardEl.querySelectorAll("button.yt-row").forEach(btn => {
          btn.addEventListener("click", () => {
            const cat = CATS.find(c => c.id === btn.dataset.cat);
            if (!cat) return;
            scoreCategory(cat);
          });
        });

        rollB.disabled = over || busy || rollsLeft <= 0;
      }

      function catRow(cat, canScore) {
        const used = scores[cat.id] !== undefined;
        const pot = scoreCat(cat, dice);
        const val = used
          ? `<span class="yt-val">${scores[cat.id]}</span>`
          : `<span class="yt-pot">→ ${pot}</span>`;
        const dis = used || !canScore;
        return `<button class="yt-row ${used ? "yt-used" : ""}" data-cat="${cat.id}" ${dis ? "disabled" : ""}>
          <span class="yt-name">${cat.name}</span>${val}</button>`;
      }

      // ~400ms shuffle of unheld dice before settling.
      function animateDice(finals, done) {
        const g = gen;
        const els = Array.from(root.querySelectorAll("#yt-dice .yt-die"));
        AudioFX.tick();
        let n = 0;
        const iv = setInterval(() => {
          if (!alive || g !== gen) {
            clearInterval(iv);
            return;
          }
          els.forEach((el, i) => {
            if (!held[i]) el.innerHTML = faceHTML(rnd6());
          });
          if (++n >= 7) {
            clearInterval(iv);
            els.forEach((el, i) => {
              el.innerHTML = faceHTML(finals[i]);
            });
            AudioFX.pop();
            if (done) done();
          }
        }, 55);
        intervals.push(iv);
      }

      function roll() {
        if (over || busy || rollsLeft <= 0) return;
        busy = true;
        render();
        const vals = dice.map((v, i) => held[i] ? v : rnd6());
        animateDice(vals, () => {
          dice = vals;
          rollsLeft--;
          busy = false;
          if (rollsLeft === 0) {
            setStatus("Out of rolls — pick a category on the scorecard (a 0 is a scratch).", "info");
          } else {
            setStatus(`${rollsLeft} roll${rollsLeft === 1 ? "" : "s"} left — hold dice, roll again, or pick a category.`, "info");
          }
          render();
        });
      }

      function scoreCategory(cat) {
        if (over || busy || scores[cat.id] !== undefined || rollsLeft === 3) return;
        const pts = scoreCat(cat, dice);
        scores[cat.id] = pts;
        turnN++;
        held = [false, false, false, false, false];
        rollsLeft = 3;
        if (pts >= 40) AudioFX.win();
        else if (pts > 0) AudioFX.place();
        else AudioFX.error();
        if (turnN >= 13) {
          render();
          setStatus(`${cat.name}: ${pts}. Scorecard complete!`, "info");
          later(endGame, 900);
          return;
        }
        setStatus(`${cat.name}: +${pts} — turn ${turnN + 1} of 13. Roll to begin.`, pts > 0 ? "win" : "info");
        dice = [1, 1, 1, 1, 1];
        render();
      }

      function endGame() {
        over = true;
        render();
        const total = grandTotal();
        const won = total >= 150;
        App.recordResult(won, total);
        const best = Storage.getBest("yachtdice");
        if (total > (best != null ? best : 0)) {
          Storage.setBest("yachtdice", total);
          App.toast("New best: " + total, "success");
        }
        if (won) {
          AudioFX.win();
          setStatus(`Scorecard complete — grand total ${total}. A winning game!`, "win");
        } else {
          AudioFX.lose();
          setStatus(`Scorecard complete — grand total ${total}. Reach 150+ for a winning game.`, "lose");
        }
        render();
      }

      function newGame() {
        gen++;
        over = false;
        busy = false;
        dice = [1, 1, 1, 1, 1];
        held = [false, false, false, false, false];
        rollsLeft = 3;
        turnN = 0;
        scores = {};
        setStatus("Turn 1 of 13 — roll the dice to begin.", "info");
        render();
      }

      rollB.addEventListener("click", roll);
      root.querySelector("#yt-new").addEventListener("click", () => {
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
      App.showModal("How to play Yacht Dice",
        `The pre-Yahtzee classic — 5 dice, a full scorecard, <b>13 turns</b>.
        <br><br><b>Each turn:</b> roll up to <b>3 times</b>, tapping dice to <b>hold</b> them between rolls. Then click a scorecard category to score your hand. Each category can be used <b>only once</b> — picking one with no match scores 0 (a scratch).
        <br><br><b>Upper section</b> (score = sum of matching dice):
        <br>• Ones · Twos · Threes · Fours · Fives · Sixes
        <br>• <b>Bonus +35</b> if the upper subtotal reaches <b>63</b>
        <br><br><b>Lower section:</b>
        <br>• <b>3 of a Kind</b> — sum of all 5 dice
        <br>• <b>4 of a Kind</b> — sum of all 5 dice
        <br>• <b>Full House</b> (trips + pair) — 25
        <br>• <b>Small Straight</b> (4 in sequence) — 30
        <br>• <b>Large Straight</b> (5 in sequence) — 40
        <br>• <b>Yacht</b> (five of a kind) — 50
        <br>• <b>Chance</b> — sum of all 5 dice
        <br><br>After 13 turns, add upper + bonus + lower for your <b>grand total</b>. Careless play lands around 100; good play clears <b>150</b>; experts chase 250+.`);
    },
  });
})();
