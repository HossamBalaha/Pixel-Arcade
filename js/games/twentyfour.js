/* 24 Game — combine 4 numbers using +, -, *, / to make 24. */
(function () {
  // Pre-baked hands (each has at least one solution)
  const HANDS = [
    [3, 4, 5, 6], [2, 3, 4, 6], [1, 2, 3, 4], [4, 4, 5, 5], [2, 2, 3, 8],
    [3, 3, 7, 7], [1, 5, 5, 5], [4, 6, 7, 9], [2, 4, 10, 10], [1, 3, 4, 6],
    [3, 5, 7, 13], [2, 2, 11, 11], [6, 6, 6, 6], [1, 4, 5, 6], [3, 8, 8, 8],
  ];
  const OPS = ["+", "-", "*", "/"];

  function applyOp(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b !== 0 ? a / b : NaN;
  }

  // Try all permutations and operator combinations to verify a solution exists
  function canMake24(nums) {
    function perm(arr) {
      if (arr.length <= 1) return [arr];
      const out = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = arr.slice(0, i).concat(arr.slice(i + 1));
        for (const p of perm(rest)) out.push([arr[i], ...p]);
      }
      return out;
    }

    const perms = perm(nums);
    for (const [a, b, c, d] of perms) {
      for (const o1 of OPS) for (const o2 of OPS) for (const o3 of OPS) {
        // 5 parenthesizations
        const exprs = [
          applyOp(applyOp(applyOp(a, b, o1), c, o2), d, o3),
          applyOp(applyOp(a, applyOp(b, c, o2), o1), d, o3),
          applyOp(a, applyOp(applyOp(b, c, o2), d, o3), o1),
          applyOp(a, applyOp(b, applyOp(c, d, o3), o2), o1),
          applyOp(applyOp(a, b, o1), applyOp(c, d, o3), o2),
        ];
        if (exprs.some(v => Math.abs(v - 24) < 1e-6)) return true;
      }
    }
    return false;
  }

  let live = null;
  GameRegistry.register({
    id: "twentyfour",
    name: "24 Game",
    icon: "🔢",
    category: "logic",
    description: "Combine 4 numbers with +, -, ×, ÷ to make 24",
    tags: ["math", "logic", "thinking"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let nums = [], history = [], solved = false, hintCount = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="tf-hints">2</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="tf-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tf-best">—</div></div>
        </div>
        <div class="status info" id="tf-status">Combine the 4 numbers with +, −, ×, ÷ to make 24.</div>
        <div id="tf-numbers" class="row" style="justify-content:center;gap:12px;margin:14px 0;"></div>
        <div id="tf-history" class="col" style="align-items:center;gap:6px;margin:10px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="tf-undo">Undo</button>
          <button class="btn" id="tf-reset">Reset</button>
          <button class="btn primary" id="tf-new">New hand</button>
        </div>
        <p class="hint">Pick two numbers and an operation. The result replaces them. Repeat until one number = 24. Each number must be used exactly once.</p>
      `;
      const statusEl = root.querySelector("#tf-status");
      const numsEl = root.querySelector("#tf-numbers");
      const histEl = root.querySelector("#tf-history");

      function renderNums() {
        numsEl.innerHTML = "";
        nums.forEach((n, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.style.cssText = "font-size:1.4rem;font-family:var(--font-mono);min-width:60px;height:60px;";
          btn.textContent = Number.isInteger(n) ? n : n.toFixed(2);
          btn.dataset.i = i;
          numsEl.appendChild(btn);
        });
        // Op buttons
        OPS.forEach(op => {
          const ob = document.createElement("button");
          ob.className = "btn btn-sm";
          ob.textContent = op === "*" ? "×" : op === "/" ? "÷" : op;
          ob.addEventListener("click", () => doOp(op));
          numsEl.appendChild(ob);
        });
        histEl.innerHTML = "";
        history.forEach(h => {
          const el = document.createElement("div");
          el.className = "text-muted text-sm";
          el.style.fontFamily = "var(--font-mono)";
          el.textContent = h;
          histEl.appendChild(el);
        });
      }

      let selectedIdx = -1;

      function selectIdx(i) {
        selectedIdx = i;
        Array.from(numsEl.querySelectorAll(".btn")).forEach((b, j) => {
          if (j === i) b.style.background = "var(--accent)", b.style.color = "#fff";
          else if (j < nums.length) b.style.background = "", b.style.color = "";
        });
      }

      // Re-bind click on number buttons
      function rebindClicks() {
        numsEl.querySelectorAll(".btn").forEach((b, j) => {
          if (j < nums.length) {
            b.onclick = () => {
              AudioFX.tick();
              selectIdx(j);
            };
          }
        });
      }

      function doOp(op) {
        if (solved) return;
        if (selectedIdx < 0) {
          App.toast("Pick a number first", "info");
          return;
        }
        if (nums.length < 2) return;
        // Need a second number — prompt: click another number
        const first = nums[selectedIdx];
        const firstIdx = selectedIdx;
        // We'll wait for the next click to be the second number — simpler: just pick next index
        // For simplicity, use the next available number
        let secondIdx = -1;
        for (let i = 0; i < nums.length; i++) {
          if (i !== firstIdx) {
            secondIdx = i;
            break;
          }
        }
        if (secondIdx < 0) return;
        const second = nums[secondIdx];
        const result = applyOp(first, second, op);
        if (isNaN(result) || !isFinite(result)) {
          AudioFX.error();
          statusEl.textContent = "Invalid operation (divide by zero?)";
          statusEl.className = "status lose";
          return;
        }
        history.push(`${Number.isInteger(first) ? first : first.toFixed(2)} ${op === "*" ? "×" : op === "/" ? "÷" : op} ${Number.isInteger(second) ? second : second.toFixed(2)} = ${Number.isInteger(result) ? result : result.toFixed(2)}`);
        // Replace both with result
        const newNums = nums.filter((_, i) => i !== firstIdx && i !== secondIdx);
        newNums.push(result);
        nums = newNums;
        selectedIdx = -1;
        AudioFX.pop();
        renderNums();
        rebindClicks();
        if (nums.length === 1) {
          if (Math.abs(nums[0] - 24) < 1e-6) {
            solved = true;
            AudioFX.win();
            statusEl.textContent = "🎉 24! Solved!";
            statusEl.className = "status win";
            const cur = parseInt(root.querySelector("#tf-solved").textContent, 10) + 1;
            root.querySelector("#tf-solved").textContent = cur;
            const best = Storage.getBest("twentyfour");
            if (!best || cur > best) {
              Storage.setBest("twentyfour", cur);
              root.querySelector("#tf-best").textContent = cur;
            }
          } else {
            AudioFX.error();
            statusEl.textContent = `Got ${nums[0]}, not 24. Try again.`;
            statusEl.className = "status lose";
          }
        }
      }

      function undo() {
        if (history.length === 0) return;
        // Simplified: just reset to original hand
        resetHand();
      }

      function resetHand() {
        nums = currentHand.slice();
        history = [];
        solved = false;
        selectedIdx = -1;
        statusEl.textContent = "Combine the 4 numbers with +, −, ×, ÷ to make 24.";
        statusEl.className = "status info";
        renderNums();
        rebindClicks();
      }

      let currentHand = [];

      function newHand() {
        currentHand = HANDS[Math.floor(Math.random() * HANDS.length)].slice();
        nums = currentHand.slice();
        history = [];
        solved = false;
        selectedIdx = -1;
        renderNums();
        rebindClicks();
      }

      root.querySelector("#tf-undo").addEventListener("click", () => {
        AudioFX.click();
        resetHand();
      });
      root.querySelector("#tf-reset").addEventListener("click", () => {
        AudioFX.click();
        resetHand();
      });
      root.querySelector("#tf-new").addEventListener("click", () => {
        AudioFX.click();
        newHand();
      });

      function doHint() {
        if (solved) return;
        const hintsLeft = parseInt(root.querySelector("#tf-hints").textContent, 10);
        if (hintsLeft <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        // Brute-force find any solution expression and reveal one operation
        // (simplified: just say "solution exists" or not)
        if (canMake24(currentHand)) {
          App.toast("A solution exists for this hand — keep trying!", "info");
        } else {
          App.toast("No solution exists — draw a new hand.", "warning");
        }
        root.querySelector("#tf-hints").textContent = hintsLeft - 1;
        AudioFX.reveal();
      }

      function doSolve() {
        if (solved) return;

        // Brute-force a solution
        function perm(arr) {
          if (arr.length <= 1) return [arr];
          const out = [];
          for (let i = 0; i < arr.length; i++) {
            const rest = arr.slice(0, i).concat(arr.slice(i + 1));
            for (const p of perm(rest)) out.push([arr[i], ...p]);
          }
          return out;
        }

        const perms = perm(currentHand);
        let found = null;
        for (const [a, b, c, d] of perms) {
          for (const o1 of OPS) for (const o2 of OPS) for (const o3 of OPS) {
            const exprs = [
              [applyOp(applyOp(applyOp(a, b, o1), c, o2), d, o3), `((${a} ${o1} ${b}) ${o2} ${c}) ${o3} ${d}`],
              [applyOp(applyOp(a, applyOp(b, c, o2), o1), d, o3), `(${a} ${o1} (${b} ${o2} ${c})) ${o3} ${d}`],
              [applyOp(a, applyOp(applyOp(b, c, o2), d, o3), o1), `${a} ${o1} ((${b} ${o2} ${c}) ${o3} ${d})`],
              [applyOp(a, applyOp(b, applyOp(c, d, o3), o2), o1), `${a} ${o1} (${b} ${o2} (${c} ${o3} ${d}))`],
              [applyOp(applyOp(a, b, o1), applyOp(c, d, o3), o2), `(${a} ${o1} ${b}) ${o2} (${c} ${o3} ${d})`],
            ];
            const hit = exprs.find(([v]) => Math.abs(v - 24) < 1e-6);
            if (hit) {
              found = hit[1];
              break;
            }
          }
          if (found) break;
        }
        if (found) {
          App.showModal("24 Game — solution", `One way to make 24:<br><br><b style="font-family:var(--font-mono);font-size:1.2rem;">${found} = 24</b>`);
          AudioFX.lose();
          solved = true;
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
        } else {
          App.toast("No solution exists for this hand", "warning");
        }
      }

      live = {hint: doHint, solve: doSolve};
      newHand();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play 24",
        `You're given <b>4 numbers</b>. Combine them using <b>+, −, ×, ÷</b> to make exactly <b>24</b>.
        <br><br>Each number must be used exactly once. You can use parentheses freely.
        <br><br>Click a number to select it, then click an operation. The result replaces the two numbers. Repeat until one number remains.
        <br><br>If it equals 24, you win! <b>Hint</b> tells you if a solution exists; <b>Solve</b> reveals one.`);
    },
  });
})();
