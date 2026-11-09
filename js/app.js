/* ============================================================
   app.js — main controller: routing, theme, grid, modals, toasts
   ============================================================ */
(function (global) {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const App = {
    currentGame: null,
    currentCleanup: null,
    state: {
      filter: "all",
      favOnly: false,
      search: "",
      ageFilter: "all",
      diffFilter: "all",
      durFilter: "all",
      playersFilter: "all",
      sort: "default",
    },

    // ---------- Theme + mode + sound ----------
    applyTheme() {
      const theme = Storage.getTheme();
      const mode = Storage.getMode();
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-mode", mode);
      $$(".menu-chip").forEach(c => {
        const active = c.dataset.themeId === theme;
        c.classList.toggle("active", active);
        c.setAttribute("aria-pressed", active ? "true" : "false");
      });
      $("#mode-sun").classList.toggle("hidden", mode === "dark");
      $("#mode-moon").classList.toggle("hidden", mode === "light");
      const modeBtn = $("#mode-btn");
      if (modeBtn) {
        modeBtn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
        modeBtn.title = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
      }
    },
    setTheme(t) {
      Storage.setTheme(t);
      App.applyTheme();
      App.renderGrid();
    },
    toggleMode() {
      const next = Storage.getMode() === "dark" ? "light" : "dark";
      Storage.setMode(next);
      App.applyTheme();
    },
    applySound() {
      const on = Storage.getSound();
      $("#sound-on").classList.toggle("hidden", !on);
      $("#sound-off").classList.toggle("hidden", on);
      const btn = $("#sound-btn");
      if (btn) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.title = on ? "Mute sound" : "Unmute sound";
      }
    },
    toggleSound() {
      const next = !Storage.getSound();
      Storage.setSound(next);
      App.applySound();
      if (next) AudioFX.click();
      App.toast(next ? "Sound on" : "Sound muted", "info");
    },

    // ---------- Accessibility ----------
    applyA11y() {
      const a = Storage.getA11y();
      const html = document.documentElement;
      html.style.fontSize = a.fontScale + "%";
      html.setAttribute("data-a11y-contrast", a.highContrast ? "on" : "off");
      html.setAttribute("data-a11y-motion", a.reduceMotion ? "on" : "off");
      html.setAttribute("data-a11y-dyslexia", a.dyslexiaFont ? "on" : "off");
      html.setAttribute("data-a11y-focus", a.largeFocus ? "on" : "off");
      html.setAttribute("data-a11y-cb", a.colorBlind || "off");
      const valEl = $("#a11y-font-val");
      if (valEl) valEl.textContent = a.fontScale + "%";
      const contrastEl = $("#a11y-contrast");
      if (contrastEl) contrastEl.checked = !!a.highContrast;
      const motionEl = $("#a11y-motion");
      if (motionEl) motionEl.checked = !!a.reduceMotion;
      const dyslexiaEl = $("#a11y-dyslexia");
      if (dyslexiaEl) dyslexiaEl.checked = !!a.dyslexiaFont;
      const focusEl = $("#a11y-focus");
      if (focusEl) focusEl.checked = !!a.largeFocus;
      const cbEl = $("#a11y-cb");
      if (cbEl) cbEl.value = a.colorBlind || "off";
    },

    // ---------- Per-game <head> meta ----------
    // On first call, snapshots the original index.html <title>, <meta
    // name="description">, any Open Graph tags, and <link rel="canonical">.
    // For each opened game it swaps in per-game values (title, description,
    // og:title, og:description, og:type=website, og:url=current URL, and a
    // canonical link to the current URL). When a game closes, pass null to
    // restore the original head state. Any OG/canonical node we added is
    // tagged data-app-managed="1" so we can remove it cleanly on restore.
    _metaOriginal: null,
    _ensureMeta(attr, key, val) {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", val);
      el.setAttribute("data-app-managed", "1");
      return el;
    },
    _ensureCanonical(href) {
      let el = document.head.querySelector('link[rel="canonical"]');
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
      el.setAttribute("data-app-managed", "1");
      return el;
    },
    updateMeta(game) {
      // Snapshot the original head state the first time we run.
      if (App._metaOriginal == null) {
        const titleEl = document.head.querySelector("title");
        const descEl = document.head.querySelector('meta[name="description"]');
        const og = (p) => {
          const m = document.head.querySelector(`meta[property="${p}"]`);
          return m ? m.getAttribute("content") : null;
        };
        const canon = document.head.querySelector('link[rel="canonical"]');
        App._metaOriginal = {
          title: titleEl ? titleEl.textContent : "",
          description: descEl ? descEl.getAttribute("content") : "",
          ogTitle: og("og:title"),
          ogDescription: og("og:description"),
          ogType: og("og:type"),
          ogUrl: og("og:url"),
          canonical: canon ? canon.getAttribute("href") : null,
        };
      }
      if (!game) {
        // Restore the original head state.
        const titleEl = document.head.querySelector("title");
        if (titleEl) titleEl.textContent = App._metaOriginal.title;
        const descEl = document.head.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute("content", App._metaOriginal.description);
        const restoreOrRemoveMeta = (selector, originalVal) => {
          const el = document.head.querySelector(selector);
          if (originalVal === null) {
            // Wasn't present originally — drop only what we added.
            if (el && el.getAttribute("data-app-managed") === "1") el.remove();
          } else if (el) {
            el.setAttribute("content", originalVal);
          }
        };
        restoreOrRemoveMeta('meta[property="og:title"]', App._metaOriginal.ogTitle);
        restoreOrRemoveMeta('meta[property="og:description"]', App._metaOriginal.ogDescription);
        restoreOrRemoveMeta('meta[property="og:type"]', App._metaOriginal.ogType);
        restoreOrRemoveMeta('meta[property="og:url"]', App._metaOriginal.ogUrl);
        const canon = document.head.querySelector('link[rel="canonical"]');
        if (App._metaOriginal.canonical === null) {
          if (canon && canon.getAttribute("data-app-managed") === "1") canon.remove();
        } else if (canon) {
          canon.setAttribute("href", App._metaOriginal.canonical);
        }
        return;
      }
      // Apply per-game meta.
      const title = `${game.name} — Pixel Arcade`;
      const desc = game.description || title;
      let titleEl = document.head.querySelector("title");
      if (!titleEl) {
        titleEl = document.createElement("title");
        document.head.appendChild(titleEl);
      }
      titleEl.textContent = title;
      let descEl = document.head.querySelector('meta[name="description"]');
      if (!descEl) {
        descEl = document.createElement("meta");
        descEl.setAttribute("name", "description");
        document.head.appendChild(descEl);
      }
      descEl.setAttribute("content", desc);
      App._ensureMeta("property", "og:title", title);
      App._ensureMeta("property", "og:description", desc);
      App._ensureMeta("property", "og:type", "website");
      App._ensureMeta("property", "og:url", location.href);
      App._ensureCanonical(location.href);
    },

    // ---------- Grid rendering ----------
    renderGrid() {
      const grid = $("#game-grid");
      // Use the registry's multi-dimensional filter
      let list = GameRegistry.filter({
        category: App.state.filter,
        age: App.state.ageFilter,
        difficulty: App.state.diffFilter,
        duration: App.state.durFilter,
        players: App.state.playersFilter,
        search: App.state.search,
        favOnly: App.state.favOnly,
      });
      // Exclude hidden games (unless showing favorites, where hidden games
      // should still be reachable so the user can un-favorite them).
      if (!App.state.favOnly) {
        list = list.filter(g => !Storage.isHidden(g.id));
      }

      // Render the home rails: daily challenge, recommended (trending + for-you),
      // recently played, and the "new games" (v4 batch) rail.
      App.renderDailyChallenge();
      App.renderHomeRecommended();
      App.renderHomeRecent();
      App.renderHomeNew();
      // Refresh the hero greeting — streak / completion counters may have
      // changed since the last render.
      App._renderGreeting();

      grid.innerHTML = "";
      if (list.length === 0) {
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🎮</div>
          <div class="empty-title">No games match your filter</div>
          <div class="empty-desc">Try resetting the filters or searching for something else.</div>
          <button class="btn primary" onclick="document.getElementById('filters-reset').click()">Reset filters</button>
        </div>`;
        const countEl = $("#filter-count");
        if (countEl) countEl.textContent = list.length;
        return;
      }

      // Apply sorting (favorites still float to the top within each sort,
      // unless the user explicitly sorts by name/plays/recent/best).
      const sortMode = App.state.sort;
      const favFirst = (a, b) => {
        const fa = Storage.isFavorite(a.id) ? 0 : 1;
        const fb = Storage.isFavorite(b.id) ? 0 : 1;
        return fa - fb;
      };
      if (sortMode === "name") {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortMode === "plays") {
        list.sort((a, b) => {
          const pa = (Storage.getStats().gamesPlayed[a.id] || 0);
          const pb = (Storage.getStats().gamesPlayed[b.id] || 0);
          return pb - pa;
        });
      } else if (sortMode === "recent") {
        const recent = Storage.getRecent();
        list.sort((a, b) => {
          const ia = recent.indexOf(a.id);
          const ib = recent.indexOf(b.id);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
      } else if (sortMode === "best") {
        list.sort((a, b) => {
          const ba = Storage.getBest(a.id);
          const bb = Storage.getBest(b.id);
          if (ba === null && bb === null) return 0;
          if (ba === null) return 1;
          if (bb === null) return -1;
          return bb - ba;
        });
      } else {
        // Default: favorites first, then registry order
        list.sort(favFirst);
      }

      list.forEach((g, idx) => {
        const best = Storage.getBest(g.id);
        const isFav = Storage.isFavorite(g.id);
        const plays = Storage.getStats().gamesPlayed[g.id] || 0;
        const card = document.createElement("button");
        card.className = "card";
        card.dataset.id = g.id;
        card.style.animationDelay = Math.min(idx * 0.02, 0.3) + "s"; // stagger fade-in
        // Build a small badges row: star difficulty + duration + players
        const diffStars = g.difficulty === "easy" ? "★☆☆" : g.difficulty === "hard" ? "★★★" : "★★☆";
        const badges = [`<span class="badge badge-diff" title="${g.difficulty}">${diffStars}</span>`];
        if (g.duration) badges.push(`<span class="badge badge-dur">${g.duration}</span>`);
        if (g.players === "2p" || g.players === "either") badges.push('<span class="badge badge-2p">👥 2P</span>');
        // Hover tooltip with play stats
        const tooltipParts = [];
        if (plays > 0) tooltipParts.push(`${plays} play${plays === 1 ? "" : "s"}`);
        if (best !== null) tooltipParts.push(`best: ${best}`);
        const tooltip = tooltipParts.length ? `<div class="card-tooltip">${tooltipParts.join(" · ")}</div>` : "";
        // NEW badge: no games are currently flagged as "new" — the user opted
        // to leave this empty for now and will populate it when adding future
        // games. Set this to an array of game IDs to mark them as new.
        const newGames = [];
        const isNew = newGames.includes(g.id);
        card.innerHTML = `
          ${isNew ? '<span class="new-badge">NEW</span>' : ""}
          <button class="fav ${isFav ? "active" : ""}" data-fav="${g.id}" title="Favorite" aria-label="Toggle favorite">${isFav ? "♥" : "♡"}</button>
          ${tooltip}
          <img class="thumb" src="assets/thumbnails/${g.id}.svg" alt="${g.name} thumbnail" loading="lazy" onerror="this.style.display='none'"/>
          <div class="icon">${g.icon}</div>
          <div class="title">${g.name}</div>
          <div class="desc">${g.description}</div>
          <div class="meta">
            <span class="tag">${g.category}</span>
            <span class="badges">${badges.join("")}</span>
            ${best !== null ? `<span class="best">★ ${best}</span>` : ""}
          </div>
        `;
        card.addEventListener("click", (e) => {
          if (e.target.closest("[data-fav]")) return; // favorite click handled separately
          AudioFX.click();
          App.openGame(g.id);
        });
        // Right-click → hide game (context menu suppressed)
        card.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          App.toggleHidden(g.id);
        });
        // Long-press (mobile) → hide game
        let pressTimer = null;
        card.addEventListener("touchstart", () => {
          pressTimer = setTimeout(() => {
            App.toggleHidden(g.id);
            pressTimer = null;
          }, 600);
        }, {passive: true});
        card.addEventListener("touchend", () => {
          if (pressTimer) clearTimeout(pressTimer);
        });
        card.addEventListener("touchmove", () => {
          if (pressTimer) clearTimeout(pressTimer);
        });
        // Preload the game script on hover (no-op for now since scripts are
        // already loaded upfront, but the hook is here for a future lazy-load).
        card.addEventListener("mouseenter", () => {
          App._preloadHint(g.id);
        });
        const favBtn = card.querySelector("[data-fav]");
        favBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const added = Storage.toggleFavorite(g.id);
          AudioFX.pop();
          App.toast(added ? `Added "${g.name}" to favorites` : `Removed "${g.name}" from favorites`, "info");
          App.renderGrid();
          App.updateGameFavBtn();
        });
        grid.appendChild(card);
      });
      // Update visible count if the element exists
      const countEl = $("#filter-count");
      if (countEl) countEl.textContent = list.length;
    },

    // ---------- Routing ----------
    route() {
      const hash = location.hash.replace(/^#\/?/, "");
      // Deep link support: ?game=id opens that game directly (shareable URL).
      if (!hash) {
        const qs = new URLSearchParams(location.search).get("game");
        if (qs && GameRegistry.get(qs)) {
          App.openGame(qs);
          return;
        }
        App.closeGame();
        return;
      }
      const game = GameRegistry.get(hash);
      if (game) App.openGame(hash);
      else App.closeGame();
    },

    openGame(id) {
      const game = GameRegistry.get(id);
      if (!game) return;
      // Lazy games: fetch + run the real script, then re-open the registered game.
      if (game.lazy && GameRegistry.load) {
        const btn = $("#game-view");
        GameRegistry.load(id).then(() => {
          App.openGame(id);
        }).catch(err => {
          console.error("Failed to load game", id, err);
          const stage = $("#game-stage");
          if (stage) stage.innerHTML = '<div class="status lose" style="padding:20px;text-align:center;">Could not load ' + id + '</div>';
        });
        return;
      }
      // Remember which card was focused so we can restore focus on close
      App._lastFocusedCard = id;
      // Cleanup previous
      if (App.currentCleanup) {
        try {
          App.currentCleanup();
        } catch (e) {
        }
        App.currentCleanup = null;
      }
      App.currentGame = game;

      // Per-game <head> meta: title, description, Open Graph tags, canonical.
      App.updateMeta(game);

      // Record this game in the recently-played list (most-recent-first)
      Storage.addRecent(id);
      // Record a play (no win/score yet — games can call App.recordResult later)
      Storage.recordPlay(id, false, null);

      // Evaluate achievements + milestones after recording the play
      const newly = App.evaluateAchievements();
      newly.forEach(a => {
        App.toast(`🏅 Achievement unlocked: ${a.title}`, "success");
        App._fireConfetti();
      });
      App._checkMilestones();

      // Update header
      $("#game-icon").textContent = game.icon;
      $("#game-title").textContent = game.name;
      $("#game-breadcrumb").textContent = game.category;
      // Show/hide Help / Hint / Solve / Share based on what the game supports
      $("#game-help-btn").classList.toggle("hidden", !game.help);
      $("#game-hint-btn").classList.toggle("hidden", !game.hint);
      $("#game-solve-btn").classList.toggle("hidden", !game.solve);
      // Share button is always available — it shares a generic result line
      App.updateGameFavBtn();

      // Announce game opened for screen readers
      App.announce(`Opened ${game.name}.`);

      // Show game view, hide home
      $("#game-view").classList.add("active");
      $("#home-view").style.display = "none";
      // Repoint the keyboard skip link at the game stage so screen-reader /
      // keyboard users jump straight into the active game rather than to the
      // (now hidden) home grid.
      const skip = document.querySelector("[data-skip-target]");
      if (skip) {
        skip.href = "#game-stage";
        skip.textContent = "Skip to game";
      }

      // Mount game
      const stage = $("#game-stage");
      stage.innerHTML = "";
      try {
        const cleanup = game.mount(stage, {App, AudioFX, Storage});
        if (typeof cleanup === "function") App.currentCleanup = cleanup;
      } catch (e) {
        console.error("Failed to mount game", id, e);
        stage.innerHTML = `<div class="status lose" style="padding:20px;text-align:center;">
          <div style="font-size:2rem;margin-bottom:8px;">😵</div>
          <div style="font-weight:600;margin-bottom:6px;">Failed to load "${game.name}"</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">${e.message || "Unknown error"}</div>
          <button class="btn primary" onclick="App.closeGame()">← Back to hub</button>
          <button class="btn" onclick="App.restart()" style="margin-left:8px;">↻ Try again</button>
        </div>`;
        AudioFX.lose();
      }

      // If the game has previously saved state in localStorage, surface a
      // toast so the player knows they can resume. We deliberately DON'T
      // auto-restore — each game decides whether to call
      // Storage.loadGameState(id) inside its own mount() handler.
      try {
        if (Storage.loadGameState(id)) App.toast("Resume previous game?", "info");
      } catch (e) { /* localStorage may be unavailable */
      }

      // Render the "You might also like" similar-games rail + recently-played
      // rail at the bottom of the game view, so the player can jump straight
      // to a related or recently-played game without going back to the hub.
      App.renderGameRails();

      if (location.hash !== "#/" + id) location.hash = "#/" + id;
      window.scrollTo(0, 0);
    },

    // Games can call this to record a win/loss + score (instead of just
    // calling Storage.submitScore). Updates the last play entry (created in
    // openGame) rather than adding a new one — avoids double-counting.
    recordResult(won, score) {
      if (!App.currentGame) return;
      const id = App.currentGame.id;
      Storage.updateLastPlay(id, won, score);
      if (score !== undefined && score !== null) Storage.submitScore(id, score);
      const newly = App.evaluateAchievements();
      newly.forEach(a => {
        App.toast(`🏅 Achievement unlocked: ${a.title}`, "success");
        App._fireConfetti();
      });
      if (won) App.announce(`You won ${App.currentGame.name}!`);
    },

    // Confetti animation — fires when an achievement is unlocked.
    // Skipped when reduce-motion is enabled (accessibility).
    _fireConfetti() {
      const a = Storage.getA11y();
      if (a.reduceMotion) return; // respect accessibility setting
      const host = document.getElementById("confetti");
      if (!host) return;
      host.style.display = "";
      host.innerHTML = "";
      const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
      for (let i = 0; i < 40; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + "s";
        piece.style.animationDuration = (2 + Math.random() * 1.5) + "s";
        piece.style.width = (6 + Math.random() * 6) + "px";
        piece.style.height = (6 + Math.random() * 6) + "px";
        host.appendChild(piece);
      }
      setTimeout(() => {
        host.style.display = "none";
        host.innerHTML = "";
      }, 3500);
    },

    // Milestone toasts — checks for play-count milestones and shows a toast
    // the first time each is crossed. Persisted so it only fires once.
    _checkMilestones() {
      const stats = Storage.getStats();
      const milestones = [1, 10, 25, 50, 100, 150, 200, 250, 500];
      const seen = JSON.parse(localStorage.getItem("gamehub:milestones-seen") || "[]");
      let newlySeen = [];
      milestones.forEach(m => {
        if (stats.totalPlays >= m && !seen.includes(m)) {
          newlySeen.push(m);
          const msg = m === 1 ? "First game played! 🎯" :
            m === 50 ? "50 games played! 💪" :
              m === 100 ? "Centurion! 100 games! 💯" :
                m === 150 ? "150 games! 🚀" :
                  `${m} games played! 🎉`;
          App.toast(msg, "success");
        }
      });
      if (newlySeen.length) {
        localStorage.setItem("gamehub:milestones-seen", JSON.stringify([...seen, ...newlySeen]));
      }
    },

    // Weekly summary toast — shown on first visit each week
    _checkWeeklySummary() {
      const lastWeek = localStorage.getItem("gamehub:weekly-summary");
      const now = new Date();
      const weekKey = now.getFullYear() + "-W" + Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
      if (lastWeek === weekKey) return;
      localStorage.setItem("gamehub:weekly-summary", weekKey);
      const stats = Storage.getStats();
      if (stats.totalPlays < 5) return; // don't show for new users
      const streak = Storage.getStreak();
      const trending = Storage.getWeeklyTrending();
      const weeklyPlays = trending.reduce((s, t) => s + t.count, 0);
      if (weeklyPlays === 0) return;
      setTimeout(() => {
        App.toast(`📊 This week: ${weeklyPlays} plays, ${stats.totalWins} wins, ${streak.current}-day streak`, "info");
      }, 1500);
    },

    // Game rating — thumbs up/down after finishing a game
    rateGame(id, rating) {
      const ratings = JSON.parse(localStorage.getItem("gamehub:ratings") || "{}");
      ratings[id] = rating; // 'up' or 'down'
      localStorage.setItem("gamehub:ratings", JSON.stringify(ratings));
      AudioFX.pop();
      App.toast(rating === 'up' ? "👍 Thanks for rating!" : "👎 Got it — we'll suggest fewer like this", "info");
    },
    getGameRating(id) {
      const ratings = JSON.parse(localStorage.getItem("gamehub:ratings") || "{}");
      return ratings[id] || null;
    },

    // Push a message into the aria-live region for screen readers.
    announce(msg) {
      const el = $("#aria-live");
      if (!el) return;
      el.textContent = "";
      // Force re-announce by clearing then setting on next tick
      setTimeout(() => {
        el.textContent = msg;
      }, 30);
    },

    // Evaluate all achievements; returns the list of newly-unlocked ones.
    // Also toggles the dot indicator on the achievements button.
    evaluateAchievements() {
      if (!window.Achievements) return [];
      const newly = Achievements.evaluate();
      const dot = $("#achv-dot");
      if (dot) {
        const unlocked = Achievements.list().filter(a => a.unlocked).length;
        dot.style.display = unlocked > 0 ? "" : "none";
      }
      return newly;
    },

    // Copy a shareable result string to the clipboard. Games can call
    // App.shareScore(text) when they have a meaningful result to share.
    shareScore(text) {
      // Shareable deep link: ?game=id survives hash-less navigation and is indexable.
      let link = location.href.split("#")[0].split("?")[0];
      if (App.currentGame) link += "?game=" + encodeURIComponent(App.currentGame.id);
      const full = `Pixel Arcade — ${App.currentGame ? App.currentGame.name : "game"}\n${text}\n${link}`;
      const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = full;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {
        }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(
          () => App.toast("📋 Copied to clipboard", "success"),
          () => {
            fallback();
            App.toast("📋 Copied to clipboard", "success");
          }
        );
      } else {
        fallback();
        App.toast("📋 Copied to clipboard", "success");
      }
    },

    // Build the small horizontal rails shown under each game: similar games
    // (scored by category/difficulty/duration/players/tags) and recently
    // played. Hidden if either list is empty.
    renderGameRails() {
      const host = $("#game-rails");
      if (!host) return;
      host.innerHTML = "";
      if (!App.currentGame) return;
      const similar = GameRegistry.similar(App.currentGame.id, 6);
      const recent = GameRegistry.recent(6).filter(g => g.id !== App.currentGame.id);
      const buildRail = (title, list) => {
        if (!list.length) return null;
        const section = document.createElement("div");
        section.className = "rail";
        const h = document.createElement("div");
        h.className = "rail-title";
        h.textContent = title;
        section.appendChild(h);
        const row = document.createElement("div");
        row.className = "rail-row";
        list.forEach(g => {
          const card = document.createElement("button");
          card.className = "rail-card";
          card.innerHTML = `
            <span class="rail-icon">${g.icon}</span>
            <span class="rail-name">${g.name}</span>
            <span class="rail-cat">${g.category}</span>
          `;
          card.addEventListener("click", () => {
            AudioFX.click();
            App.openGame(g.id);
          });
          row.appendChild(card);
        });
        section.appendChild(row);
        return section;
      };
      const simRail = buildRail("You might also like", similar);
      const recRail = buildRail("Recently played", recent);
      if (simRail) host.appendChild(simRail);
      if (recRail) host.appendChild(recRail);
      host.style.display = (simRail || recRail) ? "" : "none";
    },

    // Render the "Recently played" rail at the top of the home view.
    // Hidden when empty or when a search/filter is active.
    renderHomeRecent() {
      const host = $("#home-recent");
      const row = $("#home-recent-row");
      if (!host || !row) return;
      // Hide when filters are active — recent rail is most useful on the
      // default "All games" view, where it gives quick access to games you
      // just played.
      const filtering = App.state.filter !== "all" || App.state.ageFilter !== "all" ||
        App.state.diffFilter !== "all" || App.state.durFilter !== "all" ||
        App.state.playersFilter !== "all" || App.state.search || App.state.favOnly;
      const recent = GameRegistry.recent(10);
      if (filtering || recent.length === 0) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      host.style.display = "";
      row.innerHTML = "";
      recent.forEach(g => {
        const card = document.createElement("button");
        card.className = "rail-card";
        card.innerHTML = `
          <span class="rail-icon">${g.icon}</span>
          <span class="rail-name">${g.name}</span>
          <span class="rail-cat">${g.category}</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App.openGame(g.id);
        });
        row.appendChild(card);
      });
    },

    // Recommended for you — merges trending (most-played this week) with
    // personalized for-you picks based on the user's most-played categories,
    // capped at 8 cards. Replaces the old separate "Trending" and "For you"
    // rails so the home page shows one consolidated recommendation strip.
    renderHomeRecommended() {
      const host = $("#home-recommended");
      const row = $("#home-recommended-row");
      if (!host || !row) return;
      const filtering = App.state.filter !== "all" || App.state.ageFilter !== "all" ||
        App.state.diffFilter !== "all" || App.state.durFilter !== "all" ||
        App.state.playersFilter !== "all" || App.state.search || App.state.favOnly;
      if (filtering) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      const MAX = 8;
      const seen = new Set();
      const picks = []; // [{ game, sub }]
      // 1) Trending first — top most-played games in the last 7 days.
      const trending = Storage.getWeeklyTrending()
        .filter(t => !Storage.isHidden(t.id))
        .sort((a, b) => b.count - a.count);
      for (const t of trending) {
        if (picks.length >= MAX) break;
        const g = GameRegistry.get(t.id);
        if (!g || seen.has(g.id)) continue;
        seen.add(g.id);
        picks.push({game: g, sub: `${t.count} plays this week`});
      }
      // 2) For-you: unplayed games from the user's most-played category, then
      //    fall back to similar-to-last-played when there is no category history.
      const stats = Storage.getStats();
      const cats = Object.entries(stats.categoriesPlayed || {}).sort((a, b) => b[1] - a[1]);
      let forYouPool = [];
      if (cats.length > 0) {
        const topCat = cats[0][0];
        forYouPool = GameRegistry.byCategory(topCat)
          .filter(g => !Storage.isHidden(g.id))
          .filter(g => !(stats.gamesPlayed[g.id] || 0));
        if (forYouPool.length < 4) {
          // Played everything in the top category — show top-cat games regardless.
          forYouPool = GameRegistry.byCategory(topCat).filter(g => !Storage.isHidden(g.id));
        }
      } else if (GameRegistry.recent(1).length > 0) {
        forYouPool = GameRegistry.similar(GameRegistry.recent(1)[0].id, MAX * 2)
          .filter(g => !Storage.isHidden(g.id));
      }
      for (const g of forYouPool) {
        if (picks.length >= MAX) break;
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        picks.push({game: g, sub: g.category});
      }
      // 3) Last-resort fallback: pad with the first registered games so the
      //    rail isn't empty for brand-new users with no play history.
      if (picks.length < 3) {
        const fillers = GameRegistry.all().filter(g => !Storage.isHidden(g.id) && !seen.has(g.id));
        for (const g of fillers) {
          if (picks.length >= MAX) break;
          picks.push({game: g, sub: g.category});
        }
      }
      if (picks.length < 3) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      host.style.display = "";
      row.innerHTML = "";
      picks.forEach(({game: g, sub}) => {
        const card = document.createElement("button");
        card.className = "rail-card";
        card.innerHTML = `
          <span class="rail-icon">${g.icon}</span>
          <span class="rail-name">${g.name}</span>
          <span class="rail-cat">${sub}</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App.openGame(g.id);
        });
        row.appendChild(card);
      });
    },

    // "New games" rail — the 25 newest additions (the v4 batch). Shown only
    // on the unfiltered home view so first-time visitors can discover them.
    // Hidden when any search/filter is active.
    renderHomeNew() {
      const host = $("#home-new");
      const row = $("#home-new-row");
      if (!host || !row) return;
      const filtering = App.state.filter !== "all" || App.state.ageFilter !== "all" ||
        App.state.diffFilter !== "all" || App.state.durFilter !== "all" ||
        App.state.playersFilter !== "all" || App.state.search || App.state.favOnly;
      // "New games" rail: empty for now — the user opted to leave this for
      // future use when adding new games. Set to an array of game IDs to
      // feature them in the "New games" rail at the top of the home view.
      const NEW_IDS = [];
      const games = NEW_IDS
        .map(id => GameRegistry.get(id))
        .filter(g => g && !Storage.isHidden(g.id));
      if (filtering || games.length === 0) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      host.style.display = "";
      row.innerHTML = "";
      games.forEach(g => {
        const card = document.createElement("button");
        card.className = "rail-card";
        card.innerHTML = `
          <span class="rail-icon">${g.icon}</span>
          <span class="rail-name">${g.name}</span>
          <span class="rail-cat">${g.category}</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App.openGame(g.id);
        });
        row.appendChild(card);
      });
    },

    // Daily challenge — pick a deterministic game for today's date.
    // The same game is featured for everyone on the same day.
    // Skips hidden games by advancing to the next non-hidden one.
    renderDailyChallenge() {
      const host = $("#daily-banner");
      if (!host) return;
      const games = GameRegistry.all().filter(g => !Storage.isHidden(g.id));
      if (!games.length) {
        host.style.display = "none";
        return;
      }
      // Date-based deterministic pick
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      const game = games[seed % games.length];
      $("#daily-name").textContent = `${game.icon} ${game.name}`;
      $("#daily-desc").textContent = game.description;
      const playBtn = $("#daily-play");
      // Replace listener
      const newBtn = playBtn.cloneNode(true);
      playBtn.parentNode.replaceChild(newBtn, playBtn);
      newBtn.addEventListener("click", () => {
        AudioFX.click();
        App.openGame(game.id);
      });
      host.style.display = "";
    },

    // Stats modal — aggregate play stats + win rate donut + per-category bars
    // + game completion progress + 30-day streak calendar.
    showStats() {
      const stats = Storage.getStats();
      const streak = Storage.getStreak();
      const recent = Storage.getRecent().length;
      const favs = Storage.getFavorites().length;
      const achv = window.Achievements ? Achievements.list().filter(a => a.unlocked).length : 0;
      const achvTotal = window.Achievements ? Achievements.all.length : 0;
      const winRate = stats.totalPlays > 0 ? Math.round(stats.totalWins / stats.totalPlays * 100) : 0;
      // Game completion: unique games played out of total games registered.
      const totalGames = GameRegistry.all().length;
      const playedGames = Object.keys(stats.gamesPlayed || {})
        .filter(id => GameRegistry.get(id)).length;
      const completionPct = totalGames > 0
        ? Math.round(playedGames / totalGames * 100) : 0;
      // Win rate donut
      const R = 32, C = 2 * Math.PI * R;
      const donutOffset = C * (1 - (stats.totalWins / Math.max(1, stats.totalPlays)));
      const donut = `
        <div class="donut">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle class="donut-bg" cx="40" cy="40" r="${R}"/>
            <circle class="donut-fg" cx="40" cy="40" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${donutOffset}"/>
          </svg>
          <div class="donut-label">${winRate}%</div>
        </div>
      `;
      // Per-category progress: played / total
      const cats = ["word", "logic", "arcade", "strategy", "quiz"];
      const allGames = GameRegistry.all();
      const catTotal = {};
      cats.forEach(c => catTotal[c] = allGames.filter(g => g.category === c).length);
      const catCounts = cats.map(c => {
        const played = Object.keys(stats.gamesPlayed || {}).filter(id => {
          const g = GameRegistry.get(id);
          return g && g.category === c;
        }).length;
        return {played, total: catTotal[c]};
      });
      const maxCat = Math.max(1, ...catCounts.map(c => c.total));
      const bars = cats.map((c, i) => {
        const pct = Math.round(catCounts[i].played / Math.max(1, catCounts[i].total) * 100);
        return `<div class="stats-bar-row">
          <span class="stats-bar-label">${c}</span>
          <span class="stats-bar-track"><span class="stats-bar-fill" style="width:${pct}%"></span></span>
          <span class="stats-bar-val">${catCounts[i].played}/${catCounts[i].total}</span>
        </div>`;
      }).join("");
      // 30-day streak calendar — scan the plays log timestamps and mark
      // every day the user actually played at least one game.
      const DAY = 86400000;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startTs = today.getTime() - 29 * DAY; // 30 squares incl. today
      const dayKeyFor = (d) => d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      const dayPlayed = {};
      const plays = Storage.getPlays();
      for (const gid in plays) {
        for (const p of plays[gid]) {
          if (p.ts >= startTs) dayPlayed[dayKeyFor(new Date(p.ts))] = true;
        }
      }
      const todayKey = dayKeyFor(today);
      const squares = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(startTs + i * DAY);
        const k = dayKeyFor(d);
        const cls = ["cal-square"];
        if (dayPlayed[k]) cls.push("played");
        if (k === todayKey) cls.push("today");
        squares.push(`<div class="${cls.join(" ")}" title="${k}${dayPlayed[k] ? " — played" : ""}"></div>`);
      }
      const calendar = `
        <div class="stats-calendar" role="img" aria-label="Activity for the last 30 days">${squares.join("")}</div>
        <div class="calendar-legend">
          <span><span class="cal-sample" style="background:var(--success, #22c55e);"></span>Played</span>
          <span><span class="cal-sample" style="background:var(--border);"></span>No activity</span>
          <span style="margin-left:auto;color:var(--text-muted);">Last 30 days</span>
        </div>
      `;
      // Most-played game
      const mostPlayed = Object.entries(stats.gamesPlayed || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => {
          const g = GameRegistry.get(id);
          return g ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${g.icon} ${g.name}</span><span style="color:var(--text-muted);font-family:var(--font-mono);">${n} plays</span></div>` : "";
        }).join("");
      const body = `
        <div class="stats-completion" aria-label="Game completion">
          <div class="completion-head">
            <span class="completion-label">Game completion</span>
            <span class="completion-val">${playedGames} / ${totalGames} games played (${completionPct}%)</span>
          </div>
          <div class="completion-bar"><div class="completion-fill" style="width:${completionPct}%"></div></div>
        </div>
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:14px;">
          ${donut}
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Win rate</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--text);">${stats.totalWins} wins / ${stats.totalPlays} plays</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-val">${streak.current}</div><div class="stat-label">Day streak</div></div>
          <div class="stat-card"><div class="stat-val">${streak.longest}</div><div class="stat-label">Best streak</div></div>
          <div class="stat-card"><div class="stat-val">${favs}</div><div class="stat-label">Favorites</div></div>
          <div class="stat-card"><div class="stat-val">${recent}</div><div class="stat-label">Recent</div></div>
          <div class="stat-card"><div class="stat-val">${achv}/${achvTotal}</div><div class="stat-label">Achievements</div></div>
        </div>
        <div class="stats-breakdown">
          <h4 style="margin-bottom:6px;">Plays by category</h4>
          ${bars}
        </div>
        <div class="stats-breakdown">
          <h4 style="margin-bottom:6px;">Activity — last 30 days</h4>
          ${calendar}
        </div>
        ${mostPlayed ? `<div class="stats-breakdown"><h4 style="margin-bottom:6px;">Most played</h4>${mostPlayed}</div>` : ""}
      `;
      App.showModal("Your stats", body, undefined, {wide: true});
    },

    // Achievements modal — redesigned with progress ring + better card states.
    showAchievements() {
      if (!window.Achievements) {
        App.toast("Achievements not loaded", "info");
        return;
      }
      const list = Achievements.list();
      const unlocked = list.filter(a => a.unlocked).length;
      const total = list.length;
      const pct = total > 0 ? Math.round(unlocked / total * 100) : 0;
      // Progress ring (SVG circle with stroke-dashoffset)
      const R = 26, C = 2 * Math.PI * R;
      const offset = C * (1 - unlocked / Math.max(1, total));
      const ring = `
        <div class="achv-progress-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" r="${R}"/>
            <circle class="ring-fg" cx="32" cy="32" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="ring-label">${pct}%</div>
        </div>
      `;
      const cards = list.map(a => `
        <div class="achv-card ${a.unlocked ? "unlocked" : "locked"}">
          <div class="achv-icon">${a.icon}</div>
          <div class="achv-title">${a.title}</div>
          <div class="achv-desc">${a.desc}</div>
          <div class="achv-status">${a.unlocked ? "✓ Unlocked" : "Locked"}</div>
        </div>
      `).join("");
      const body = `
        <div class="achv-header">
          ${ring}
          <div class="achv-header-text">
            <h3>${unlocked} of ${total} unlocked</h3>
            <p>Play more games to unlock badges. Some are earned by playing specific categories, hitting streaks, or playing at unusual hours.</p>
          </div>
        </div>
        <div class="achv-grid">${cards}</div>
      `;
      App.showModal("Achievements", body, undefined, {wide: true});
    },

    // Hide/unhide a game (long-press or right-click on the card).
    toggleHidden(id) {
      const hidden = Storage.toggleHidden(id);
      AudioFX.pop();
      App.toast(hidden ? `Hidden "${GameRegistry.get(id).name}"` : `Unhidden "${GameRegistry.get(id).name}"`, "info");
      App.renderGrid();
    },

    // Data export — download all user data as JSON.
    exportData() {
      const data = Storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixel-arcade-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      AudioFX.click();
      App.toast("Backup downloaded", "success");
    },

    // Data import — read JSON file and restore.
    importData(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Storage.importData(data);
          App.applyTheme();
          App.applySound();
          App.applyA11y();
          App.renderGrid();
          App.evaluateAchievements();
          AudioFX.win();
          App.toast("Backup restored", "success");
        } catch (e) {
          App.toast("Invalid backup file: " + e.message, "warning");
        }
      };
      reader.readAsText(file);
    },

    closeGame() {
      if (App.currentCleanup) {
        try {
          App.currentCleanup();
        } catch (e) {
        }
        App.currentCleanup = null;
      }
      App.currentGame = null;
      // Restore the original index.html <head> meta (title, description,
      // OG tags, canonical) — the per-game overrides are removed/reverted.
      App.updateMeta(null);
      // NOTE: We intentionally do NOT clear any saved game state here —
      // each game owns its own save/restore lifecycle via Storage.saveGameState
      // / Storage.loadGameState, and the player may want to resume next visit.
      $("#game-view").classList.remove("active");
      $("#home-view").style.display = "";
      // Restore the keyboard skip link to point at the home grid.
      const skip = document.querySelector("[data-skip-target]");
      if (skip) {
        skip.href = "#game-grid";
        skip.textContent = "Skip to games";
      }
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      App.renderGrid(); // refresh best scores / favs
      // Return focus to the card the user opened the game from (if still in DOM)
      if (App._lastFocusedCard) {
        const card = document.querySelector(`#game-grid .card[data-id="${App._lastFocusedCard}"]`);
        if (card) card.focus();
        App._lastFocusedCard = null;
      }
    },

    updateGameFavBtn() {
      const btn = $("#game-fav-btn");
      if (!App.currentGame) {
        btn.textContent = "♡";
        return;
      }
      btn.textContent = Storage.isFavorite(App.currentGame.id) ? "♥" : "♡";
      btn.style.color = Storage.isFavorite(App.currentGame.id) ? "var(--accent-2)" : "";
    },

    restart() {
      if (App.currentGame) App.openGame(App.currentGame.id);
    },

    // ---------- Toasts ----------
    toast(msg, type) {
      const area = $("#toast-area");
      if (!area) return;
      // Cap visible toasts to 3 so a burst of toasts (e.g. several achievements
      // unlocking at once plus weekly summary) can't overflow the toast area.
      // Remove oldest first.
      const existing = Array.from(area.querySelectorAll(".toast"));
      while (existing.length >= 3) {
        existing.shift().remove();
      }
      const el = document.createElement("div");
      el.className = "toast " + (type || "info");
      el.textContent = msg;
      area.appendChild(el);
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 2800);
    },

    // ---------- Modal ----------
    showModal(title, body, actions, opts) {
      const modal = $("#modal");
      modal.classList.toggle("modal-wide", !!(opts && opts.wide));
      $("#modal-title").textContent = title;
      $("#modal-body").innerHTML = body;
      const ac = $("#modal-actions");
      ac.innerHTML = "";
      (actions || [{label: "OK", primary: true, onClick: App.closeModal}]).forEach(a => {
        const btn = document.createElement("button");
        btn.className = "btn" + (a.primary ? " primary" : "");
        btn.textContent = a.label;
        btn.addEventListener("click", () => {
          if (a.onClick) a.onClick();
          App.closeModal();
        });
        ac.appendChild(btn);
      });
      $("#modal-backdrop").classList.add("open");
      // Scroll modal to top on open
      modal.scrollTop = 0;
      // Focus management: remember what was focused, move focus into the
      // dialog (first action button) so keyboard/AT users land inside it.
      App._lastFocused = document.activeElement;
      const firstBtn = modal.querySelector("#modal-actions .btn") || modal.querySelector("#modal-close");
      if (firstBtn) firstBtn.focus();
    },
    closeModal() {
      $("#modal-backdrop").classList.remove("open");
      $("#modal").classList.remove("modal-wide");
      // Return focus to whatever opened the modal (button, card, etc.)
      if (App._lastFocused && document.contains(App._lastFocused)) {
        try {
          App._lastFocused.focus();
        } catch (err) { /* detached node */
        }
      }
      App._lastFocused = null;
    },

    // ---------- Init ----------
    init() {
      // Theme/mode/sound
      App.applyTheme();
      App.applySound();
      // Sync the favorites-only toggle initial state (class + aria-pressed)
      const favOnlyBtn = $("#fav-only-btn");
      if (favOnlyBtn) {
        favOnlyBtn.classList.toggle("active", App.state.favOnly);
        favOnlyBtn.setAttribute("aria-pressed", App.state.favOnly ? "true" : "false");
      }
      // Auto-detect OS prefers-reduced-motion / prefers-contrast on first visit
      App._respectOsPreferences();
      $("#footer-count").textContent = GameRegistry.all().length;

      // Fixed topbar height sync — publish the real bar height to --topbar-h
      // so body padding always matches (theme fonts + a11y font scaling and
      // window resizes all change it). Runs before first paint of content.
      const topbar = document.querySelector(".topbar");
      if (topbar) {
        const syncTopbarH = () => {
          document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
        };
        syncTopbarH();
        if ("ResizeObserver" in window) {
          new ResizeObserver(syncTopbarH).observe(topbar);
        } else {
          window.addEventListener("resize", syncTopbarH);
        }
        // Re-measure once webfonts have loaded (metrics can shift)
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTopbarH);
      }

      // Buttons
      $("#brand").addEventListener("click", () => {
        App.closeGame();
      });
      $("#back-btn").addEventListener("click", () => {
        AudioFX.click();
        App.closeGame();
      });
      $("#game-restart-btn").addEventListener("click", () => {
        AudioFX.click();
        App.restart();
      });
      $("#game-help-btn").addEventListener("click", () => {
        AudioFX.click();
        if (App.currentGame && App.currentGame.help) App.currentGame.help();
      });
      $("#game-hint-btn").addEventListener("click", () => {
        AudioFX.click();
        if (App.currentGame && App.currentGame.hint) App.currentGame.hint();
      });
      $("#game-solve-btn").addEventListener("click", () => {
        AudioFX.click();
        if (App.currentGame && App.currentGame.solve) App.currentGame.solve();
      });
      $("#game-fav-btn").addEventListener("click", () => {
        if (!App.currentGame) return;
        const added = Storage.toggleFavorite(App.currentGame.id);
        AudioFX.pop();
        App.toast(added ? "Added to favorites" : "Removed from favorites", "info");
        App.updateGameFavBtn();
        App.renderGrid();
      });
      // Random game button — jump to a surprise
      const randBtn = $("#random-btn");
      if (randBtn) randBtn.addEventListener("click", () => {
        AudioFX.pop();
        const all = GameRegistry.all();
        if (!all.length) return;
        let pick = all[Math.floor(Math.random() * all.length)];
        if (App.currentGame && all.length > 1) {
          // avoid picking the game we're in
          let guard = 0;
          while (pick.id === App.currentGame.id && guard++ < 10) pick = all[Math.floor(Math.random() * all.length)];
        }
        App.openGame(pick.id);
      });
      // Share button — copy a generic result line to clipboard
      $("#game-share-btn").addEventListener("click", () => {
        AudioFX.click();
        if (!App.currentGame) return;
        const best = Storage.getBest(App.currentGame.id);
        const line = best !== null
          ? `Played ${App.currentGame.name} — best score: ${best}`
          : `Playing ${App.currentGame.name} on Pixel Arcade`;
        App.shareScore(line);
      });
      // Stats + achievements buttons in the topbar
      $("#stats-btn").addEventListener("click", () => {
        AudioFX.click();
        App.showStats();
      });
      $("#achv-btn").addEventListener("click", () => {
        AudioFX.click();
        App.showAchievements();
      });
      // Data export / import / reset (in the a11y panel)
      const expBtn = document.getElementById("data-export");
      if (expBtn) expBtn.addEventListener("click", () => App.exportData());
      const impBtn = document.getElementById("data-import");
      if (impBtn) impBtn.addEventListener("click", () => {
        const f = document.getElementById("data-import-file");
        if (f) f.click();
      });
      const impFile = document.getElementById("data-import-file");
      if (impFile) impFile.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) App.importData(e.target.files[0]);
        e.target.value = ""; // reset so same file can be re-imported
      });
      const dataResetBtn = document.getElementById("data-reset");
      if (dataResetBtn) dataResetBtn.addEventListener("click", () => {
        App.showModal("Erase all data?",
          "This will erase your favorites, scores, stats, achievements, recent plays, and hidden games. This cannot be undone.",
          [
            {
              label: "Cancel", onClick: () => {
              }
            },
            {
              label: "Erase everything", primary: true, onClick: () => {
                Storage.wipeAll();
                App.applyA11y();
                App.renderGrid();
                App.evaluateAchievements();
                AudioFX.lose();
                App.toast("All data erased", "info");
              }
            },
          ]);
      });
      $("#mode-btn").addEventListener("click", () => {
        App.toggleMode();
      });
      $("#sound-btn").addEventListener("click", () => {
        App.toggleSound();
      });

      // Theme menu
      $("#theme-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        $("#a11y-panel").classList.remove("open");
        $("#theme-panel").classList.toggle("open");
        AudioFX.click();
      });
      $$(".menu-chip").forEach(c => c.addEventListener("click", () => {
        App.setTheme(c.dataset.themeId);
        AudioFX.click();
        $("#theme-panel").classList.remove("open");
        App.toast("Theme: " + c.textContent, "info");
      }));
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".menu")) $("#theme-panel").classList.remove("open");
        if (!e.target.closest("#a11y-btn") && !e.target.closest("#a11y-panel")) $("#a11y-panel").classList.remove("open");
      });

      // Accessibility panel
      $("#a11y-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        $("#a11y-panel").classList.toggle("open");
        $("#theme-panel").classList.remove("open");
        AudioFX.click();
      });
      $$("[data-a11y]").forEach(btn => btn.addEventListener("click", () => {
        const a = Storage.getA11y();
        const action = btn.dataset.a11y;
        const STEPS = [80, 90, 100, 110, 120, 140, 160];
        if (action === "fontInc") {
          const cur = STEPS.includes(a.fontScale) ? a.fontScale : 100;
          const idx = Math.min(STEPS.indexOf(cur) + 1, STEPS.length - 1);
          a.fontScale = STEPS[idx];
        } else if (action === "fontDec") {
          const cur = STEPS.includes(a.fontScale) ? a.fontScale : 100;
          const idx = Math.max(STEPS.indexOf(cur) - 1, 0);
          a.fontScale = STEPS[idx];
        } else if (action === "fontReset") {
          a.fontScale = 100;
        }
        Storage.setA11y({fontScale: a.fontScale});
        App.applyA11y();
        AudioFX.click();
        App.toast("Font size: " + a.fontScale + "%", "info");
      }));
      $("#a11y-contrast").addEventListener("change", (e) => {
        Storage.setA11y({highContrast: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("High contrast: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-motion").addEventListener("change", (e) => {
        Storage.setA11y({reduceMotion: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("Reduce motion: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-dyslexia").addEventListener("change", (e) => {
        Storage.setA11y({dyslexiaFont: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("Dyslexia font: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-focus").addEventListener("change", (e) => {
        Storage.setA11y({largeFocus: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("Large focus rings: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-cb").addEventListener("change", (e) => {
        Storage.setA11y({colorBlind: e.target.value});
        App.applyA11y();
        AudioFX.click();
        App.toast("Color-blind mode: " + e.target.value, "info");
      });
      $("#a11y-reset-all").addEventListener("click", () => {
        Storage.setA11y({
          fontScale: 100, highContrast: false, reduceMotion: false,
          dyslexiaFont: false, colorBlind: "off", largeFocus: false,
        });
        App.applyA11y();
        AudioFX.click();
        App.toast("Accessibility settings reset", "info");
      });
      App.applyA11y();

      // Filters
      $$(".filter-chip[data-dim='category']").forEach(c => c.addEventListener("click", () => {
        AudioFX.click();
        $$(".filter-chip[data-dim='category']").forEach(x => x.classList.remove("active"));
        c.classList.add("active");
        App.state.filter = c.dataset.filter;
        App.renderGrid();
      }));
      // Debounced search input — re-rendering 150 cards on every keystroke is
      // wasteful, so we wait ~150ms after the last keypress before re-rendering.
      let searchTimer = null;
      $("#search").addEventListener("input", (e) => {
        App.state.search = e.target.value.toLowerCase();
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => App.renderGrid(), 150);
      });

      // "Clear" button on the Recently played rail.
      const recentClearBtn = document.getElementById("home-recent-clear");
      if (recentClearBtn) recentClearBtn.addEventListener("click", () => {
        AudioFX.click();
        Storage.clearRecent();
        App.renderGrid();
        App.toast("Recently played cleared", "info");
      });

      // Advanced multi-dimensional filters
      ["age-filter", "diff-filter", "dur-filter", "players-filter"].forEach(sel => {
        const el = document.getElementById(sel);
        if (!el) return;
        el.addEventListener("change", () => {
          AudioFX.click();
          if (sel === "age-filter") App.state.ageFilter = el.value;
          else if (sel === "diff-filter") App.state.diffFilter = el.value;
          else if (sel === "dur-filter") App.state.durFilter = el.value;
          else if (sel === "players-filter") App.state.playersFilter = el.value;
          App.renderGrid();
        });
      });
      // Reset all filters
      const resetBtn = document.getElementById("filters-reset");
      if (resetBtn) resetBtn.addEventListener("click", () => {
        AudioFX.click();
        App.state.filter = "all";
        App.state.ageFilter = "all";
        App.state.diffFilter = "all";
        App.state.durFilter = "all";
        App.state.playersFilter = "all";
        App.state.search = "";
        App.state.sort = "default";
        App.state.favOnly = false;
        const favBtn = $("#fav-only-btn");
        favBtn.classList.remove("active");
        favBtn.setAttribute("aria-pressed", "false");
        favBtn.title = "Show favorites only";
        const searchEl = $("#search");
        if (searchEl) searchEl.value = "";
        const clearBtn = document.getElementById("search-clear");
        if (clearBtn) clearBtn.classList.remove("visible");
        const sortEl = document.getElementById("sort-select");
        if (sortEl) sortEl.value = "default";
        $$(".filter-chip[data-dim='category']").forEach(x => x.classList.remove("active"));
        const allChip = document.querySelector('.filter-chip[data-filter="all"]');
        if (allChip) allChip.classList.add("active");
        ["age-filter", "diff-filter", "dur-filter", "players-filter"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "all";
        });
        App.renderGrid();
        App.toast("Filters reset", "info");
      });

      // Favorites-only toggle
      $("#fav-only-btn").addEventListener("click", () => {
        AudioFX.click();
        App.state.favOnly = !App.state.favOnly;
        const btn = $("#fav-only-btn");
        btn.classList.toggle("active", App.state.favOnly);
        btn.setAttribute("aria-pressed", App.state.favOnly ? "true" : "false");
        btn.title = App.state.favOnly ? "Show all games" : "Show favorites only";
        App.renderGrid();
        App.toast(App.state.favOnly ? "Showing favorites only" : "Showing all games", "info");
      });

      // Modal backdrop click closes
      $("#modal-backdrop").addEventListener("click", (e) => {
        if (e.target === $("#modal-backdrop")) App.closeModal();
      });
      // Modal close (×) button — easier to reach than the backdrop on touch devices
      const modalCloseBtn = document.getElementById("modal-close");
      if (modalCloseBtn) modalCloseBtn.addEventListener("click", () => {
        AudioFX.click();
        App.closeModal();
      });

      // Esc closes game / modal
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if ($("#modal-backdrop").classList.contains("open")) App.closeModal();
          else if ($("#game-view").classList.contains("active")) App.closeGame();
        }
        // Tab focus trap while a modal is open (keeps keyboard focus
        // inside the dialog — standard WAI-ARIA modal behavior)
        if (e.key === "Tab" && $("#modal-backdrop").classList.contains("open")) {
          const modal = $("#modal");
          const focusables = Array.from(modal.querySelectorAll(
            "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])"
          )).filter(el => el.offsetParent !== null);
          if (focusables.length) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
              e.preventDefault();
              first.focus();
            }
          }
        }
        // ? opens keyboard shortcut help
        if (e.key === "?" && !$("#game-view").classList.contains("active") && !$("#modal-backdrop").classList.contains("open")) {
          const tag = (e.target && e.target.tagName) || "";
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            App._showShortcutHelp();
          }
        }
        // / focuses the search box (when not in a game)
        if (e.key === "/" && !$("#game-view").classList.contains("active") && !$("#modal-backdrop").classList.contains("open")) {
          const tag = (e.target && e.target.tagName) || "";
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            const search = document.getElementById("search");
            if (search) search.focus();
          }
        }
      });

      // Prevent browser shortcuts (quick-find "/", "'", Ctrl+K search, etc.)
      // from interfering with game keyboard input. When a game view is active
      // AND focus is NOT inside an input/textarea/contenteditable, swallow
      // keys that games commonly consume: a-z, 0-9, arrows, space, Enter,
      // Backspace, /, ', and -. We preserve Ctrl/Cmd/Meta+anything, F-keys,
      // Tab, and Escape so browser-level shortcuts still work.
      document.addEventListener("keydown", (e) => {
        if (!$("#game-view").classList.contains("active")) return;
        const t = e.target;
        const tag = (t && t.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;            // allow Ctrl+T, Cmd+W, etc.
        if (e.key && e.key.length > 1 && e.key !== "Enter" && e.key !== "Backspace" && e.key !== " ") return;
        // Block keys that would otherwise trigger browser quick-find / search.
        // Games that don't consume these just ignore them; games that do (Wordle,
        // Hangman, 2048, Snake, Sudoku, etc.) call their own preventDefault too.
        if (/^[a-zA-Z0-9]$/.test(e.key) || ["Enter", "Backspace", " ", "/", "'", "-", "+", "=", "."].includes(e.key) || e.key.startsWith("Arrow")) {
          e.preventDefault();
        }
      }, true); // capture phase so we run BEFORE the game's own listener

      // Keyboard navigation in the game grid (only when home view is visible
      // and focus is not inside an input/select).
      document.addEventListener("keydown", (e) => {
        if ($("#game-view").classList.contains("active")) return;
        if ($("#modal-backdrop").classList.contains("open")) return;
        const tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) return;
        const cards = Array.from(document.querySelectorAll("#game-grid .card"));
        if (!cards.length) return;
        e.preventDefault();
        const focused = document.activeElement;
        const idx = cards.indexOf(focused);
        let next = idx;
        const cols = Math.max(1, Math.floor(document.querySelector("#game-grid").clientWidth / 240));
        if (e.key === "ArrowRight") next = idx < 0 ? 0 : (idx + 1) % cards.length;
        else if (e.key === "ArrowLeft") next = idx < 0 ? 0 : (idx - 1 + cards.length) % cards.length;
        else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + cols) % cards.length;
        else if (e.key === "ArrowUp") next = idx < 0 ? 0 : (idx - cols + cards.length) % cards.length;
        else if (e.key === "Enter") {
          if (idx >= 0) cards[idx].click();
          return;
        } else if (e.key === "f" || e.key === "F") {
          if (idx >= 0) {
            const card = cards[idx];
            const id = card.dataset.id;
            if (id) {
              const added = Storage.toggleFavorite(id);
              AudioFX.pop();
              App.toast(added ? "★ Favorited" : "☆ Unfavorited", "info");
              App.renderGrid();
              // Re-focus the same card after re-render
              setTimeout(() => {
                const c = document.querySelector(`.card[data-id="${id}"]`);
                if (c) c.focus();
              }, 50);
            }
          }
          return;
        }
        cards[next].focus();
      });

      // PWA install prompt
      App._setupInstallPrompt();
      // Offline indicator
      App._setupOfflineIndicator();
      // Back-to-top button
      App._setupBackToTop();
      // Hero greeting (time-of-day)
      App._renderGreeting();
      // Search clear button
      App._setupSearchClear();
      // Sort dropdown
      const sortSel = document.getElementById("sort-select");
      if (sortSel) sortSel.addEventListener("change", () => {
        App.state.sort = sortSel.value;
        localStorage.setItem("gamehub:sort", sortSel.value);
        AudioFX.click();
        App.renderGrid();
      });

      // Routing
      window.addEventListener("hashchange", App.route);

      // First visit
      Storage.incVisits();

      // Evaluate achievements on load (in case conditions changed while away)
      App.evaluateAchievements();
      // Weekly summary toast (first visit this week)
      App._checkWeeklySummary();

      // Restore sort preference from localStorage
      const savedSort = localStorage.getItem("gamehub:sort");
      if (savedSort) {
        App.state.sort = savedSort;
        const sortEl = document.getElementById("sort-select");
        if (sortEl) sortEl.value = savedSort;
      }

      App.renderGrid();
      App.route();
    },

    // Detect OS prefers-reduced-motion / prefers-contrast on first visit
    // and auto-enable the matching a11y setting. Only runs once (when the
    // a11y settings still have their default values).
    _respectOsPreferences() {
      try {
        const a = Storage.getA11y();
        const seen = localStorage.getItem("gamehub:os-pref-seen");
        if (seen) return; // only auto-detect on first visit
        localStorage.setItem("gamehub:os-pref-seen", "1");
        const updates = {};
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          updates.reduceMotion = true;
        }
        if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) {
          updates.highContrast = true;
        }
        if (Object.keys(updates).length) {
          Storage.setA11y(updates);
          App.applyA11y();
          const labels = [];
          if (updates.reduceMotion) labels.push("reduce motion");
          if (updates.highContrast) labels.push("high contrast");
          App.toast("Auto-enabled: " + labels.join(" + ") + " (from OS settings)", "info");
        }
      } catch (e) { /* ignore */
      }
    },

    // Hook for future lazy-loading of game scripts on hover. For now the
    // scripts are all loaded upfront via <script> tags, so this is a no-op.
    _preloadHint(id) {
      // Warm the cache for a declared (not yet loaded) game on hover.
      if (window.GameRegistry && GameRegistry.isLazy && GameRegistry.isLazy(id)) {
        GameRegistry.load(id).catch(() => {
        });
      }
    },

    // PWA install prompt — capture beforeinstallprompt, show our banner.
    _setupInstallPrompt() {
      const banner = document.getElementById("install-banner");
      if (!banner) return;
      let deferred = null;
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferred = e;
        if (!Storage.isInstallDismissed()) banner.style.display = "";
      });
      const accept = document.getElementById("install-accept");
      const dismiss = document.getElementById("install-dismiss");
      if (accept) accept.addEventListener("click", () => {
        banner.style.display = "none";
        if (deferred) {
          deferred.prompt();
          deferred.userChoice.then(() => {
            deferred = null;
          });
        }
      });
      if (dismiss) dismiss.addEventListener("click", () => {
        banner.style.display = "none";
        Storage.dismissInstall();
      });
      // Pre-cache all 300 game scripts for full offline play. Posts a message
      // to the service worker, which addAll()s the per-game URLs into the
      // active cache. Falls back to a no-op toast if the SW isn't ready.
      const cacheAllBtn = document.getElementById("install-cache-all");
      if (cacheAllBtn) cacheAllBtn.addEventListener("click", () => {
        AudioFX.click();
        const urls = GameRegistry.all().map(g => "js/games/" + g.id + ".js");
        let doneToast = false;
        const okToast = () => {
          if (!doneToast) {
            doneToast = true;
            App.toast("📦 Cached all games for offline play", "success");
          }
        };
        const failToast = () => {
          if (!doneToast) {
            doneToast = true;
            App.toast("Couldn't cache all games — try again later", "warning");
          }
        };
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          const mc = new MessageChannel();
          mc.port1.onmessage = (e) => {
            if (e.data && e.data.ok) okToast();
            else failToast();
          };
          navigator.serviceWorker.controller.postMessage({type: "CACHE_ALL_GAMES", urls: urls}, [mc.port2]);
          // Safety timeout — if the SW doesn't respond in 30s, show a warning.
          setTimeout(failToast, 30000);
        } else {
          // SW not active yet — re-register and retry once.
          if (navigator.serviceWorker) {
            navigator.serviceWorker.register("sw.js").then(() => {
              setTimeout(() => {
                if (navigator.serviceWorker.controller) {
                  const mc = new MessageChannel();
                  mc.port1.onmessage = (e) => {
                    (e.data && e.data.ok) ? okToast() : failToast();
                  };
                  navigator.serviceWorker.controller.postMessage({type: "CACHE_ALL_GAMES", urls: urls}, [mc.port2]);
                  setTimeout(failToast, 30000);
                } else {
                  failToast();
                }
              }, 800);
            }).catch(failToast);
          } else {
            failToast();
          }
        }
      });
      // If already installed (standalone), never show
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        banner.style.display = "none";
      }
    },

    // Offline indicator — show "Offline" badge when navigator.onLine is false.
    _setupOfflineIndicator() {
      const badge = document.getElementById("offline-badge");
      if (!badge) return;
      const update = () => {
        badge.style.display = navigator.onLine ? "none" : "";
      };
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
    },

    // Back-to-top button — appears when the user scrolls down.
    _setupBackToTop() {
      const btn = document.getElementById("back-to-top");
      if (!btn) return;
      const onScroll = () => {
        if (window.scrollY > 300) btn.classList.add("visible");
        else btn.classList.remove("visible");
      };
      window.addEventListener("scroll", onScroll, {passive: true});
      btn.addEventListener("click", () => {
        window.scrollTo({top: 0, behavior: "smooth"});
        AudioFX.click();
      });
      onScroll();
    },

    // Time-of-day greeting in the hero section. Includes the daily streak
    // (when active) and a small game-completion counter so the player can see
    // their catalogue progress every time they land on the home view.
    _renderGreeting() {
      const el = document.getElementById("hero-greeting");
      if (!el) return;
      const h = new Date().getHours();
      let greeting;
      if (h < 5) greeting = "Burning the midnight oil? 🌙";
      else if (h < 12) greeting = "Good morning! ☀️";
      else if (h < 17) greeting = "Good afternoon! 🌤️";
      else if (h < 21) greeting = "Good evening! 🌆";
      else greeting = "Good night! 🌙";
      const streak = Storage.getStreak();
      if (streak.current > 0) greeting += ` — ${streak.current}-day streak 🔥`;
      // Game completion counter — unique games played out of total registered.
      const stats = Storage.getStats();
      const total = GameRegistry.all().length;
      const played = Object.keys(stats.gamesPlayed || {})
        .filter(id => GameRegistry.get(id)).length;
      if (total > 0) greeting += ` — ${played}/${total} games explored`;
      el.textContent = greeting;
    },

    // Search clear button — visible when there's text, clears on click.
    _setupSearchClear() {
      const search = document.getElementById("search");
      const clear = document.getElementById("search-clear");
      if (!search || !clear) return;
      const update = () => {
        clear.classList.toggle("visible", !!search.value);
      };
      search.addEventListener("input", update);
      clear.addEventListener("click", () => {
        search.value = "";
        App.state.search = "";
        update();
        AudioFX.click();
        App.renderGrid();
        search.focus();
      });
      update();
    },

    // Keyboard shortcut help modal — opened with "?" key.
    _showShortcutHelp() {
      const body = `
        <div style="font-size:0.9rem; line-height:1.8;">
          <p><span class="kbd">←</span> <span class="kbd">→</span> <span class="kbd">↑</span> <span class="kbd">↓</span> — Move between game cards on the home grid</p>
          <p><span class="kbd">Enter</span> — Open the focused game card</p>
          <p><span class="kbd">F</span> — Toggle favorite on the focused card</p>
          <p><span class="kbd">Esc</span> — Close the current game or modal</p>
          <p><span class="kbd">?</span> — Show this help</p>
          <p><span class="kbd">/</span> — Focus the search box</p>
          <p style="margin-top:10px;color:var(--text-muted);font-size:0.82rem;">Inside games: each game uses its own keyboard shortcuts. The browser's quick-find is disabled while a game is active.</p>
        </div>
      `;
      App.showModal("Keyboard shortcuts", body);
    },

    // Text-to-speech for help text — uses the Web Speech API.
    speakHelp(text) {
      if (!window.speechSynthesis) {
        App.toast("Text-to-speech not supported in this browser", "info");
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
      App.toast("🔊 Reading aloud...", "info");
    },
  };

  global.App = App;
  document.addEventListener("DOMContentLoaded", () => {
    try {
      App.init();
    } catch (e) {
      console.error("Pixel Arcade failed to start:", e);
      // Render a minimal fallback so the user isn't staring at a blank page.
      try {
        document.body.insertAdjacentHTML("afterbegin",
          '<div style="padding:24px;text-align:center;font-family:sans-serif;">' +
          '<div style="font-size:2rem;margin-bottom:8px;">😵</div>' +
          '<div style="font-weight:600;margin-bottom:8px;">Pixel Arcade failed to start</div>' +
          '<div style="color:#64748b;margin-bottom:14px;">' + (e && e.message ? e.message : "Unknown error") + '</div>' +
          '<button onclick="location.reload()" style="padding:8px 16px;cursor:pointer;">Reload</button>' +
          '</div>');
      } catch (_) { /* if even the fallback fails, leave the console error */
      }
    }
  });
})(window);
