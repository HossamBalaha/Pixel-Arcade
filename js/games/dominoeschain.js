/* dominoeschain — Classic Draw Dominoes (double-six, 28 tiles) vs AI.
   Match the open ends of the chain; draw from the boneyard if stuck; first to empty their hand wins. */
(function () {
  "use strict";

  const PIPS = {0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};

  function freshSet() {
    const set = [];
    for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) set.push([a, b]);
    return set;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function pips(t) {
    return t[0] + t[1];
  }

  function fitsEnd(t, v) {
    return t[0] === v || t[1] === v;
  }

  function hasPlayable(hand, ends) {
    if (!ends) return hand.length > 0; // empty chain: anything plays
    return hand.some(function (t) {
      return fitsEnd(t, ends.l) || fitsEnd(t, ends.r);
    });
  }

  GameRegistry.register({
    id: "dominoeschain",
    name: "Domino Chain",
    icon: "🁣",
    category: "strategy",
    description: "Classic draw dominoes — match the open ends of the chain, empty your hand first.",
    tags: ["strategy", "classic", "dominoes", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "short",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let hand, aiHand, bone, chain, turn, over, sel, passes, recorded;
      const timers = [];

      function later(fn, ms) {
        const id = setTimeout(function () {
          if (alive) fn();
        }, ms);
        timers.push(id);
        return id;
      }

      root.innerHTML = `
        <style>
          .dm-half { width:100%; height:100%; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr);
            place-items:center; padding:2px; box-sizing:border-box; }
          .dm-pip { width:5px; height:5px; border-radius:50%; background:transparent; }
          .dm-pip.on { background:var(--text); box-shadow:0 0 0 0.5px rgba(0,0,0,0.25); }
          .dm-tile-h { display:flex; flex:0 0 auto; width:58px; height:36px; background:var(--bg-elev);
            border:1px solid var(--border); border-radius:6px; overflow:hidden; box-sizing:border-box; }
          .dm-tile-h .dm-half + .dm-half { border-left:1px solid var(--border); }
          .dm-tile-v { display:flex; flex-direction:column; width:38px; height:60px; background:var(--bg-elev);
            border:1.5px solid var(--border); border-radius:7px; overflow:hidden; box-sizing:border-box; cursor:pointer;
            transition:transform .12s; }
          .dm-tile-v .dm-half + .dm-half { border-top:1px solid var(--border); }
          .dm-tile-v .dm-pip { width:5px; height:5px; }
          .dm-hand { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; min-height:64px; padding:6px;
            background:var(--bg-soft); border-radius:var(--radius); }
          .dm-hand .sel { transform:translateY(-8px); border-color:var(--accent); box-shadow:0 4px 10px rgba(0,0,0,0.3); }
          .dm-hand .playable { border-color:var(--accent); }
          .dm-hand .dead { opacity:0.55; }
          .dm-hand .shake { animation:dm-shake .3s; }
          @keyframes dm-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
          #dm-chain { display:flex; align-items:center; gap:3px; overflow-x:auto; padding:10px 6px; min-height:60px;
            background:var(--bg-soft); border-radius:var(--radius); scrollbar-width:thin; }
          #dm-chain .end-tile { border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
          .dm-empty { color:var(--text-muted); font-size:0.85rem; padding:0 8px; }
        </style>
        <div class="status info" id="dm-status">Your turn — play any tile to start the chain</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Your tiles</div><div class="val" id="dm-p">7</div></div>
          <div class="score-cell"><div class="label">Boneyard</div><div class="val" id="dm-b">14</div></div>
          <div class="score-cell"><div class="label">AI tiles</div><div class="val" id="dm-a">7</div></div>
        </div>
        <div id="dm-chain"></div>
        <div class="row center" id="dm-choice" style="gap:8px;margin-top:8px;display:none;"></div>
        <div class="dm-hand" id="dm-hand" style="margin-top:8px;"></div>
        <p class="hint" id="dm-hint">Tap a tile to play it on a matching end of the chain. First to empty their hand wins.</p>
        <div class="row center" style="gap:10px;margin-top:8px;">
          <button class="btn" id="dm-new">New game</button>
          <button class="btn" id="dm-draw">Draw from boneyard</button>
          <button class="btn danger" id="dm-pass">Pass</button>
        </div>
      `;

      const statusEl = root.querySelector("#dm-status");
      const chainEl = root.querySelector("#dm-chain");
      const handEl = root.querySelector("#dm-hand");
      const choiceEl = root.querySelector("#dm-choice");
      const drawBtn = root.querySelector("#dm-draw");
      const passBtn = root.querySelector("#dm-pass");
      const hintEl = root.querySelector("#dm-hint");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function ends() {
        if (!chain.length) return null;
        return {l: chain[0].l, r: chain[chain.length - 1].r};
      }

      function halfHTML(v) {
        const on = PIPS[v];
        let s = '<div class="dm-half">';
        for (let i = 0; i < 9; i++) s += '<span class="dm-pip' + (on.indexOf(i) >= 0 ? " on" : "") + '"></span>';
        return s + "</div>";
      }

      function orient(tile, end, side) {
        // returns [l,r] orientation so the matching half touches the given end
        const other = tile[0] === end ? tile[1] : tile[0];
        return side === "R" ? [end, other] : [other, end];
      }

      function newGame() {
        const set = shuffle(freshSet());
        hand = set.slice(0, 7);
        aiHand = set.slice(7, 14);
        bone = set.slice(14);
        chain = [];
        turn = "P";
        over = false;
        sel = null;
        passes = 0;
        recorded = false;
        setStatus("Your turn — play any tile to start the chain");
        hintEl.textContent = "Tap a tile to play it on a matching end of the chain. First to empty their hand wins.";
        render();
      }

      function render() {
        // chain
        chainEl.innerHTML = "";
        if (!chain.length) {
          chainEl.innerHTML = '<span class="dm-empty">The chain is empty — your first tile can be anything.</span>';
        } else {
          chain.forEach(function (t, i) {
            const d = document.createElement("div");
            d.className = "dm-tile-h" + ((i === 0 || i === chain.length - 1) ? " end-tile" : "");
            d.innerHTML = halfHTML(t.l) + halfHTML(t.r);
            chainEl.appendChild(d);
          });
        }
        // hand
        handEl.innerHTML = "";
        const e = ends();
        const playable = !over && turn === "P" ? hand.map(function (t) {
          return e === null || fitsEnd(t, e.l) || fitsEnd(t, e.r);
        }) : hand.map(function () {
          return false;
        });
        hand.forEach(function (t, i) {
          const d = document.createElement("div");
          d.className = "dm-tile-v" + (sel === i ? " sel" : "") + (playable[i] ? " playable" : " dead");
          d.innerHTML = halfHTML(t[0]) + halfHTML(t[1]);
          d.addEventListener("click", function () {
            onTile(i, d);
          });
          handEl.appendChild(d);
        });
        root.querySelector("#dm-p").textContent = hand.length;
        root.querySelector("#dm-a").textContent = aiHand.length;
        root.querySelector("#dm-b").textContent = bone.length;
        // contextual buttons
        const canPlay = hand.length && hasPlayable(hand, e);
        drawBtn.disabled = !(turn === "P" && !over && !canPlay && bone.length > 0);
        passBtn.disabled = !(turn === "P" && !over && !canPlay && bone.length === 0);
        choiceEl.style.display = "none";
      }

      function onTile(i, el) {
        if (over || turn !== "P") return;
        if (sel === i) {
          sel = null;
          render();
          return;
        }
        const e = ends();
        const t = hand[i];
        const fitL = e === null || fitsEnd(t, e.l);
        const fitR = e === null || fitsEnd(t, e.r);
        if (!fitL && !fitR) {
          AudioFX.error();
          setStatus("That tile matches neither end (" + e.l + " / " + e.r + ") — draw from the boneyard", "warning");
          el.classList.add("shake");
          later(function () {
            el.classList.remove("shake");
          }, 320);
          return;
        }
        sel = i;
        AudioFX.click();
        render();
        if (fitL && fitR && e !== null) askEnd(i);
        else playTile(i, e === null || fitR ? "R" : "L");
      }

      function askEnd(i) {
        const e = ends();
        const t = hand[i];
        choiceEl.style.display = "flex";
        choiceEl.innerHTML = "";
        const lbl = document.createElement("span");
        lbl.style.cssText = "color:var(--text-muted);font-size:0.9rem;";
        lbl.textContent = "Play " + t[0] + "·" + t[1] + " on which end?";
        choiceEl.appendChild(lbl);
        const bl = document.createElement("button");
        bl.className = "btn";
        bl.textContent = "◀ Left end (" + e.l + ")";
        bl.addEventListener("click", function () {
          AudioFX.click();
          playTile(i, "L");
        });
        const br = document.createElement("button");
        br.className = "btn";
        br.textContent = "Right end (" + e.r + ") ▶";
        br.addEventListener("click", function () {
          AudioFX.click();
          playTile(i, "R");
        });
        choiceEl.appendChild(bl);
        choiceEl.appendChild(br);
      }

      function playTile(i, side) {
        const t = hand[i];
        const e = ends();
        if (e === null) {
          chain.push({l: t[0], r: t[1]});
        } else if (side === "R") {
          chain.push({l: orient(t, e.r, "R")[0], r: orient(t, e.r, "R")[1]});
        } else {
          chain.unshift({l: orient(t, e.l, "L")[0], r: orient(t, e.l, "L")[1]});
        }
        hand.splice(i, 1);
        sel = null;
        passes = 0;
        AudioFX.place();
        render();
        requestAnimationFrame(function () {
          if (!alive) return;
          chainEl.scrollLeft = side === "L" ? 0 : chainEl.scrollWidth;
        });
        if (!hand.length) {
          finish("P");
          return;
        }
        turn = "A";
        setStatus("AI is playing…");
        render();
        later(aiTurn, 850);
      }

      function aiTurn() {
        if (over || turn !== "A") return;
        let e = ends();
        let drew = 0;
        while (!hasPlayable(aiHand, e) && bone.length) {
          aiHand.push(bone.pop());
          drew++;
        }
        if (drew) {
          setStatus("AI drew " + drew + " tile" + (drew > 1 ? "s" : "") + " from the boneyard…");
          render();
          later(aiPlay, 600);
          return;
        }
        aiPlay();
      }

      function aiPlay() {
        if (over || turn !== "A") return;
        const e = ends();
        if (!hasPlayable(aiHand, e)) {
          // boneyard empty and still stuck → pass
          passes++;
          setStatus("AI passes", "warning");
          render();
          if (passes >= 2) {
            blockedEnd();
            return;
          }
          turn = "P";
          later(function () {
            if (over) return;
            setStatus("Your turn" + (hasPlayable(hand, ends()) ? "" : " — no playable tile"));
            render();
          }, 600);
          return;
        }
        // highest-pip playable tile
        let bi = -1, bs = -1;
        aiHand.forEach(function (t, i) {
          if (e === null || fitsEnd(t, e.l) || fitsEnd(t, e.r)) {
            const s = pips(t) + Math.random() * 0.9;
            if (s > bs) {
              bs = s;
              bi = i;
            }
          }
        });
        const t = aiHand[bi];
        let side;
        if (e === null) {
          side = "R";
        } else {
          const fitL = fitsEnd(t, e.l), fitR = fitsEnd(t, e.r);
          if (fitL && !fitR) side = "L";
          else if (fitR && !fitL) side = "R";
          else {
            // both fit: expose the value the AI holds most of
            const cnt = function (v) {
              return aiHand.filter(function (x) {
                return x !== t && (x[0] === v || x[1] === v);
              }).length;
            };
            const newL = cnt(t[0] === e.l ? t[1] : t[0]);
            const newR = cnt(t[0] === e.r ? t[1] : t[0]);
            side = newR >= newL ? "R" : "L";
          }
        }
        if (e === null) chain.push({l: t[0], r: t[1]});
        else if (side === "R") {
          const o = orient(t, e.r, "R");
          chain.push({l: o[0], r: o[1]});
        } else {
          const o = orient(t, e.l, "L");
          chain.unshift({l: o[0], r: o[1]});
        }
        aiHand.splice(bi, 1);
        passes = 0;
        AudioFX.move();
        render();
        requestAnimationFrame(function () {
          if (!alive) return;
          chainEl.scrollLeft = side === "L" ? 0 : chainEl.scrollWidth;
        });
        if (!aiHand.length) {
          finish("A");
          return;
        }
        turn = "P";
        const canPlay = hasPlayable(hand, ends());
        setStatus(canPlay ? "Your turn" : (bone.length ? "Your turn — no playable tile, draw from the boneyard" : "Your turn — no playable tile, you must pass"));
        render();
      }

      function blockedEnd() {
        over = true;
        const pp = hand.reduce(function (s, t) {
          return s + pips(t);
        }, 0);
        const ap = aiHand.reduce(function (s, t) {
          return s + pips(t);
        }, 0);
        if (pp < ap) {
          setStatus("🔒 Game blocked — you hold fewer pips (" + pp + " vs " + ap + "). You win!", "win");
          AudioFX.win();
          if (!recorded) {
            recorded = true;
            App.recordResult(true, ap);
            App.toast("Blocked game — you win on pips " + pp + " vs " + ap, "success");
          }
        } else if (ap < pp) {
          setStatus("🔒 Game blocked — AI holds fewer pips (" + ap + " vs " + pp + "). You lose.", "lose");
          AudioFX.lose();
          if (!recorded) {
            recorded = true;
            App.recordResult(false, pp);
            App.toast("Blocked game — AI wins on pips", "warning");
          }
        } else {
          setStatus("🔒 Game blocked — dead heat (" + pp + " pips each)!", "info");
          App.toast("Blocked game — a perfect tie!", "info");
        }
        render();
      }

      function finish(who) {
        over = true;
        if (who === "P") {
          const ap = aiHand.reduce(function (s, t) {
            return s + pips(t);
          }, 0);
          setStatus("🎉 You played all your tiles — you win " + ap + " points!", "win");
          AudioFX.win();
          if (!recorded) {
            recorded = true;
            App.recordResult(true, ap);
            App.toast("Domino! You win " + ap + " points", "success");
          }
        } else {
          const pp = hand.reduce(function (s, t) {
            return s + pips(t);
          }, 0);
          setStatus("💀 The AI played all its tiles — you lose (" + pp + " pips left)", "lose");
          AudioFX.lose();
          if (!recorded) {
            recorded = true;
            App.recordResult(false, pp);
            App.toast("The AI went out first", "warning");
          }
        }
        render();
      }

      drawBtn.addEventListener("click", function () {
        if (over || turn !== "P" || !bone.length) return;
        hand.push(bone.pop());
        sel = null;
        AudioFX.flip();
        setStatus(hasPlayable(hand, ends()) ? "Your turn — you drew a playable tile!" : "Still nothing — draw again");
        render();
      });
      passBtn.addEventListener("click", function () {
        if (over || turn !== "P" || bone.length) return;
        passes++;
        sel = null;
        AudioFX.error();
        setStatus("You pass", "warning");
        if (passes >= 2) {
          blockedEnd();
          return;
        }
        turn = "A";
        render();
        later(aiTurn, 850);
      });
      root.querySelector("#dm-new").addEventListener("click", function () {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
        timers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Domino Chain",
        `Classic <b>draw dominoes</b> with the full 28-tile double-six set. You play against the AI.
        <br><br><b>Deal:</b> 7 tiles each; the remaining 14 form the <b>boneyard</b> (face down).
        <br><br><b>Play:</b> you start — your first tile may be anything. After that, each tile must be played on an open <b>end of the chain</b> with a matching number of pips (the highlighted end tiles). If a tile fits both ends, you'll be asked which end to use. Doubles are just normal tiles here.
        <br><br><b>Stuck?</b> If nothing in your hand matches, <b>draw from the boneyard</b> until you can play. If the boneyard is empty you must <b>pass</b>.
        <br><br><b>Winning:</b> the first player to play out their entire hand wins, scoring the total pips left in the opponent's hand. If both players pass in a row (blocked game), whoever holds <b>fewer pips</b> wins.
        <br><br>The AI plays the highest-pip tile it can and draws when stuck — just like you.`);
    },
  });
})();
