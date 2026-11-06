/* Word Hunt — scrambled letters, find all dictionary words (3+ letters) in 90s. */
(function () {
  // small curated dictionary of common 3-7 letter words
  const DICT = ("ace act add age ago aid ail aim air ale all and ant any ape arc are arm art ash ask ate awe axe bad bag ban bar bat bay bed bee beg bet bib bid big bin bit boa bog boo bop bow box boy bra bro bud bug bun bus but buy bye cab can cap car cat caw cob cod cog cop cot cow cry cub cup cut dab dad dam day den dew did die dig dim din dip doe dog don dot dry dub due dug dye ear eat eel egg ego elf elk elm end era eve eye fad fan far fat fax fed fee few fib fig fin fir fit fix fly foe fog for fox fry fun fur gab gad gag gap gas gel gem get gin god got gum gun gut guy gym had hag ham has hat hay hem hen her hew hex hey hid him hip his hit hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion ire its ivy jab jag jam jar jaw jay jet jig job jog jot joy jug key kid kin kit lab lad lag lap law lay led leg let lid lie lip lit lob log lop lot low mad man map mar mat may men met mid mix mob mom mop mow mud mug nab nag nap net new nil nip nod nor not now nub nun nut oak oar oat odd ode off oil old one orb ore our out owe owl own pad pal pan par pat paw pay pea pen pet pew pie pig pin pit ply pod pop pot pow pry pub pug pun pup pus put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rue rug rum run rut rye sad sag sap sat saw say sea see set sew shy sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sty sub sue sum sun tab tad tag tan tap tar tat tea ten the tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet via vim vow wad wag wan war was wax way web wed wee wet who why wig win wit woe wok won woo wow yak yam yap yea yen yes yet yip you yum zap zip zoo art arts axe axe ear ears east eats eel eels egg eggs era eras eve eves eye eyes far fare fat fate fee fees few fig figs fin fins fit fits fly foam fobs foe foes fog fogs fold food fool foot for form fort four fowl free from fuel full fund fun fur furs fuse gain game gang gap gape gas gate gave gear gene germ get give glad glow glue goal goat gold golf gone good gown grab gray grew grip grow gulf gust guts hair half hall hand hang hard hare hark harm harp has hat hate hats have hawk hay haze head heal heap hear heat hell help hem hen her here hero hers hide high hike hill hint hip hire his hit hold hole home hood hook hope horn hose host hot hour how hue huge hulk hull hum hunt hurt ice idea ides idle imps inch inks inns into ions iota ire irk iron isle item jabs jack jade jail jamb jams jars jays jazz jets jibe jibs jigs jobs jogs join joke jolt jots joys jugs jump junk jury just kegs keep kept keys kick kids kill kiln kilo kind king kiss kite kits knob knot know lab lace lack lacy laid lair lake lamb lame lamp land lane lank lap lard lark lash last late laud lawn laws lays laze lazy lead leaf leak lean leap led leer left leg legs lend lens lent less lets levy lewd lice lick lids lied lien lies life lift like lily limb lime limp line link lint lion lips list live load loaf loan lobe lock loft logs lone long look loon loop loot lord lore lose loss lost lots loud love lows lugs lull lump lung lure lush mail maim main make male mall malt mama man mane mans many maps mark mar mask mass mate math meal mean meat meet meld melt memo mend menu mere mesh mess met mews mica mike mild mile milk mill mine mini mink mint mire miss mist mite mitt moan moat mock mode mold mole molt monk moon moor moot more morn most mote moth move mown much muck mugs mule mull mums muse mush musk must mute myth name near neat neon nerd nest nets news next nice nips node none nook noon nope norm nose note noun null numb nuns oars oats odds odes odor offs oils okay olds only onto opal open opts oral orcs ores ours oust outs oven over owed owes owls own owns pace pack pact pads page paid pail pain pair pale palm pane park part pass past path pave pawn paws peal pear peas peat peck peed peek peel peep peer pegs pens pent perk pest pets pick pier pies pigs pile pill pine pink pint pipe pits plan play plea pled plot plow plug plum plus poem poet pole poll polo pomp pond pone pony pool poor pope port pose posh post pour pout pram pray prep prey prim prod prof prom prop puck puff pull pulp pump punk pure push quay quid quit race rack rage raid rail rain rake ramp rang rank rant rape rare raps rate rats rave raze real reap rear reed reef reek reel rely rent rest rice rich ride ring rink riot ripe rips rise risk rite road roam roar robe rock rode rods role roll romp roof rook room root rope rose rosy rote rots rove rude ruin rule rump runs runt ruse rush rusk rust sage sail sake sale salt same sand sane sang sank save scab scam scum seam sear seas seat seed seek seem seen seep seer self sell semi send sent sets sewn sext shad sham shed shes shim shin ship shod shoe shoo shop shot show shun shut sick side sift sigh sign silk sill silo silt sing sink sips sire sirs site sits size skim skin skip skis skit slab slag slam slat slay sled slid slim slip slit slob sloe slog slop slot slow slue slug slum slur smit smog smug snag snap snip snit snob snot snow snub snug soak soap soar sobs sock soda sofa soft soil sold sole solo some sone song soon soot sore sort soul soup sour sown spam span spar spat spec sped spew spin spit spot spry spud spun spur stab star stay stem step stew stir stop stow stub stud stun subs such suck sued sues suet suit sung sunk sure surf swab swag swam swan swap swat sway swig swim swum tabs tack tads tail take tale talk tall tame tamp tang tank tans tape taps tare tarn taro tarp tars tart task taut team tear teas teat tech teen tees tend tens tent term test text than that thaw thee them then they thin this thou thud thug thus tick tide tidy tied tier ties tile till tilt time tine tins tint tiny tip tips tire toad toes toil told tomb toms tone tony took tool toot tops torn toss tour tout town toys tram trap tray tree trek trim trip trod trot true tubs tuck tuff tugs tuns turd turf turn tush twig twin twit type typo unit upon urea urge urns used user uses vain vale vamp vane vary vase vast veal veer veil vein vend vent verb very vest veto vets vial vibe vice view vile vine vino viol visa vise viva void vole volt vote vows wade wads waft wage wail wain wait wake wale walk wall wand wane wang want ward ware warm warn warp wart wary wash wasp wave wavy waxy ways weak weal wean wear weds weed week weep weft well welt went wept were west what when whet whew whey whim whip whir whit whiz whop whom whup wick wide wife wild wile will wilt wily wimp wind wine wing wink wins wipe wire wiry wise wish wisp with wits wive woes woke woks wolf womb wonk wont wood woof wool woos word wore work worm worn wove wows wrap wren writ yaks yams yank yaps yard yare yarn yawl yawn yaws year yelp yens yeti yews yips yolk yoga yogi yoke yoks yore your yowl yule zaps zeds zeks zest zeta zinc zing zips zits zone zoos " +
    // ── Expanded dictionary: 560+ common 5-letter words. The original list
    //    only had 3- and 4-letter entries, so 5-letter submissions were
    //    always rejected. Combined with the case-sensitivity fix above,
    //    players can now actually score 4-pt (5-letter) words and beyond. ──
    "about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apple apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brass brave bread break breed brick brief bring broad brown brush build built buyer cable cabin cable candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence henry horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn scott sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer steve stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth terry texas thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra " +
    // extra common 3-letter words including GED (frequently missing from short lists)
    "ged aal aah aba abs ace act add ado ads adz age ago aid ail aim air ake ala alb ale all alp amp amy ana and ane ani ant any ape apo app apt arb arc are arf ark arm ars art ash ask asp ate aue aura aux ava awe awl axe aye ayu azo baa bad bae bag bah bam ban bap bar bat baw bay bed bee beg bel ben bet bib bid big bin bio bip bis bit biz boa bob bod bog boo bop bot bow box boy bra bro brr bub bud bug bum bun bur bus but buy bye bys cab cad can cap car cat caw cob cod cog con coo cop cot cow cox coy cry cub cue cup cut cud cwm dab dad dag dah dak dam day daze deb dec dee def del den dev dew dial din dip doe dog don dot dry dub due dug duo dye ear eat eau ebb eel egg ego eke elf elk elm emu end eng eon era ere erg err eve ewe eye fad fan far fat fax fed fee fen few fib fig fin fir fit fix flu fly foe fog foh fop for fox fry fub fud fug fun fur gab gag gal gap gas gay gel gem geo get gib gid gift gig gil gin god goo gor got gow gum gun gut guy gym had hag ham has hat haw hay hed heh hem hen her hew hex hey hic hid him hip his hit hob hod hoe hog hop hot how hub hue hug hum hut hwy ice icy ids iff ill imp ink inn ion ire irk ism its ivy jab jag jam jar jaw jay jet jib jig job jog jot joy jug jut keg key kid kin kit lab lac lad lag lap law lax lay led leg lei let lid lie lip lit lob loo lop lot low lug mad man map mar mas mat may men met mez mho mid min mix mob mom mop mow mud mug nab nag nap naw nay nee new nil nip nix nod nor not now nub nun nut oak oar oat odd ode off oil old one orb ore our out owe owl own pad pal pan par pas pat paw pay pea pen pep per pew pie pig pin pip pit ply pod poi pop pot pow pro pry psi pub pug pun pup pus put pye qis rah ram ran rap rat raw rax ray red ref rib rid rig rim rip rob roc rod roe rom rot row rub rue rug rum run rut rye sac sad sag sap sat saw sax say sea sec see set sew sex shy sic sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sty sub sue sum sun sup tab tad tag tan tap tar tat tea ted tee ten the thy tic tie til tin tip toe ton too top tot tow toy try tub tug two udo ugh ump uni uns upo ups urn use uta vac van vat vet via vid vim vow wab wad wae wag wan war was wax way web wed wee wet who why wig win wok won woo wow wry wye yak yam yap yea yeh yen yes yet yew yin yip you yum yup zap zax zip zit zoo").split(/\s+/);
  const SET = new Set(DICT.filter(w => w.length >= 3));

  function isAnagram(word, letters) {
    // Normalise to lowercase — the DICT is lowercase but the picked letters
    // and the typed `used` buffer are uppercase, so without this every lookup
    // returned false (which made allWords empty and rejected valid words).
    word = String(word).toLowerCase();
    const lettersStr = String(typeof letters === "string" ? letters : letters.join("")).toLowerCase();
    if (word.length > lettersStr.length) return false;
    const counts = {};
    for (const l of lettersStr) counts[l] = (counts[l] || 0) + 1;
    for (const l of word) {
      if (!counts[l]) return false;
      counts[l]--;
    }
    return true;
  }

  function pickLetters() {
    // pick a good letter set: prefer to ensure many words
    const V = "AEIOU", C = "BCDFGHJKLMNPRSTW";
    const arr = [];
    const vowels = [];
    while (vowels.length < 2) vowels.push(V[Math.floor(Math.random() * V.length)]);
    while (vowels.length < 3 && Math.random() < 0.4) vowels.push(V[Math.floor(Math.random() * V.length)]);
    while (arr.length + vowels.length < 7) arr.push(C[Math.floor(Math.random() * C.length)]);
    const all = arr.concat(vowels);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }

  GameRegistry.register({
    id: "wordhunt",
    name: "Word Hunt",
    icon: "🎯",
    category: "word",
    description: "Find all dictionary words from 7 scrambled letters — 90 seconds",
    tags: ["word", "timer"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let letters, used, time, score, found, timerInt, allWords;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="wh-score">0</div></div>
          <div class="score-cell"><div class="label">Found</div><div class="val" id="wh-found-n">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="wh-time">90s</div></div>
        </div>
        <div class="status info" id="wh-status">Type words from the letters — 3+ letters</div>
        <div id="wh-letters" style="text-align:center;margin:8px 0;"></div>
        <div id="wh-used" style="text-align:center;font-family:var(--font-mono);font-size:1.4rem;letter-spacing:0.2em;color:var(--accent);margin:6px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="wh-back">⌫</button>
          <button class="btn primary" id="wh-go">Submit</button>
          <button class="btn" id="wh-shuffle">↻ Shuffle</button>
        </div>
        <div id="wh-found" style="margin-top:8px;text-align:center;max-height:80px;overflow:auto;"></div>
        <p class="hint">3-letter=1pt, 4=2pt, 5=4pt, 6=8pt, 7=15pt. <b>R</b> new game.</p>
      `;
      const statusEl = root.querySelector("#wh-status");
      if (!document.getElementById("wh-shake")) {
        const s = document.createElement("style");
        s.id = "wh-shake";
        s.textContent = "@keyframes wh-shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}";
        document.head.appendChild(s);
      }

      function newGame() {
        letters = pickLetters();
        used = "";
        found = new Set();
        score = 0;
        time = 90;
        // compute all valid words from these letters (for hint/score tracking)
        allWords = DICT.filter(w => w.length >= 3 && isAnagram(w, letters));
        clearInterval(timerInt);
        timerInt = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive) return clearInterval(timerInt);
          time--;
          root.querySelector("#wh-time").textContent = time + "s";
          if (time <= 0) finish();
        }, 1000);
        render();
        statusEl.textContent = `Type words from the letters. ${allWords.length} words possible!`;
        statusEl.className = "status info";
      }

      function render() {
        root.querySelector("#wh-letters").innerHTML = letters.map(l => `<span class="letter" style="width:44px;height:44px;font-size:1.4rem;">${l}</span>`).join(" ");
        root.querySelector("#wh-used").textContent = used.split("").join(" ") || "—";
        root.querySelector("#wh-score").textContent = score;
        root.querySelector("#wh-found-n").textContent = found.size;
        root.querySelector("#wh-found").innerHTML = [...found].sort().map(w => `<span style="display:inline-block;padding:3px 8px;margin:2px;border-radius:999px;background:var(--bg-elev);font-size:0.8rem;">${w}</span>`).join("");
      }

      function finish() {
        clearInterval(timerInt);
        AudioFX.win();
        statusEl.textContent = `⏰ Time's up! You found ${found.size}/${allWords.length} words (${score} pts).`;
        statusEl.className = "status win";
        if (score > (Storage.getBest("wordhunt") || 0)) {
          Storage.setBest("wordhunt", score);
          App.toast("New best: " + score + " pts", "success");
        }
      }

      function submit() {
        if (time <= 0) return;
        const w = used.toUpperCase();
        const wl = w.toLowerCase(); // SET & isAnagram use lowercase
        if (w.length < 3) {
          AudioFX.error();
          shake();
          return;
        }
        if (found.has(w)) {
          AudioFX.error();
          statusEl.textContent = `Already found "${w}"`;
          shake();
          return;
        }
        if (!SET.has(wl)) {
          AudioFX.error();
          statusEl.textContent = `"${w}" isn't in the dictionary`;
          shake();
          return;
        }
        if (!isAnagram(wl, letters)) {
          AudioFX.error();
          statusEl.textContent = `Can't make "${w}" from these letters`;
          shake();
          return;
        }
        found.add(w);
        const pts = w.length === 3 ? 1 : w.length === 4 ? 2 : w.length === 5 ? 4 : w.length === 6 ? 8 : 15;
        score += pts;
        AudioFX.win();
        statusEl.textContent = `✓ ${w} (+${pts} pts)`;
        statusEl.className = "status win";
        used = "";
        render();
      }

      function shake() {
        const el = root.querySelector("#wh-used");
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "wh-shake 0.4s";
        statusEl.className = "status lose";
      }

      root.querySelector("#wh-back").addEventListener("click", () => {
        used = used.slice(0, -1);
        AudioFX.click();
        render();
      });
      root.querySelector("#wh-go").addEventListener("click", submit);
      root.querySelector("#wh-shuffle").addEventListener("click", () => {
        AudioFX.click();
        for (let i = letters.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        render();
      });

      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          newGame();
          return;
        }
        if (time <= 0) return;
        if (e.key === "Enter") {
          submit();
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          used = used.slice(0, -1);
          AudioFX.click();
          render();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key) && used.length < letters.length) {
          const l = e.key.toUpperCase();
          const remain = letters.slice();
          let ok = true;
          for (const c of used) {
            const i = remain.indexOf(c);
            if (i === -1) {
              ok = false;
              break;
            }
            remain.splice(i, 1);
          }
          if (ok && remain.includes(l)) {
            used += l;
            AudioFX.tick();
            render();
          }
        }
      }

      document.addEventListener("keydown", onKey);
      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
      };
    },
    help: function () {
      App.showModal("How to play Word Hunt",
        `You get 7 letters. Find as many real words (3+ letters) as possible in 90 seconds.
        <br><br>Type letters (you can only use each letter as many times as it appears) and press <b>Enter</b> to submit. <b>Backspace</b> deletes. <b>Shuffle</b> reorders letters.
        <br><br>Scoring: 3-letter = 1pt, 4 = 2pt, 5 = 4pt, 6 = 8pt, 7 = 15pt. <b>R</b> for new game.`);
    },
  });
})();
