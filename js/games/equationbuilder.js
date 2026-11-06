/* Equation Builder — drag numbers and operators into slots to form a valid equation. */
(function () {
  // Each puzzle: target result + 5 numbers + 4 operators; player arranges to form A op B op C op D op E = target
  const PUZZLES = [
    {nums: [3, 5, 2, 8, 4], ops: ["+", "-", "*", "+"], target: 22},
    {nums: [6, 2, 4, 3, 5], ops: ["*", "-", "+", "+"], target: 24},
    {nums: [10, 5, 2, 3, 4], ops: ["-", "*", "+", "-"], target: 7},
    {nums: [12, 4, 3, 6, 2], ops: ["/", "*", "-", "+"], target: 10},
    {nums: [7, 3, 8, 4, 2], ops: ["+", "*", "-", "+"], target: 33},
    {nums: [9, 3, 5, 4, 2], ops: ["/", "*", "+", "-"], target: 17},
  ];

  function applyOp(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b !== 0 ? a / b : NaN;
  }

  // Strict left-to-right evaluation
  function evalL2R(nums, ops) {
    let v = nums[0];
    for (let i = 0; i < ops.length; i++) {
      v = applyOp(v, nums[i + 1], ops[i]);
      if (isNaN(v) || !isFinite(v)) return NaN;
    }
    return v;
  }

  let live = null;
  GameRegistry.register({
    id: "equationbuilder",
    name: "Equation Builder",
    icon: "🧮",
    category: "logic",
    description: "Arrange numbers & operators to hit the target",
    tags: ["math", "thinking"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, arrangement = [], used = {}, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Target</div><div class="val" id="eb-target">—</div></div>
          <div class="score-cell"><div class="label">Result</div><div class="val" id="eb-result">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="eb-best">—</div></div>
        </div>
        <div class="status info" id="eb-status">Drag numbers and operators into the slots to form an equation that hits the target.</div>
        <div id="eb-pool" class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;margin:14px 0;"></div>
        <div id="eb-slots" class="row" style="justify-content:center;gap:4px;flex-wrap:wrap;margin:14px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="eb-clear">Clear</button>
          <button class="btn primary" id="eb-check">Check</button>
        </div>
        <p class="hint">Place all 5 numbers and 4 operators in order. Equation is evaluated <b>left to right</b> (no operator precedence).</p>
      `;
      const statusEl = root.querySelector("#eb-status");
      const poolEl = root.querySelector("#eb-pool");
      const slotsEl = root.querySelector("#eb-slots");

      function renderPool() {
        poolEl.innerHTML = "";
        const all = [];
        puzzle.nums.forEach((n, i) => all.push({kind: "num", val: n, idx: i}));
        puzzle.ops.forEach((o, i) => all.push({kind: "op", val: o, idx: i}));
        all.forEach(item => {
          if (used[`${item.kind}-${item.idx}`]) return;
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = item.kind === "op" ? (item.val === "*" ? "×" : item.val === "/" ? "÷" : item.val) : item.val;
          btn.style.cssText = "min-width:48px;height:48px;font-family:var(--font-mono);font-weight:700;font-size:1.1rem;";
          btn.addEventListener("click", () => {
            if (over) return;
            // Place in next empty slot
            for (let i = 0; i < arrangement.length; i++) {
              if (!arrangement[i]) {
                arrangement[i] = item;
                used[`${item.kind}-${item.idx}`] = true;
                AudioFX.tick();
                renderAll();
                return;
              }
            }
          });
          poolEl.appendChild(btn);
        });
      }

      function renderSlots() {
        slotsEl.innerHTML = "";
        arrangement.forEach((item, i) => {
          const slot = document.createElement("button");
          slot.className = "btn";
          if (item) {
            slot.textContent = item.kind === "op" ? (item.val === "*" ? "×" : item.val === "/" ? "÷" : item.val) : item.val;
            slot.style.cssText = "min-width:48px;height:48px;font-family:var(--font-mono);font-weight:700;font-size:1.1rem;background:var(--accent);color:#fff;";
            slot.addEventListener("click", () => {
              if (over) return;
              used[`${item.kind}-${item.idx}`] = false;
              arrangement[i] = null;
              AudioFX.click();
              renderAll();
            });
          } else {
            slot.textContent = "_";
            slot.style.cssText = "min-width:48px;height:48px;font-family:var(--font-mono);font-weight:700;font-size:1.1rem;color:var(--text-muted);border-style:dashed;";
          }
          slotsEl.appendChild(slot);
        });
        // Compute result if complete
        const filled = arrangement.filter(x => x).length;
        if (filled === arrangement.length) {
          const nums = arrangement.filter(x => x.kind === "num").map(x => x.val);
          const ops = arrangement.filter(x => x.kind === "op").map(x => x.val);
          // Build the sequence based on slot positions
          const seq = arrangement.map(x => x.val);
          // Reconstruct: numbers and ops alternate starting with number
          const orderedNums = [];
          const orderedOps = [];
          arrangement.forEach(x => {
            if (x.kind === "num") orderedNums.push(x.val);
            else orderedOps.push(x.val);
          });
          // The actual order is by position — we need nums[i] and ops[i] in the order they appear
          // The arrangement is: num, op, num, op, num, op, num, op, num (5 nums + 4 ops)
          // So orderedNums and orderedOps are correct only if slots are filled in valid positions
          const result = evalL2R(orderedNums, orderedOps);
          root.querySelector("#eb-result").textContent = isNaN(result) ? "—" : (Number.isInteger(result) ? result : result.toFixed(2));
        } else {
          root.querySelector("#eb-result").textContent = "—";
        }
      }

      function renderAll() {
        renderPool();
        renderSlots();
      }

      function check() {
        const filled = arrangement.filter(x => x).length;
        if (filled !== arrangement.length) {
          AudioFX.error();
          statusEl.textContent = "Fill all slots first";
          statusEl.className = "status lose";
          return;
        }
        const orderedNums = arrangement.filter(x => x.kind === "num").map(x => x.val);
        const orderedOps = arrangement.filter(x => x.kind === "op").map(x => x.val);
        if (orderedNums.length !== 5 || orderedOps.length !== 4) {
          AudioFX.error();
          statusEl.textContent = "Slots must alternate num, op, num, op, …";
          statusEl.className = "status lose";
          return;
        }
        const result = evalL2R(orderedNums, orderedOps);
        if (Math.abs(result - puzzle.target) < 1e-6) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Equation equals the target!";
          statusEl.className = "status win";
          const best = Storage.getBest("equationbuilder");
          if (!best || 100 > best) {
            Storage.setBest("equationbuilder", 100);
            root.querySelector("#eb-best").textContent = 100;
          }
        } else {
          AudioFX.error();
          statusEl.textContent = `Equation = ${result}, not ${puzzle.target}. Try again.`;
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#eb-check").addEventListener("click", check);
      root.querySelector("#eb-clear").addEventListener("click", () => {
        if (over) return;
        arrangement = arrangement.map(() => null);
        used = {};
        AudioFX.click();
        renderAll();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        arrangement = Array(9).fill(null); // 5 nums + 4 ops
        used = {};
        over = false;
        root.querySelector("#eb-target").textContent = puzzle.target;
        const best = Storage.getBest("equationbuilder");
        root.querySelector("#eb-best").textContent = best || "—";
        statusEl.textContent = "Drag numbers and operators into the slots to form an equation that hits the target.";
        statusEl.className = "status info";
        renderAll();
      }

      live = {
        solve: function () {
          if (over) return;

          // Brute force a solution (permutations of nums and ops)
          function perm(arr) {
            if (arr.length <= 1) return [arr];
            const out = [];
            for (let i = 0; i < arr.length; i++) {
              const rest = arr.slice(0, i).concat(arr.slice(i + 1));
              for (const p of perm(rest)) out.push([arr[i], ...p]);
            }
            return out;
          }

          const np = perm(puzzle.nums);
          const opP = perm(puzzle.ops);
          let found = null;
          outer: for (const nums of np) for (const ops of opP) {
            if (Math.abs(evalL2R(nums, ops) - puzzle.target) < 1e-6) {
              found = nums.map((n, i) => `${n}${i < ops.length ? " " + (ops[i] === "*" ? "×" : ops[i] === "/" ? "÷" : ops[i]) + " " : ""}`).join("") + ` ${puzzle.target}`;
              break outer;
            }
          }
          if (found) App.showModal("Equation Builder — solution", `One solution:<br><br><b style="font-family:var(--font-mono);">${found}</b>`);
          else App.toast("No solution found", "warning");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Equation Builder",
        `Place the 5 <b>numbers</b> and 4 <b>operators</b> into the slots in an order that produces the <b>target result</b>.
        <br><br>The equation is evaluated <b>strictly left to right</b> (no operator precedence).
        <br><br>Click a tile in the pool to add it to the next empty slot. Click a placed tile to remove it back to the pool.`);
    },
  });
})();
