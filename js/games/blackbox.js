/* Black Box — probe with rays to locate the hidden atoms */
(function () {
  let live = null;
  GameRegistry.register({
    id: "blackbox",
    name: "Black Box",
    icon: "🕳️",
    category: "logic",
    description: "Probe with rays to locate the hidden atoms",
    tags: ["logic", "deduction", "science"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const N = 8;
      let atoms, marks, rays, solvedCount, best, probing;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="bb-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bb-best">0</div></div>
          <div class="score-cell"><div class="label">Atoms</div><div class="val" id="bb-n">5</div></div>
        </div>
        <div class="status info" id="bb-status">Click the border to fire rays. Click cells to mark atoms. Fewer probes = better!</div>
        <div class="center"><canvas id="bb-canvas" width="380" height="380"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="bb-check">✔ Verify</button>
          <button class="btn btn-sm" id="bb-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Rays deflect off atoms (diagonal hit) or are absorbed (direct hit). Same number in/out = straight through or a "hit".</p>
      `;

      const canvas = root.querySelector("#bb-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bb-status");
      best = Storage.getBest("blackbox") || 0;
      solvedCount = 0;
      const CELL = 38, OFF = 30;
      const NUM_ATOMS = 5;

      function generate() {
        atoms = new Set();
        while (atoms.size < NUM_ATOMS) {
          atoms.add(Math.floor(Math.random() * N * N));
        }
        marks = new Set();
        rays = []; // {entry, exit, path}
        probing = 0;
        render();
        statusEl.textContent = "Click the border to fire rays. Click cells to mark atoms. Fewer probes = better!";
        statusEl.className = "status info";
      }

      const idx = (x, y) => y * N + x;

      function fireRay(entry) {
        // entry: {side: 0..3 (N,E,S,W border), pos: 0..N-1} - enter moving inward
        probing++;
        let x, y, dx, dy;
        if (entry.side === 0) {
          x = entry.pos;
          y = -1;
          dx = 0;
          dy = 1;
        } else if (entry.side === 1) {
          x = N;
          y = entry.pos;
          dx = -1;
          dy = 0;
        } else if (entry.side === 2) {
          x = entry.pos;
          y = N;
          dx = 0;
          dy = -1;
        } else {
          x = -1;
          y = entry.pos;
          dx = 1;
          dy = 0;
        }
        const path = [{x, y}];
        let exit = null, guard = 0;
        while (guard++ < 100) {
          // deflection rules BEFORE moving: check atom diagonal ahead
          const fx = x + dx, fy = y + dy;
          // a) direct hit: atom directly ahead
          if (inGrid(fx, fy) && atoms.has(idx(fx, fy))) {
            exit = "HIT";
            break;
          }
          // b) deflection: atoms at both diagonal sides of the cell ahead
          const dxAbs = Math.abs(dx);
          const d1x = fx + (dxAbs ? 0 : 1), d1y = fy + (dxAbs ? 1 : 0);
          const d2x = fx - (dxAbs ? 0 : 1), d2y = fy - (dxAbs ? 1 : 0);
          const h1 = inGrid(d1x, d1y) && atoms.has(idx(d1x, d1y));
          const h2 = inGrid(d2x, d2y) && atoms.has(idx(d2x, d2y));
          if (h1 && h2) { // 180° reflect
            const t = dx;
            dx = -dy;
            dy = -t;
            continue;
          } else if (h1 || h2) { // 90° deflect away from the atom
            // rotate direction: if atom on left side, turn right; if on right, turn left
            const left = h1; // d1 is "left" of travel
            const t = dx;
            if (left) {
              dx = -dy;
              dy = t;
            } else {
              dx = dy;
              dy = -t;
            }
            continue;
          }
          x += dx;
          y += dy;
          path.push({x, y});
          if (!inGrid(x, y)) {
            // exited
            if (x < 0) exit = {side: 3, pos: y};
            else if (x >= N) exit = {side: 1, pos: y};
            else if (y < 0) exit = {side: 0, pos: x};
            else exit = {side: 2, pos: x};
            break;
          }
        }
        rays.push({entry, exit, path});
        AudioFX.click();
        render();
      }

      function inGrid(x, y) {
        return x >= 0 && y >= 0 && x < N && y < N;
      }

      function borderLabel(side, pos) {
        // H = hit, number pairs shared by entry/exit
        return side + ":" + pos;
      }

      function render() {
        root.querySelector("#bb-solved").textContent = solvedCount;
        root.querySelector("#bb-best").textContent = best;
        root.querySelector("#bb-n").textContent = NUM_ATOMS;
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, 380, 380);
        // grid — lifted off the frame so the play area reads
        ctx.fillStyle = "#16213c";
        ctx.fillRect(OFF, OFF, N * CELL, N * CELL);
        ctx.strokeStyle = "rgba(148,163,184,0.2)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= N; i++) {
          ctx.beginPath();
          ctx.moveTo(OFF + i * CELL, OFF);
          ctx.lineTo(OFF + i * CELL, OFF + N * CELL);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(OFF, OFF + i * CELL);
          ctx.lineTo(OFF + N * CELL, OFF + i * CELL);
          ctx.stroke();
        }
        // rays
        rays.forEach(r => {
          ctx.strokeStyle = "rgba(56,189,248,0.55)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          r.path.forEach((p, i) => {
            const sx = OFF + p.x * CELL + CELL / 2, sy = OFF + p.y * CELL + CELL / 2;
            i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
          });
          ctx.stroke();
        });
        // entry/exit labels around border
        const labelAt = (side, pos, text, color) => {
          ctx.fillStyle = color || "#38bdf8";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          let x, y;
          if (side === 0) {
            x = OFF + pos * CELL + CELL / 2;
            y = OFF - 10;
          } else if (side === 2) {
            x = OFF + pos * CELL + CELL / 2;
            y = OFF + N * CELL + 18;
          } else if (side === 3) {
            x = OFF - 12;
            y = OFF + pos * CELL + CELL / 2 + 4;
          } else {
            x = OFF + N * CELL + 12;
            y = OFF + pos * CELL + CELL / 2 + 4;
          }
          ctx.fillText(text, x, y);
        };
        // map entries to exits for numbering
        let n = 1;
        const used = new Set();
        rays.forEach(r => {
          const ek = r.entry.side + ":" + r.entry.pos;
          if (used.has(ek)) return;
          used.add(ek);
          if (r.exit === "HIT") {
            labelAt(r.entry.side, r.entry.pos, "H", "#f87171");
          } else if (r.exit && r.exit.side === r.entry.side && r.exit.pos === r.entry.pos) {
            labelAt(r.entry.side, r.entry.pos, "R", "#fbbf24"); // reflection back
          } else {
            const xk = r.exit && (r.exit.side + ":" + r.exit.pos);
            const partner = rays.find(rr => rr.exit && rr.entry.side === rr.exit.side && false) || null;
            // find the ray whose entry is our exit (paired ray)
            const partner2 = rays.find(rr => rr !== r && rr.exit && rr.exit.side === r.entry.side && rr.exit.pos === r.entry.pos && rr.entry.side === r.exit.side && rr.entry.pos === r.exit.pos);
            const lbl = String(n++);
            labelAt(r.entry.side, r.entry.pos, lbl);
            if (xk != null) labelAt(r.exit.side, r.exit.pos, lbl);
            if (partner2) { /* both labeled same */
            }
          }
        });
        // marks (player's atom guesses)
        marks.forEach(i => {
          const x = i % N, y = Math.floor(i / N);
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.arc(OFF + x * CELL + CELL / 2, OFF + y * CELL + CELL / 2, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#e9d5ff";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        // border hover affordance text
        ctx.fillStyle = "rgba(148,163,184,0.5)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("↑ click numbers area to shoot rays", 4, 14);
      }

      canvas.addEventListener("pointerdown", (e) => {
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (380 / r.width);
        const my = (e.clientY - r.top) * (380 / r.height);
        // inside grid? toggle mark
        const gx = Math.floor((mx - OFF) / CELL), gy = Math.floor((my - OFF) / CELL);
        if (gx >= 0 && gy >= 0 && gx < N && gy < N) {
          const i = idx(gx, gy);
          marks.has(i) ? marks.delete(i) : marks.add(i);
          AudioFX.pop();
          render();
          return;
        }
        // border? fire ray
        const entry = hitBorder(mx, my);
        if (entry) {
          fireRay(entry);
          return;
        }
      });

      function hitBorder(mx, my) {
        // top row of numbers
        if (my < OFF && my > OFF - 24) {
          const pos = Math.floor((mx - OFF) / CELL);
          if (pos >= 0 && pos < N) return {side: 0, pos};
        }
        if (my > OFF + N * CELL && my < OFF + N * CELL + 24) {
          const pos = Math.floor((mx - OFF) / CELL);
          if (pos >= 0 && pos < N) return {side: 2, pos};
        }
        if (mx < OFF && mx > OFF - 24) {
          const pos = Math.floor((my - OFF) / CELL);
          if (pos >= 0 && pos < N) return {side: 3, pos};
        }
        if (mx > OFF + N * CELL && mx < OFF + N * CELL + 24) {
          const pos = Math.floor((my - OFF) / CELL);
          if (pos >= 0 && pos < N) return {side: 1, pos};
        }
        return null;
      }

      function verify() {
        const ok = marks.size === atoms.size && [...atoms].every(a => marks.has(a));
        if (ok) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("blackbox", best);
          }
          statusEl.textContent = `✔ All atoms located with ${probing} probes! New puzzle…`;
          statusEl.className = "status win";
          after(generate, 2000);
        } else {
          AudioFX.error();
          statusEl.textContent = `✗ Not quite — you marked ${marks.size} cells. Keep probing!`;
          statusEl.className = "status lose";
        }
        render();
      }

      root.querySelector("#bb-check").addEventListener("click", verify);
      root.querySelector("#bb-new").addEventListener("click", generate);

      live = {
        hint: function () {
          // gentlest honest hint: one cell that certainly has NO atom (prefer one with no atom adjacent either)
          const cold = [], empty = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (atoms.has(idx(x, y)) || marks.has(idx(x, y))) continue;
            let near = false;
            for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && atoms.has(idx(nx, ny))) {
                near = true;
                break;
              }
            }
            (near ? empty : cold).push([x, y]);
          }
          const pool = cold.length ? cold : empty;
          if (!pool.length) {
            if (marks.size > NUM_ATOMS) App.toast(`💡 Hint: you've marked ${marks.size} cells but only ${NUM_ATOMS} atoms hide here`, "info");
            else App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const [x, y] = pool[Math.floor(Math.random() * pool.length)];
          AudioFX.reveal();
          App.toast(`💡 Hint: there is no atom at row ${y + 1}, column ${x + 1} — rule it out`, "info");
        },
      };
      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Black Box",
        `Five atoms hide in the grid. You can't see them — but you can shoot <b>rays</b> from the numbered border.
        <br><br>• Ray hits an atom <b>head-on</b> → it's <b>absorbed</b> (label <b style="color:#f87171">H</b>).
        <br>• Ray passes <b>diagonally</b> near an atom → it <b>deflects 90°</b>.
        <br>• Two atoms flank the path → the ray <b>reflects back</b> (label <b style="color:#fbbf24">R</b>).
        <br>• Otherwise it flies straight through — entry and exit share a <b>number</b>.
        <br>Click border cells to fire, click grid cells to <b>mark</b> where you think atoms are, then <b>Verify</b>.`);
    },
  });
})();
