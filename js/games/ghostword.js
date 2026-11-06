/* Ghost Word — players alternate adding letters to a growing fragment. Completing a word (≥4 letters) loses. */
(function () {
  // Compact dictionary of common 4-8 letter words used to validate completions and AI moves.
  const DICT = new Set(("able acid ache acne aces acne aide aids aims airs ajar akin alas alms also amid ammo amok ample area arid arms army arts atom atoll audio auto aura away axes axis babe baby back bade bags bait bake bald bale ball band bane bang bank bare bark barn base bash bask bass bath bats beach bead beak beam bean bear beat beau beck beds beef been beer bees beet bell belt bend bent best beta bias bide bids bike bile bilk bill bind bins bird bite bits blab blah blat bled blew blip blob bloc blot blue blur boar boat body bogs boil bold bole boll bolt bomb bond bone bong bony book boom boon boot bops bore born boss both bowl bows boys brag bran bras bray bred brew bric brig brim brio brow buck buds buff bugs bulb bulk bull bump buns buoy burb burl burn burp burr bush bust busy butt buys buzz cabs cage cake calf call calm came camp cane cans cape caps card care cars cart case cash cask cast cats cave cede cell cent chap char chat chef chew chic chin chip chit chop chub chug chum cite city clad clam clan clap claw clay clip clop clod clog clot club clue coal coat coax cobs cock coda code cods coed cogs coil coin coke cola cold cole colt coma comb come cone cons conk cook cool coon coop coot cope cops copy cord core cork corn cost cots cove cowl cows coys crab cram crap craw crew crib crop crow crud crux cube cubs cued cues cuff cult cups curb curd cure curl curs curt cusp cuss cute cuts cyst dabs daft dale dame damn damp dams dare dark darn dart dash data date daub dawn days dead deaf deal dean dear debt deck deed deem deep deer dees deft defy deli dell dent deny desk dial dice died dies diet digs dill dime dine ding dint dips dire dirt disc dish disk diva dive docs doff dogs doll dome done dons doom door dope dose dote dots dove down doze drab drag dram draw dray dregs drip drop drug drum dual dub duchy duck duct duel dues duet duff duke dull duly dumb dump dune dung dunk dusk dust duty dyed dyes each earl earn ears ease east easy eats ebbs echo edge eddy edit eels eggs egos eked ekes elbow elder elf elk elm else emir emit ends envied epic eras ergo err errs etch even ever eves evil exam exit eyed eyes face fact fade fads fail fair fake fall fame fans fare farm fast fate fawn faze fear feat feed feel fees feet fell felt fend fern fess feud fiat fibs figs file fill film find fine fink fins fire firm fish fist five fizz flag flak flap flat flaw flax flea fled flee flew flex flip flit flop flow flue flux foal foam foes fold folk fond font food fool foot fops ford fore fork form fort foul four fowl foxy frag fray free fret frog from fuel full fume fund funk furl fuse fuss fuzzy gabs gaff gage gags gain gait gala gale gall gals game gang gaps gape gasp gate gave gawk gawk gaze gear geek gels gems gene gent germ gets gibs gibe gift gigs gild gill gilt gimp gins girl girt gist give glad glee glen glib glob glop glow glue glum glut gnat gnaw goad goal goat gobs gods goes gold golf gone gong good goof gore gory gosh gout gown grab gram gray greg grew grey grid grim grin grip grit grog grow grub guff gulf gull gulp gums gunk guns gush gust guts guys gyms gyps habit hack haft hags hail hair hake hale half hall halo halt hams hand hang hank hard hare hark harm harp hash hasp hast hate hats haul have hawk haze hazy head heal heap hear heat heck heed heel heft heirs held hell helm help hemp hems hens herb herd here hero hers hewn hick hide high hike hill hilt hind hint hips hire hiss hits hive hoax hobs hock hods hoed hoer hoes hogs hoist hold hole holly home hone honk hood hoof hook hoop hoot hope hops horn hose host hour howl hubs huff huge hugs hula hulk hull hump hums hung hunk hunt hurl hurt hush husk hymn hype ibex ibis iced ices icky icon idea ides idle idly idol iffy ilks ills imps inch info inks inky into ions iota irks iron isle itch item jabs jack jade jail jamb jams jape jars javelin jaws jays jazz jeep jeer jell jest jets jibe jibs jiff jigs jilt jinx jive jobs jock jogs john join joke jolt joss jots jowl joys judo jugs jump junk jury just jute juts kale keel keen keep kegs kelp kept keys kick kids kill kiln kilo kilt kind king kink kins kiss kite kits kiwi knap knee knew knit knob knot know koan kohl labs lace lack lads lady laid lain lair lake lamb lame lamp land lane laps lard lark lash last late lath laud lava lawn laws lays laze lazy lead leaf leak lean leap leek leer left legs lend lens lent less lest lets levy lewd liar lice lick lids lied lien lieu life lift like lily limb lime limn limp line link lint lion lips lira lire lisp list live load loaf loam loan lobe lobs lock loft logo logs loin loll lone long look loom loon loop loot lope lops lord lore lose loss lost lots loud love lows luck lump lung lure lurk lush lust lute lynx lyre mace made mage maid mail maim main make male mall malt mama mane mans many maps mare mark marl mars mart mash mask mass mast mate math mats matt maul maws maze mead meal mean meat meed meek meet meld melt memo mend menu meow mesa mesh meta mete mews mica mice mike mild mile milk mill mils mime mind mine mini mink mins mint minx mire miry miss mist mite mitt moan moat mobs mock mode mods mojo mold mole moll molt mome moms monk mono mood moon moor moos moot mope more morn moss most mote moth motor mount mouse move much muck muff mugs mule mull mums munch mural muse mush musk muss must mute myth nabs naff nags name nape naps narc nary nave navy nays neap near neat neck need nerd nest nets news newt next nibs nice nick nigh nine nips nits node nods noel noes none nook noon nope norm nose nosh note noun nous nova nubs nude nuke null numb nuns nuts oafs oaks oars oast oath oats obey oboe odds odes odor offs ogle ogres ohms oils oily oink okay okra olds olive omit once ones only onto onyx oohs oops opal open opts opus oral orcs ores orgy oust outs oval oven over owed owes owls owns oxen pace pack pact pads page paid pail pain pair pale pall palm pals pane pang pans pant papa pare park pars part pass past pate path pats pave paws pawn pays peak peal pear peas peck peed peek peel peep peer pegs pelt pen pens pent peon perk perm pert pest pets pews pica pick pied pier pies pigs pike pile pill pimp pine ping pink pins pint pipe pita pity plan plat play plea plod plop plot plow plug plum plus pock pods poem poet pogo pogs poke pole poll polo pomp pond pone pony pooh pool poor pope pops pore pork porn port pose posh post posy pots pour pout pram prat pray prep prey prig prim prod prom prop pros prow pubs puck puff pugs puke pull pulp pump puns punt puny pups pure purl purr push puss putt pyre quad quay quid quip quit quiz race rack racy rads rage rags raid rail rain rake ramp rams rang rank rant rape raps rare rash rasp rate rats rave rays raze read real ream reap rear redo reds reed reef reek reel rein rely rend rent reps rest revs ribo ribs rice rich rick ride rids riff rife rift rigs rile rill rime rims rind ring rink rinse riot ripe rips rise risk rite rive road roam roar robe robs rock rode rods roes roil role roll romp roof rook room root rope rose rosy rote roti rots roue rout rove rows rubs ruby rude rued rues ruff rugs ruin rule rump rums rune rung runs runt ruse rush rust ruts ryes sable sack sacs safe saga sage said sail sale salt same sand sane sang sank sans saps sash sass sate save sawn saws says scab scad scag scam scan scar scat scot scow scud scum seal seam sear seas seat sect seed seek seem seen seep seer sees self sell semi send sent sept serf sets sewn sews sexy shag shah sham shed shes shew shim shin ship shod shoe shoo shop shot show shun shus shut sick side sift sigh sign silk sill silo silt simp sims sing sinh sink sins sips sire sirs site sits size skim skin skip skis skit slab slag slam slap slat slaw slay sled slew slid slim slip slit slob sloe slog slop slot slow slug slum slur smog smug smut snag snap sned snip snit snob snot snow snub snug soak soap soar sobs sock soda sofa soft soil sold sole solo sols some sons song soon soot sops sore sort sots souk soul soup sour sown sows soya spam span spar spas spat spec sped spin spit spot spry spud spun spur stab stag star stat stay stem step stew stir stop stub stud stun subs such suck suds sued sues suit sulk sumo sump sums sung sunk suns sups sure surf swab swag swam swan swap swat swig swim swum tabs tack taco tact tads tail take talc tale talk tall tame tamp tams tang tank tans tape taps tare tarn taro tars tart task taut taxi teak teal team tear tease teat teed teem teen tees tell temp tend tens tent term test text than that thaw them then thew they thin this thong thorn those thou thro thud thug thus tick tide tidy tied tier ties tiff tike tile till tilt time tine ting tins tint tiny tips tire toad tobs toed toes tofu togs toil told toll toms tone tong tons took tool toot tops tore torn tort toss tote tots tour tout town tows toys tram trap tray tree trek trim trio trip trod trot troy true tubs tuck tuft tugs tums tuna tune turd turf turn tush tusks twas tweak tweed tween tweet twice twig twin twit type typo tyro ugly ulna umps undo undue unit units unto upon urea urge urns used user uses ushers using utopia utter vague vain vale vamp vane vans vary vase vast vats veal veer veil vein vend vent verb very vest veto vets vial vibe vice vied vies view vile vine vino viol visa vise vita void vole volt vote vows vows wads wade wads waft wage wags waif wail wain wait wake wale walk wall wand wane wang want ward ware warm warn warp wars wart wary wash wasp watt wave wavy waxy ways weak weal wean wear weds weed week weep weft weir well welt wend went wept were west wets what when whet whey whig whim whip whir whit whiz whoa whom whop whys wick wide wife wigs wild wile will wilt wily wimp wind wine wing wink wins winy wipe wire wiry wise wish wisp with wits woke woks wolf womb wonk wont wood woof wool woos word wore work worm worn wove wows wrap writ yack yams yang yank yaps yard yare yarn yawl yawn yaws yeah year yeas yegg yells yelp yens yeti yews yield yips yock yoga yogi yoke yolk yore your yowl yuan yuck yule yups zags zany zaps zeal zeds zees zero zest zeta zinc zing zings zips zits zone zoom zoos").split(/\s+/).filter(w => w.length >= 4));

  // Check if a fragment is a prefix of any word in the dictionary
  function isPrefix(frag) {
    const f = frag.toLowerCase();
    for (const w of DICT) {
      if (w.startsWith(f)) return true;
      if (w.length < f.length && f.startsWith(w)) return false; // frag already completed a word
    }
    return false;
  }

  // Check if the fragment is exactly a complete word (≥4 letters)
  function isWord(frag) {
    return frag.length >= 4 && DICT.has(frag.toLowerCase());
  }

  // All valid completions of a fragment (used by AI)
  function completions(frag) {
    const f = frag.toLowerCase();
    const list = [];
    for (const w of DICT) {
      if (w.startsWith(f) && w.length >= 4) list.push(w);
    }
    return list;
  }

  let live = null;
  GameRegistry.register({
    id: "ghostword",
    name: "Ghost Word",
    icon: "👻",
    category: "word",
    description: "Add letters without completing a word — vs AI",
    tags: ["word", "thinking", "ai"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let fragment = "", turn = "P", over = false, winner = null;
      let aiTimer = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Length</div><div class="val" id="gw-len">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="gw-turn">You</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="gw-wins">0</div></div>
        </div>
        <div class="status info" id="gw-status">Add a letter to the fragment. Don't complete a word (≥4 letters)!</div>
        <div id="gw-fragment" style="text-align:center;font-family:var(--font-mono);font-size:2.2rem;letter-spacing:0.3em;font-weight:700;margin:20px 0;min-height:1.5em;"></div>
        <div id="gw-keyboard" class="gw-keyboard"></div>
        <p class="hint">Players take turns adding a letter to the growing fragment. The player who <b>completes a valid word</b> (≥4 letters) <b>loses</b>. You can also "challenge" if you think no valid word can be formed.</p>
        <div class="row" style="justify-content:center;gap:8px;margin-top:14px;">
          <button class="btn" id="gw-challenge" title="Challenge that no word can be formed">Challenge</button>
          <button class="btn" id="gw-restart">New game</button>
        </div>
      `;
      const statusEl = root.querySelector("#gw-status");
      const fragEl = root.querySelector("#gw-fragment");
      const kbEl = root.querySelector("#gw-keyboard");
      let wins = 0;
      if (!document.getElementById("gw-style")) {
        const s = document.createElement("style");
        s.id = "gw-style";
        s.textContent = `
          .gw-keyboard { display: flex; flex-direction: column; gap: 6px; align-items: center; }
          .gw-keyboard .kb-row { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
        `;
        document.head.appendChild(s);
      }

      function renderFrag() {
        fragEl.innerHTML = fragment.split("").map((c, i) => `<span style="color:${i % 2 === 0 ? "var(--accent)" : "var(--accent-2)"}">${c}</span>`).join("") + '<span style="color:var(--text-muted);animation:pulse 1s infinite;">_</span>';
        root.querySelector("#gw-len").textContent = fragment.length;
        root.querySelector("#gw-turn").textContent = turn === "P" ? "You" : "AI";
      }

      function renderKb() {
        kbEl.innerHTML = "";
        const ROWS = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")];
        ROWS.forEach(line => {
          const row = document.createElement("div");
          row.className = "kb-row";
          line.forEach(letter => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.textContent = letter;
            btn.style.fontSize = "0.9rem";
            if (over || turn !== "P") btn.classList.add("disabled");
            btn.addEventListener("click", () => playLetter(letter));
            row.appendChild(btn);
          });
          kbEl.appendChild(row);
        });
      }

      function playLetter(L) {
        if (over || turn !== "P") return;
        fragment += L.toLowerCase();
        AudioFX.tick();
        renderFrag();
        if (isWord(fragment)) {
          over = true;
          winner = "AI";
          statusEl.textContent = `💀 You completed "${fragment.toUpperCase()}" — you lose!`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else if (!isPrefix(fragment)) {
          // No valid continuation — current player loses? Actually the player
          // who made the move that has no continuation WINS (since the next
          // player would have no valid move). Simplify: current player loses.
          over = true;
          winner = "AI";
          statusEl.textContent = `No word starts with "${fragment.toUpperCase()}" — you lose!`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          // Pass to AI
          turn = "A";
          renderKb();
          aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiMove();
          }, 800);
        }
      }

      function aiMove() {
        if (over) return;
        // Find all completions of current fragment
        const comps = completions(fragment);
        // Filter to even-length continuations (so AI completes on odd-length, meaning player completes)
        // Strategy: AI tries to find a continuation where it doesn't lose.
        // Simple: pick a letter that doesn't immediately complete a word.
        const validLetters = [];
        for (const L of "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toLowerCase()) {
          const newFrag = fragment + L;
          if (isWord(newFrag)) continue; // AI would lose
          if (!isPrefix(newFrag)) continue;
          // Prefer letters that keep at least one completion that ends on an odd total length
          // (so player would complete)
          validLetters.push(L);
        }
        if (!validLetters.length) {
          // AI has no safe move — AI loses
          over = true;
          winner = "P";
          statusEl.textContent = `🎉 AI has no safe move — you win!`;
          statusEl.className = "status win";
          AudioFX.win();
          wins++;
          root.querySelector("#gw-wins").textContent = wins;
          Storage.setBest("ghostword", wins);
          return;
        }
        // Pick a random valid letter (slightly smart)
        const L = validLetters[Math.floor(Math.random() * validLetters.length)];
        fragment += L;
        AudioFX.place();
        renderFrag();
        if (!isPrefix(fragment)) {
          over = true;
          winner = "P";
          statusEl.textContent = `🎉 AI played "${L.toUpperCase()}" but no word continues — you win!`;
          statusEl.className = "status win";
          AudioFX.win();
          wins++;
          root.querySelector("#gw-wins").textContent = wins;
          Storage.setBest("ghostword", wins);
        } else {
          turn = "P";
          renderKb();
        }
      }

      function challenge() {
        if (over || turn !== "P") return;
        // Player challenges that no valid word continues
        const comps = completions(fragment);
        if (!comps.length) {
          over = true;
          winner = "P";
          statusEl.textContent = `🎉 Challenge! No word continues — you win!`;
          statusEl.className = "status win";
          AudioFX.win();
          wins++;
          root.querySelector("#gw-wins").textContent = wins;
          Storage.setBest("ghostword", wins);
        } else {
          over = true;
          winner = "AI";
          const w = comps[0];
          statusEl.textContent = `💀 Wrong challenge — "${w.toUpperCase()}" continues. You lose!`;
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      }

      function onKey(e) {
        if (over || turn !== "P") return;
        if (/^[a-zA-Z]$/.test(e.key)) playLetter(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#gw-challenge").addEventListener("click", challenge);
      root.querySelector("#gw-restart").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      function newGame() {
        if (aiTimer) clearTimeout(aiTimer);
        fragment = "";
        turn = "P";
        over = false;
        winner = null;
        const best = Storage.getBest("ghostword");
        wins = best || 0;
        root.querySelector("#gw-wins").textContent = wins;
        statusEl.textContent = "Add a letter to the fragment. Don't complete a word (≥4 letters)!";
        statusEl.className = "status info";
        renderFrag();
        renderKb();
      }

      live = {
        solve: function () {
          if (over) return;
          const comps = completions(fragment);
          if (comps.length) App.showModal("Ghost — valid continuations", `Words that continue "${fragment.toUpperCase()}":<br><br>${comps.slice(0, 30).join(", ")}${comps.length > 30 ? "…" : ""}`);
          else App.toast("No valid continuations — challenge!", "info");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        if (aiTimer) clearTimeout(aiTimer);
        document.removeEventListener("keydown", onKey);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Ghost",
        `Players take turns adding <b>one letter</b> to a growing fragment. The fragment must always be the start of a real word (≥4 letters).
        <br><br>The player who <b>completes a valid word</b> (≥4 letters) <b>loses</b>.
        <br><br>If you think your opponent has played a letter that no real word can extend, hit <b>Challenge</b>. Right challenge = you win; wrong = you lose.
        <br><br>You play against the AI. Type letters on your keyboard or tap the on-screen keys.`);
    },
  });
})();
