/* Farkle — medieval greed dice: roll 6 dice, set aside scoring combos,
   and press your luck — a roll with no scoring dice is a FARKLE. Race to 10,000. */
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
    return PIP[v].map(p => `<span class="fk-pip" style="left:${p[0]}%;top:${p[1]}%"></span>`).join("");
  }

  const rnd6 = () => 1 + Math.floor(Math.random() * 6);
  const fmt = arr => arr.slice().sort((a, b) => a - b).join("·");

  function countsOf(arr) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (const v of arr) c[v]++;
    return c;
  }

  /* Best score consuming ALL dice in the set via combos, or -1 if any die is
     left over (i.e. the set is not fully scoring).
     Combos: single 1=100, single 5=50, 3-of-a-kind=face×100 (three 1s=1000),
     4-kind=1000, 5-kind=2000, 6-kind=3000, straight=1500, three pairs=1500,
     two triplets=2500. */
  function scoreSet(arr) {
    if (arr.length === 0) return 0;
    const memo = {};

    function rec(c) {
      const key = c.join(",");
      if (key in memo) return memo[key];
      const total = c.reduce((a, b) => a + b, 0);
      if (total === 0) {
        memo[key] = 0;
        return 0;
      }
      let best = -1;
      if (c[1] > 0) {
        const d = c.slice();
        d[1]--;
        const r = rec(d);
        if (r >= 0) best = Math.max(best, 100 + r);
      }
      if (c[5] > 0) {
        const d = c.slice();
        d[5]--;
        const r = rec(d);
        if (r >= 0) best = Math.max(best, 50 + r);
      }
      for (let f = 1; f <= 6; f++) {
        if (c[f] >= 3) {
          const d = c.slice();
          d[f] -= 3;
          const r = rec(d);
          if (r >= 0) best = Math.max(best, (f === 1 ? 1000 : f * 100) + r);
        }
        if (c[f] >= 4) {
          const d = c.slice();
          d[f] -= 4;
          const r = rec(d);
          if (r >= 0) best = Math.max(best, 1000 + r);
        }
        if (c[f] >= 5) {
          const d = c.slice();
          d[f] -= 5;
          const r = rec(d);
          if (r >= 0) best = Math.max(best, 2000 + r);
        }
        if (c[f] >= 6) {
          const d = c.slice();
          d[f] -= 6;
          const r = rec(d);
          if (r >= 0) best = Math.max(best, 3000 + r);
        }
      }
      if (total === 6) {
        if (c.slice(1).every(v => v === 1)) best = Math.max(best, 1500); // straight 1-6
        let pairs = 0, trips = 0, only = true;
        for (let f = 1; f <= 6; f++) {
          if (c[f] === 2) pairs++;
          else if (c[f] === 3) trips++;
          else if (c[f] !== 0) only = false;
        }
        if (only && pairs === 3) best = Math.max(best, 1500); // three pairs
        if (only && trips === 2) best = Math.max(best, 2500); // two triplets
      }
      memo[key] = best;
      return best;
    }

    return rec(countsOf(arr));
  }

  /* Does this roll contain ANY scoring dice/combos? (false = FARKLE) */
  function hasAnyScoring(arr) {
    const c = countsOf(arr);
    if (c[1] > 0 || c[5] > 0) return true;
    for (let f = 1; f <= 6; f++) if (c[f] >= 3) return true;
    if (arr.length === 6) {
      if (c.slice(1).every(v => v === 1)) return true; // straight
      let pairs = 0, only = true;
      for (let f = 1; f <= 6; f++) {
        if (c[f] === 2) pairs++;
        else if (c[f] !== 0) only = false;
      }
      if (only && pairs === 3) return true; // three pairs (e.g. 2·2·3·3·4·4)
    }
    return false;
  }

  /* Best-scoring subset of the given dice (ties → more dice set aside). */
  function bestSubset(dice) {
    let best = {score: 0, mask: 0, count: 0};
    const n = dice.length;
    for (let m = 1; m < (1 << n); m++) {
      const sel = dice.filter((_, i) => m & (1 << i));
      const s = scoreSet(sel);
      if (s > best.score || (s === best.score && s > 0 && sel.length > best.count)) {
        best = {score: s, mask: m, count: sel.length};
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "farkle",
    name: "Farkle",
    icon: "🎲",
    category: "strategy",
    description: "Medieval greed dice: set aside 1s, 5s and combos each roll, then push your luck — a scoreless roll is a Farkle and wipes your turn. Race the bot to 10,000.",
    tags: ["dice", "press-your-luck", "ai", "classic"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, gen = 0;
      let over = false, busy = false, rolled = false, whose = "you";
      let active = [1, 1, 1, 1, 1, 1]; // dice in play this segment
      let aside = [];                  // dice set aside this turn
      const selected = new Set();      // indices into `active`
      let turnPts = 0, youBank = 0, botBank = 0;
      let logLines = [];
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

      if (!document.getElementById("fk-style")) {
        const s = document.createElement("style");
        s.id = "fk-style";
        s.textContent = `
          .fk-dice { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:10px 0; }
          .fk-die { width:58px; height:58px; background:var(--bg-elev); border:2px solid var(--border); border-radius:12px;
            position:relative; cursor:pointer; padding:0; transition:transform .12s, border-color .12s, box-shadow .12s; }
          button.fk-die:active { transform:scale(.94); }
          .fk-pip { position:absolute; width:20%; height:20%; background:var(--text); border-radius:50%; transform:translate(-50%,-50%); }
          .fk-sel { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent); transform:translateY(-6px); }
          .fk-empty { opacity:.35; cursor:default; }
          .fk-aside { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; min-height:30px; }
          .fk-mini { width:28px; height:28px; background:var(--bg-soft); border:1px solid var(--border); border-radius:6px;
            position:relative; opacity:.75; }
          .fk-mini .fk-pip { background:var(--text-muted); }
          .fk-log { font-family:var(--font-mono); font-size:.78rem; color:var(--text-muted); text-align:left;
            background:var(--bg-soft); border:1px solid var(--border); border-radius:var(--radius);
            padding:8px 10px; margin-top:12px; max-height:130px; overflow-y:auto; }
          .fk-log div { padding:1px 0; }
          .fk-log .fk-you { color:var(--accent); }
          .fk-selinfo { font-family:var(--font-mono); font-size:.85rem; text-align:center; min-height:1.3em; margin:2px 0; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="fk-you">0</div></div>
          <div class="score-cell"><div class="label">Bot</div><div class="val" id="fk-bot">0</div></div>
          <div class="score-cell"><div class="label">Turn pts</div><div class="val" id="fk-tp">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fk-best">—</div></div>
        </div>
        <div class="status info" id="fk-status">Loading…</div>
        <div class="fk-dice" id="fk-dice"></div>
        <div class="fk-selinfo" id="fk-selinfo"></div>
        <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="btn primary" id="fk-roll">Roll dice</button>
          <button class="btn" id="fk-bank">Bank points</button>
          <button class="btn" id="fk-new">New game</button>
        </div>
        <p class="hint">Set aside: 1s (100), 5s (50), 3-of-a-kind (face×100), and bigger combos. Keep rolling the rest, or bank.
        A roll with <b>no</b> scoring dice is a <b>FARKLE</b> — turn points lost. First to <b>10,000</b> wins.</p>
        <div class="fk-aside" id="fk-aside"></div>
        <div class="fk-log" id="fk-log"></div>
      `;

      const diceEl = root.querySelector("#fk-dice");
      const asideEl = root.querySelector("#fk-aside");
      const statusEl = root.querySelector("#fk-status");
      const selInfoEl = root.querySelector("#fk-selinfo");
      const logEl = root.querySelector("#fk-log");
      const rollB = root.querySelector("#fk-roll");
      const bankB = root.querySelector("#fk-bank");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + (cls || "info");
      }

      function log(text, mine) {
        logLines.unshift({text, mine});
        logLines = logLines.slice(0, 12);
        logEl.innerHTML = logLines.map(l => `<div class="${l.mine ? "fk-you" : ""}">${l.mine ? "You: " : "Bot: "}${l.text}</div>`).join("");
      }

      function selectedValues() {
        return active.filter((_, i) => selected.has(i));
      }

      function render() {
        root.querySelector("#fk-you").textContent = youBank;
        root.querySelector("#fk-bot").textContent = botBank;
        root.querySelector("#fk-tp").textContent = turnPts;
        const best = Storage.getBest("farkle");
        root.querySelector("#fk-best").textContent = best != null ? best : "—";

        // dice in play
        diceEl.innerHTML = "";
        const canSel = rolled && whose === "you" && !busy && !over;
        for (let i = 0; i < active.length; i++) {
          let d;
          if (canSel) {
            d = document.createElement("button");
            d.addEventListener("click", () => {
              if (selected.has(i)) selected.delete(i); else selected.add(i);
              AudioFX.click();
              render();
            });
          } else {
            d = document.createElement("div");
          }
          d.className = "fk-die" + (selected.has(i) ? " fk-sel" : "") + (!rolled ? " fk-empty" : "");
          d.innerHTML = rolled ? faceHTML(active[i]) : "";
          diceEl.appendChild(d);
        }

        // dice set aside this turn
        asideEl.innerHTML = aside.length
          ? aside.map(v => `<div class="fk-mini">${faceHTML(v)}</div>`).join("")
          : "";

        // selection preview + buttons
        const sel = selectedValues();
        const selScore = sel.length ? scoreSet(sel) : 0;
        if (whose === "you" && rolled && !busy && !over) {
          if (sel.length === 0) selInfoEl.textContent = "Tap dice to select a scoring set…";
          else if (selScore > 0) selInfoEl.textContent = `Selected ${fmt(sel)} → +${selScore} pts`;
          else selInfoEl.textContent = `${fmt(sel)} is not a fully scoring set`;
        } else if (whose === "ai") {
          selInfoEl.textContent = busy ? "Bot is rolling…" : "";
        } else {
          selInfoEl.textContent = "";
        }
        rollB.textContent = rolled ? "Set aside + roll" : "Roll dice";
        const selInvalid = sel.length > 0 && selScore < 0;
        rollB.disabled = over || busy || whose !== "you" || (rolled && selScore <= 0);
        bankB.disabled = over || busy || whose !== "you" || selInvalid || (turnPts + Math.max(selScore, 0) <= 0);
      }

      // ~400ms shuffle of all dice faces before settling.
      function animateDice(finals, done) {
        const g = gen;
        const els = Array.from(root.querySelectorAll("#fk-dice .fk-die"));
        AudioFX.tick();
        let n = 0;
        const iv = setInterval(() => {
          if (!alive || g !== gen) {
            clearInterval(iv);
            return;
          }
          els.forEach(el => {
            el.innerHTML = faceHTML(rnd6());
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

      function startTurn(who) {
        if (over) return;
        whose = who;
        turnPts = 0;
        aside = [];
        selected.clear();
        rolled = false;
        busy = false;
        active = [1, 1, 1, 1, 1, 1];
        render();
        if (who === "ai") {
          busy = true;
          render();
          setStatus("Bot's turn — it rolls…", "info");
          later(aiRoll, 900);
        } else {
          setStatus("Your turn — roll the dice.", "info");
        }
      }

      function farkle(who) {
        AudioFX.error();
        turnPts = 0;
        if (who === "you") {
          setStatus(`FARKLE! ${fmt(active)} has no scoring dice — turn points lost.`, "lose");
          log(`rolled ${fmt(active)} — FARKLE! Turn over.`, true);
          busy = true;
          render();
          later(() => startTurn("ai"), 1700);
        } else {
          setStatus(`Bot rolled ${fmt(active)} — FARKLE! Its turn points are lost. Your turn.`, "win");
          log(`rolled ${fmt(active)} — FARKLE! Turn over.`, false);
          busy = true;
          render();
          later(() => startTurn("you"), 1700);
        }
      }

      // ---- player actions ----
      function onRoll() {
        if (over || busy || whose !== "you") return;
        if (rolled) {
          const sel = selectedValues();
          if (sel.length === 0) {
            App.toast("Select at least one scoring die first", "warning");
            return;
          }
          const s = scoreSet(sel);
          if (s <= 0) {
            App.toast("That selection isn't a fully scoring set", "warning");
            return;
          }
          turnPts += s;
          aside = aside.concat(sel);
          active = active.filter((_, i) => !selected.has(i));
          selected.clear();
          AudioFX.place();
          log(`sets aside ${fmt(sel)} (+${s}) — turn ${turnPts}`, true);
          if (active.length === 0) {
            active = [1, 1, 1, 1, 1, 1]; // placeholders, immediately rerolled
            rolled = false;
            App.toast("Hot dice! All six roll again", "success");
            log(`hot dice — rerolls all six!`, true);
          }
        }
        doRoll();
      }

      function doRoll() {
        busy = true;
        selected.clear();
        rolled = false;
        render();
        const vals = active.map(rnd6);
        animateDice(vals, () => {
          active = vals;
          rolled = true;
          busy = false;
          if (!hasAnyScoring(active)) return farkle("you");
          render();
          setStatus("Tap scoring dice to select, then set aside + roll again, or bank.", "info");
        });
      }

      function onBank() {
        if (over || busy || whose !== "you") return;
        const sel = selectedValues();
        let s = 0;
        if (sel.length) {
          const sc = scoreSet(sel);
          if (sc < 0) {
            App.toast("Deselect the non-scoring dice first", "warning");
            return;
          }
          s = sc;
        }
        const gain = turnPts + s;
        if (gain <= 0) {
          App.toast("Nothing to bank yet — set dice aside first", "warning");
          return;
        }
        youBank += gain;
        AudioFX.place();
        log(`banks ${gain} → ${youBank}`, true);
        if (youBank >= 10000) {
          render();
          return endGame(true);
        }
        setStatus(`You banked ${gain} → ${youBank}. Bot's turn…`, "info");
        busy = true;
        render();
        later(() => startTurn("ai"), 800);
      }

      // ---- AI: always sets aside the best-scoring selection; banks at ≥ 350 ----
      function aiRoll() {
        if (over || whose !== "ai") return;
        const vals = active.map(rnd6);
        animateDice(vals, () => {
          if (over || whose !== "ai") return;
          active = vals;
          rolled = true;
          render();
          if (!hasAnyScoring(active)) return farkle("ai");
          log(`rolls ${fmt(active)}`, false);
          later(aiSetAside, 850);
        });
      }

      function aiSetAside() {
        if (over || whose !== "ai") return;
        const best = bestSubset(active);
        const sel = active.filter((_, i) => best.mask & (1 << i));
        turnPts += best.score;
        aside = aside.concat(sel);
        active = active.filter((_, i) => !(best.mask & (1 << i)));
        selected.clear();
        AudioFX.place();
        log(`sets aside ${fmt(sel)} (+${best.score}) — turn ${turnPts}`, false);
        render();
        if (turnPts >= 350) {
          later(aiBank, 900);
        } else {
          if (active.length === 0) {
            active = [1, 1, 1, 1, 1, 1];
            rolled = false;
            log(`hot dice — rerolls all six!`, false);
            render();
          }
          later(aiRoll, 900);
        }
      }

      function aiBank() {
        if (over || whose !== "ai") return;
        botBank += turnPts;
        const b = turnPts;
        turnPts = 0;
        AudioFX.place();
        log(`banks ${b} → ${botBank}`, false);
        if (botBank >= 10000) {
          render();
          return endGame(false);
        }
        setStatus(`Bot banks ${b} → ${botBank}. Your turn.`, "info");
        later(() => startTurn("you"), 900);
      }

      function endGame(won) {
        over = true;
        busy = false;
        render();
        App.recordResult(won, youBank);
        const best = Storage.getBest("farkle");
        if (youBank > (best != null ? best : 0)) {
          Storage.setBest("farkle", youBank);
          App.toast("New best bank: " + youBank, "success");
        }
        if (won) {
          AudioFX.win();
          setStatus(`You reached ${youBank} — you win!`, "win");
          App.toast("You beat the greed-bot!", "success");
        } else {
          AudioFX.lose();
          setStatus(`The bot reached ${botBank} first — you lose with ${youBank}.`, "lose");
        }
        render();
      }

      function newGame() {
        gen++;
        over = false;
        busy = false;
        youBank = 0;
        botBank = 0;
        turnPts = 0;
        logLines = [];
        logEl.innerHTML = "";
        startTurn("you");
      }

      rollB.addEventListener("click", onRoll);
      bankB.addEventListener("click", onBank);
      root.querySelector("#fk-new").addEventListener("click", () => {
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
      App.showModal("How to play Farkle",
        `Race the bot to <b>10,000 points</b>. On your turn:
        <br><br>1. <b>Roll</b> all six dice.
        <br>2. <b>Select</b> at least one die or combo that scores, and set it aside.
        <br>3. Either <b>set aside + roll</b> the remaining dice to grow your turn points, or <b>bank</b> your turn points into your score.
        <br>4. If a roll contains <b>no</b> scoring dice, that's a <b>FARKLE</b> — you lose all unbanked turn points and your turn ends.
        <br>5. If you set aside all six dice, that's <b>hot dice</b> — roll all six again and keep going.
        <br><br><b>Scoring combos:</b>
        <br>• Each <b>1</b> = 100 &nbsp; • Each <b>5</b> = 50
        <br>• <b>Three-of-a-kind</b> = face × 100 (three 1s = <b>1000</b>)
        <br>• <b>Four-of-a-kind</b> = 1000
        <br>• <b>Five-of-a-kind</b> = 2000
        <br>• <b>Six-of-a-kind</b> = 3000
        <br>• <b>Three pairs</b> = 1500
        <br>• <b>Straight 1-6</b> = 1500
        <br>• <b>Two triplets</b> = 2500
        <br><br>Only dice that are <b>fully part of a combo</b> may be set aside (e.g. a lone 3 can never be selected).
        <br><br><b>Bot policy:</b> always sets aside the highest-scoring selection, and banks once its turn reaches 350+ points.`);
    },
  });
})();
