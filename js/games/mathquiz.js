/* Math Quiz — solve arithmetic problems before time runs out */
(function () {
  function gen(op, level) {
    let a, b, ans, txt;
    const max = level === "easy" ? 12 : level === "medium" ? 25 : 50;
    if (op === "add") {
      a = rand(1, max);
      b = rand(1, max);
      ans = a + b;
      txt = `${a} + ${b}`;
    } else if (op === "sub") {
      a = rand(1, max);
      b = rand(1, a);
      ans = a - b;
      txt = `${a} − ${b}`;
    } else if (op === "mul") {
      a = rand(2, level === "easy" ? 9 : 12);
      b = rand(2, level === "easy" ? 9 : 12);
      ans = a * b;
      txt = `${a} × ${b}`;
    } else if (op === "div") {
      b = rand(2, level === "easy" ? 9 : 12);
      ans = rand(2, level === "easy" ? 9 : 12);
      a = b * ans;
      txt = `${a} ÷ ${b}`;
    }
    return {txt, ans};
  }

  function rand(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  const OPS = ["add", "sub", "mul", "div"];

  GameRegistry.register({
    id: "mathquiz",
    name: "Math Quiz",
    icon: "➕",
    category: "quiz",
    description: "Solve as many arithmetic problems as you can in 60s",
    tags: ["quiz", "math", "timer"],
    mount: function (root, {App, AudioFX, Storage}) {
      let level = "easy", score, time, current, timerInterval, over;

      function newGame() {
        score = 0;
        time = 60;
        over = false;
        nextProblem();
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          root.querySelector("#mq-t").textContent = time + "s";
          root.querySelector("#mq-t").style.color = time <= 10 ? "var(--danger)" : "";
          if (time <= 0) {
            clearInterval(timerInterval);
            over = true;
            AudioFX.lose();
            statusEl.textContent = `⏰ Time! You solved ${score} problems.`;
            statusEl.className = "status lose";
            const best = Storage.getBest("mathquiz_" + level) || 0;
            if (score > best) {
              Storage.setBest("mathquiz_" + level, score);
              App.toast("New best for " + level + ": " + score, "success");
            }
            renderProblem();
          }
        }, 1000);
      }

      function nextProblem() {
        const op = OPS[Math.floor(Math.random() * OPS.length)];
        current = gen(op, level);
        renderProblem();
        root.querySelector("#mq-input").value = "";
        root.querySelector("#mq-input").focus();
      }

      function renderProblem() {
        root.querySelector("#mq-problem").textContent = current.txt + " = ?";
        root.querySelector("#mq-s").textContent = score;
        root.querySelector("#mq-t").textContent = time + "s";
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="mq-diff">
            <button class="diff-btn ${level === "easy" ? "active" : ""}" data-l="easy">Easy</button>
            <button class="diff-btn ${level === "medium" ? "active" : ""}" data-l="medium">Med</button>
            <button class="diff-btn ${level === "hard" ? "active" : ""}" data-l="hard">Hard</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="mq-s">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="mq-t">60s</div></div>
        </div>
        <div class="status info" id="mq-status">Solve as many problems as you can in 60 seconds!</div>
        <div style="text-align:center;font-family:var(--font-mono);font-size:2rem;font-weight:700;margin:18px 0;" id="mq-problem"></div>
        <div class="row" style="justify-content:center;">
          <input type="number" id="mq-input"
                 style="padding:10px 14px;font-size:1.2rem;border-radius:var(--radius-sm);background:var(--bg-elev);border:1px solid var(--border);color:var(--text);width:140px;text-align:center;" />
          <button class="btn primary" id="mq-go">Submit</button>
        </div>
        <p class="hint">Type your answer and press <b>Enter</b>. Covers +, −, ×, ÷.</p>
      `;

      const statusEl = root.querySelector("#mq-status");

      function submit() {
        if (over) return;
        const v = parseInt(root.querySelector("#mq-input").value, 10);
        if (isNaN(v)) return;
        if (v === current.ans) {
          score++;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct! Next…";
          statusEl.className = "status win";
          setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            if (!over) {
              statusEl.textContent = "Keep going!";
              statusEl.className = "status info";
            }
          }, 600);
          nextProblem();
        } else {
          AudioFX.error();
          statusEl.textContent = `✗ ${current.txt} = ${current.ans}. Try the next one!`;
          statusEl.className = "status lose";
          nextProblem();
        }
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          newGame();
          return;
        }
        if (e.key === "Enter") submit();
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#mq-go").addEventListener("click", submit);
      root.querySelectorAll("#mq-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#mq-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.l;
        newGame();
      }));

      newGame();
      return function cleanup() {
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInterval);
      };
    },
    help: function () {
      App.showModal("How to play Math Quiz",
        `You have 60 seconds to solve as many arithmetic problems as you can.
        <br>Problems cover addition, subtraction, multiplication, and division.
        <br><br>Type your answer and press <b>Enter</b> (or click Submit). Correct answers score 1 point.
        <br><br><b>Easy</b>: small numbers. <b>Medium</b>: up to 25, multiplication up to 12. <b>Hard</b>: up to 50. Best score tracked per difficulty.`);
    },
  });
})();
