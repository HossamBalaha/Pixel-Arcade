/* Lyrics Quiz — guess the song from a famous lyric snippet. */
(function () {
  const QUESTIONS = [
    {
      lyric: "Is this the real life? Is this just fantasy?",
      opts: ["Bohemian Rhapsody", "Don't Stop Me Now", "We Will Rock You", "Somebody to Love"],
      a: 0
    },
    {
      lyric: "I will survive, oh, as long as I know how to love…",
      opts: ["I Will Survive", "Respect", "Stayin' Alive", "I'm Every Woman"],
      a: 0
    },
    {
      lyric: "Hello, darkness, my old friend…",
      opts: ["Bridge Over Troubled Water", "The Sound of Silence", "Mrs. Robinson", "Scarborough Fair"],
      a: 1
    },
    {
      lyric: "Hey, I just met you, and this is crazy…",
      opts: ["Call Me Maybe", "Blank Space", "We Are Never Getting Back Together", "Roar"],
      a: 0
    },
    {
      lyric: "We don't need no education…",
      opts: ["Money", "Another Brick in the Wall", "Time", "Comfortably Numb"],
      a: 1
    },
    {
      lyric: "I'm a survivor, I'm gonna make it…",
      opts: ["Independent Women", "Survivor", "Bootylicious", "Say My Name"],
      a: 1
    },
    {
      lyric: "Is you is or is you ain't my baby?",
      opts: ["My Baby Just Cares for Me", "Ain't No Sunshine", "What a Wonderful World", "Blueberry Hill"],
      a: 0
    },
    {
      lyric: "Sweet dreams are made of this…",
      opts: ["Here Comes the Rain Again", "Sweet Dreams", "Would I Lie to You", "Missionary Man"],
      a: 1
    },
    {lyric: "Billie Jean is not my lover…", opts: ["Thriller", "Beat It", "Billie Jean", "Bad"], a: 2},
    {
      lyric: "I want to hold your hand…",
      opts: ["Help!", "I Want to Hold Your Hand", "Love Me Do", "Twist and Shout"],
      a: 1
    },
    {
      lyric: "You're once, twice, three times a lady…",
      opts: ["Three Times a Lady", "Easy", "Brick House", "Sail On"],
      a: 0
    },
    {
      lyric: "Don't stop believin', hold on to that feelin'…",
      opts: ["Open Arms", "Don't Stop Believin'", "Any Way You Want It", "Wheel in the Sky"],
      a: 1
    },
    {
      lyric: "I see a little silhouetto of a man…",
      opts: ["Bohemian Rhapsody", "Killer Queen", "Somebody to Love", "We Are the Champions"],
      a: 0
    },
    {
      lyric: "Hotel California… such a lovely place",
      opts: ["Take It Easy", "Hotel California", "Desperado", "Peaceful Easy Feeling"],
      a: 1
    },
    {lyric: "Stairway to heaven…", opts: ["Kashmir", "Whole Lotta Love", "Stairway to Heaven", "Black Dog"], a: 2},
    {lyric: "All you need is love…", opts: ["Let It Be", "Hey Jude", "All You Need Is Love", "Love Me Do"], a: 2},
    {
      lyric: "Smells like teen spirit…",
      opts: ["Come As You Are", "Smells Like Teen Spirit", "Lithium", "Heart-Shaped Box"],
      a: 1
    },
    {
      lyric: "We are the champions, my friend…",
      opts: ["We Will Rock You", "Bohemian Rhapsody", "We Are the Champions", "Don't Stop Me Now"],
      a: 2
    },
    {
      lyric: "I'm walking on sunshine…",
      opts: ["Walking on Sunshine", "Manic Monday", "Eternal Flame", "Hazy Shade of Winter"],
      a: 0
    },
    {
      lyric: "Rolling in the deep…",
      opts: ["Hello", "Someone Like You", "Rolling in the Deep", "Set Fire to the Rain"],
      a: 2
    },
    {lyric: "Imagine there's no heaven…", opts: ["Imagine", "Jealous Guy", "Woman", "Watching the Wheels"], a: 0},
    {lyric: "Hey Jude, don't make it bad…", opts: ["Let It Be", "Hey Jude", "Yesterday", "All You Need Is Love"], a: 1},
    {
      lyric: "I wanna dance with somebody…",
      opts: ["How Will I Know", "I Wanna Dance with Somebody", "Greatest Love of All", "Saving All My Love for You"],
      a: 1
    },
    {
      lyric: "Every breath you take, every move you make…",
      opts: ["Roxanne", "Every Breath You Take", "Message in a Bottle", "Don't Stand So Close to Me"],
      a: 1
    },
    {
      lyric: "Sweet Caroline, ba-ba-ba…",
      opts: ["Cracklin' Rosie", "Sweet Caroline", "Song Sung Blue", "Crunchy Granola Suite"],
      a: 1
    },
    {
      lyric: "Like a virgin, touched for the very first time…",
      opts: ["Material Girl", "Like a Virgin", "Into the Groove", "Crazy for You"],
      a: 1
    },
    {
      lyric: "Girls just want to have fun…",
      opts: ["Time After Time", "Girls Just Want to Have Fun", "True Colors", "She Bop"],
      a: 1
    },
    {
      lyric: "Total eclipse of the heart…",
      opts: ["It's a Heartache", "Total Eclipse of the Heart", "Holding Out for a Hero", "Lost in France"],
      a: 1
    },
    {
      lyric: "Ironic — don't you think?…",
      opts: ["You Oughta Know", "Ironic", "Hand in My Pocket", "Head Over Feet"],
      a: 1
    },
    {lyric: "Oops, I did it again…", opts: ["Baby One More Time", "Oops!… I Did It Again", "Sometimes", "Lucky"], a: 1},
    {
      lyric: "Hit me baby one more time…",
      opts: ["Sometimes", "Born to Make You Happy", "Baby One More Time", "Crazy"],
      a: 2
    },
    {
      lyric: "Wannabe — if you wanna be my lover…",
      opts: ["Spice Up Your Life", "Wannabe", "Say You'll Be There", "2 Become 1"],
      a: 1
    },
    {
      lyric: "Livin' on a prayer…",
      opts: ["You Give Love a Bad Name", "Livin' on a Prayer", "Bad Medicine", "It's My Life"],
      a: 1
    },
    {lyric: "Sweet home Alabama…", opts: ["Free Bird", "Sweet Home Alabama", "Simple Man", "Gimme Three Steps"], a: 1},
    {lyric: "Back in black, I hit the sack…", opts: ["Highway to Hell", "Back in Black", "TNT", "Hells Bells"], a: 1},
    {
      lyric: "Another one bites the dust…",
      opts: ["Bohemian Rhapsody", "We Will Rock You", "Another One Bites the Dust", "Somebody to Love"],
      a: 2
    },
    {
      lyric: "I want to break free…",
      opts: ["Radio Ga Ga", "I Want to Break Free", "One Vision", "Hammer to Fall"],
      a: 1
    },
    {
      lyric: "Wonderwall — today is gonna be the day…",
      opts: ["Don't Look Back in Anger", "Wonderwall", "Champagne Supernova", "Live Forever"],
      a: 1
    },
    {
      lyric: "Creep — I wish I was special…",
      opts: ["Karma Police", "Creep", "No Surprises", "Fake Plastic Trees"],
      a: 1
    },
    {
      lyric: "Smells like teen spirit…",
      opts: ["Come As You Are", "Smells Like Teen Spirit", "Lithium", "Heart-Shaped Box"],
      a: 1
    },
    {lyric: "Blackbird singing in the dead of night…", opts: ["Blackbird", "Hey Jude", "Yesterday", "Let It Be"], a: 0},
    {
      lyric: "Hallelujah — I heard there was a secret chord…",
      opts: ["Suzanne", "Hallelujah", "Famous Blue Raincoat", "Bird on a Wire"],
      a: 1
    },
    {
      lyric: "Yellow submarine…",
      opts: ["Eleanor Rigby", "Yellow Submarine", "Penny Lane", "All You Need Is Love"],
      a: 1
    },
    {
      lyric: "Penny Lane — there is a barber showing photographs…",
      opts: ["Strawberry Fields Forever", "Penny Lane", "Hello Goodbye", "All You Need Is Love"],
      a: 1
    },
    {
      lyric: "California Dreamin'…",
      opts: ["Monday Monday", "California Dreamin'", "Dedicated to the One I Love", "Words of Love"],
      a: 1
    },
    {
      lyric: "Mr. Tambourine Man, play a song for me…",
      opts: ["Blowin' in the Wind", "Mr. Tambourine Man", "The Times They Are A-Changin'", "Like a Rolling Stone"],
      a: 1
    },
    {
      lyric: "Blowin' in the wind…",
      opts: ["Blowin' in the Wind", "The Times They Are A-Changin'", "Mr. Tambourine Man", "Don't Think Twice"],
      a: 0
    },
    {
      lyric: "I heard it through the grapevine…",
      opts: ["What's Going On", "I Heard It Through the Grapevine", "Ain't No Mountain High Enough", "Sexual Healing"],
      a: 1
    },
    {
      lyric: "Respect — R-E-S-P-E-C-T…",
      opts: ["Respect", "(You Make Me Feel Like) A Natural Woman", "Chain of Fools", "Think"],
      a: 0
    },
    {
      lyric: "Stand by me — when the night has come…",
      opts: ["Spanish Harlem", "Stand by Me", "There Goes My Baby", "Save the Last Dance for Me"],
      a: 1
    },
    {
      lyric: "Great balls of fire…",
      opts: ["Whole Lotta Shakin' Goin' On", "Great Balls of Fire", "Breathless", "High School Confidential"],
      a: 1
    },
    {
      lyric: "When a man loves a woman…",
      opts: ["When a Man Loves a Woman", "Try a Little Tenderness", "These Arms of Mine", "I've Been Loving You Too Long"],
      a: 0
    },
    {
      lyric: "On the road again…",
      opts: ["Always on My Mind", "On the Road Again", "Blue Eyes Crying in the Rain", "Mammas Don't Let Your Babies Grow Up to Be Cowboys"],
      a: 1
    },
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "lyricsquiz",
    name: "Lyrics Quiz",
    icon: "🎵",
    category: "quiz",
    description: "Guess the song from a famous lyric snippet",
    tags: ["quiz", "music", "trivia"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="lq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="lq-s">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lq-b">—</div></div>
        </div>
        <div class="status info" id="lq-status">Pick the song that contains this lyric.</div>
        <div id="lq-lyric" style="text-align:center;font-size:1.2rem;font-weight:600;font-style:italic;margin:24px 0;padding:18px;background:var(--bg-soft);border-radius:var(--radius);"></div>
        <div id="lq-options" class="col" style="gap:8px;max-width:440px;margin:0 auto;"></div>
        <p class="hint">${PER} lyrics per round. Each correct = 10 pts.</p>
      `;
      const statusEl = root.querySelector("#lq-status");
      const lyricEl = root.querySelector("#lq-lyric");
      const optsEl = root.querySelector("#lq-options");
      root.querySelector("#lq-b").textContent = Storage.getBest("lyricsquiz") || "—";

      function render() {
        if (idx >= qs.length) return finish();
        const cur = qs[idx];
        lyricEl.textContent = `"${cur.lyric}"`;
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#lq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#lq-s").textContent = score;
      }

      function answer(i, btn) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        if (i === cur.a) {
          btn.style.background = "var(--success)";
          btn.style.color = "#fff";
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          btn.style.background = "var(--danger)";
          btn.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((b, j) => {
            if (j === cur.a) {
              b.style.background = "var(--success)";
              b.style.color = "#fff";
            }
          });
          statusEl.textContent = `✗ Song: "${cur.opts[cur.a]}"`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1300);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}`;
        statusEl.className = "status win";
        lyricEl.textContent = "🎵";
        optsEl.innerHTML = "";
        const best = Storage.getBest("lyricsquiz");
        if (!best || score > best) {
          Storage.setBest("lyricsquiz", score);
          root.querySelector("#lq-b").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const replayBtn = document.createElement("button");
        replayBtn.className = "btn primary";
        replayBtn.textContent = "Play again";
        replayBtn.addEventListener("click", () => newRound());
        optsEl.appendChild(replayBtn);
      }

      function newRound() {
        qs = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#lq-b").textContent = Storage.getBest("lyricsquiz") || "—";
        statusEl.textContent = "Pick the song that contains this lyric.";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Lyrics Quiz",
        `Each round shows a snippet of famous song lyrics. Pick the matching song title from the multiple-choice options.
        <br><br>${PER} questions per round. Each correct = <b>10 points</b>.`);
    },
  });
})();
