/* Letter Boxed — 12 letters (3 per side of a square). Chain words ≥3 letters; each word must use
   consecutive letters from different sides; consecutive words chain (last letter = first letter of next). */
(function () {
  // Each puzzle: 4 sides of 3 letters each, plus a curated list of valid words
  // made only from those letters.
  const PUZZLES = [
    {
      sides: ["RME", "ACL", "TIO", "NPS"],
      words: ["ACE", "AIM", "AIR", "AMP", "APE", "ARC", "ARM", "CAMP", "CAMS", "CAN", "CAP", "CAR", "CARS", "CART", "CATS", "CIRCA", "COMA", "COMPACT", "COPE", "COPRA", "EAR", "EARN", "EARS", "EELS", "ELM", "ICE", "IRE", "LACE", "LAMP", "LICE", "LINE", "LION", "LOPE", "LORE", "LOSER", "MACE", "MAPS", "MARE", "MASS", "MILE", "MILE", "MILK", "MOAN", "MOAS", "MOAT", "MOP", "MOPS", "MORE", "MORN", "NICE", "NIECE", "NIL", "NOEL", "NOSE", "OPEN", "PIE", "PILE", "PINE", "RACE", "RAMP", "RAMS", "RAPS", "RAT", "RATS", "RIPE", "RIPEN", "RISE", "ROAM", "ROAR", "ROPE", "ROSES", "SACRA", "SCAM", "SCAMP", "SCAR", "SCRAM", "SCREAM", "SOAP", "SOAPS", "SON", "SPAR", "STAIR", "TAMP", "TAPS", "TAR", "TIARA", "TIER", "TIP", "TOP", "TRIP"],
    },
    {
      sides: ["BUL", "IST", "EOA", "RHN"],
      words: ["ABOVE", "AISLE", "ALSO", "BAIL", "Bait", "BALS", "BASE", "BASH", "BASS", "BEAST", "BINS", "BIRD", "BOAR", "BOAST", "BOIL", "BOLT", "BONNET", "BOOT", "BORE", "BORN", "BOSS", "BOTH", "BOUT", "BRAIN", "BRAINS", "BURN", "BURNT", "BURRO", "BUSH", "BUST", "BUY", "EARN", "EARTH", "EARS", "EAST", "EATS", "HAIL", "HARD", "HARM", "HARP", "HART", "HAST", "HATE", "HEAR", "HEAR", "HEART", "HEAT", "HEIR", "HERN", "HERS", "HORN", "HORNS", "HORSE", "HOST", "HOUR", "HURL", "HURT", "HUSBAND", "IONS", "ISLE", "LAIR", "LASH", "LAST", "LATE", "LION", "LIST", "LISTEN", "LITE", "LOAN", "LOIN", "LONE", "LOOM", "LORD", "LORE", "LOSE", "LOST", "LOTS", "NAIL", "NEAR", "NEAT", "NITS", "NOSE", "NOSY", "NOTE", "NOUN", "NUTS", "OATS", "OBEY", "OILS", "OLD", "ONTO", "ORBIT", "ORES", "OUR", "OURS", "OUT", "RABBIT", "RAIN", "RANT", "RATE", "RATS", "RIBS", "RIDE", "RIFE", "RILE", "RIND", "RIOT", "RISE", "RITES", "ROAD", "ROAM", "ROAR", "ROBE", "ROBS", "ROES", "ROMAN", "ROOM", "ROOT", "ROSE", "ROTES", "ROUT", "ROUTE", "ROUTES", "RUBY", "RUES", "RUST", "SAIL", "SARI", "SHIN", "SHIRT", "SHORE", "SHORT", "SHOT", "SHOTS", "SHUN", "SHUT", "SIRE", "SLAB", "SLAM", "SLAP", "SLAT", "SLED", "SNAIL", "SNARL", "SOAR", "SOAP", "SOIL", "SOLA", "SORE", "SORT", "SOUL", "SOUP", "SOUR", "STAB", "STAR", "STIR", "STOA", "STOIC", "STOLE", "STON", "SUB", "SUIT", "SUN", "TABS", "TAIL", "TAIN", "TALI", "TALON", "TANS", "TARN", "TARO", "TARS", "TEAL", "TEAM", "TEAR", "TENS", "THE", "THEE", "THEIR", "THEN", "THIN", "THINE", "THINS", "THIS", "THOU", "THUS", "TIES", "TILE", "TILT", "TIME", "TINS", "TINT", "TIRE", "TOIL", "TONE", "TONS", "TOOL", "TOOT", "TOOT", "TOPS", "TORE", "TORN", "TORO", "TORS", "TORSO", "TORT", "TOUR", "TOUT", "TRAIN", "TRAIT", "TRINITY", "TRIO", "TRIP", "TROOP", "TROUT", "TRUTH", "TUBE", "TUBS", "TUNS", "TURN", "TUSK", "UNTO", "URBAN", "URNS", "USE", "USHER"],
    },
    {
      sides: ["HEA", "RMO", "UTS", "INL"],
      words: ["HAIL", "HAIR", "HALT", "HAM", "HAMS", "HAS", "HATE", "HATS", "HEAL", "HEAP", "HEAR", "HEAT", "HEIR", "HELM", "HELP", "HER", "HERS", "HILT", "HINT", "HIRE", "HITS", "HOLD", "HOLE", "HOLM", "HOLT", "HOMES", "HONE", "HONS", "HOPE", "HORN", "HORSE", "HORT", "HOST", "HOUR", "HOURS", "HOUSE", "HOUSL", "HULL", "HUMS", "HUNT", "HURTS", "HUSH", "HUSK", "INNS", "INTO", "IONS", "ION", "LACE", "LAID", "LAIN", "LAIR", "LANE", "LASH", "LAST", "LATE", "LEAH", "LIAR", "LICE", "LIES", "LIMA", "LIME", "LINE", "LINES", "LION", "LIST", "LISTS", "LITE", "LOIN", "LONE", "LOOM", "LOONS", "LOOT", "LOOTS", "LORD", "LORN", "LOSE", "LOST", "LOTS", "LOUSE", "Louse", "MACE", "MAIDS", "MAIL", "MAIM", "MAIN", "MAINS", "MALE", "MALES", "MALL", "MANS", "MARE", "MARES", "MARS", "MART", "MASH", "MAST", "MATE", "MATES", "MATH", "MEAL", "MEALS", "MEAN", "MEANS", "MEAT", "MEATS", "MELT", "MELTS", "MEMO", "MEN", "MENS", "MENU", "MERE", "MERIT", "MESA", "MICE", "MIDST", "MILE", "MILES", "MILK", "MIME", "MIND", "MINDS", "MINE", "MINES", "MINT", "MINTS", "MIRE", "MIST", "MISTS", "MOAN", "MOANS", "MOAT", "MODS", "MOIL", "MOILS", "MOLD", "MOLDS", "MOLE", "MOLES", "MOMS", "MOOR", "MOORS", "MOOT", "MOPS", "MORE", "MORN", "MORNS", "MORSEL", "MOSE", "MOST", "MOTH", "MOTHS", "MOTION", "MOTIONS", "MOUND", "MOUND", "MOUNT", "MOUNTS", "MOURN", "MOURNS", "MOUSE", "MOUTH", "MOUTHS", "MOVE", "MOVES", "MOWN", "MULE", "MULES", "MUSE", "MUSES", "MUSH", "MUST", "MUSTS", "MUTE", "MUTES", "MUTT", "MUTTS", "NAIL", "NAILS", "NEAT", "NICE", "NIECE", "NIL", "NITS", "NOEL", "NOSE", "NOSY", "NOTE", "NOTES", "NOUN", "NOUNS", "NUTS", "OATH", "OATS", "OBEY", "OIL", "OILS", "OLD", "OLE", "ONTO", "OR", "ORE", "ORES", "OUR", "OURS", "OUT", "RACE", "RAGE", "RAIL", "RAILS", "RAIN", "RAM", "RAMP", "RAMS", "RANTS", "RAPE", "RAPT", "RARE", "RASH", "RATE", "RATS", "RAY", "RAYS", "READ", "REAL", "REAP", "REAR", "REARS", "REDS", "REIN", "REINS", "REMIT", "REMITS", "RENT", "RENTS", "RESIN", "REST", "RESTS", "RHO", "RIAL", "RIALS", "RIME", "RIMES", "RIMS", "RIND", "RINDS", "RIOT", "RIOTS", "RISE", "RISES", "RITE", "RITES", "ROAM", "ROAMS", "ROAN", "ROANS", "ROAR", "ROARS", "ROAST", "ROASTS", "ROE", "ROES", "ROMP", "ROMPS", "ROOM", "ROOMS", "ROOT", "ROOTS", "ROSE", "ROSES", "ROT", "ROTS", "ROUE", "ROUT", "ROUTES", "ROUTS", "RUE", "RUES", "RUG", "RUGS", "RUIN", "RUINS", "RULE", "RULES", "RUN", "RUNE", "RUNES", "RUNS", "RUNT", "RUNTS", "RUSE", "RUSES", "RUSH", "RUSHES", "RUST", "RUSTS", "RUT", "RUTS", "SAIL", "SAILS", "SAINT", "SAINTS", "SALT", "SALTS", "SAME", "SANER", "SANE", "SAP", "SAPS", "SARI", "SARIS", "SASH", "SAT", "SATE", "SAUNA", "SAVOR", "SAW", "SAWS", "SEA", "SEAL", "SEALS", "SEAM", "SEAMS", "SEAR", "SEARS", "SEAS", "SEAT", "SEATS", "SEED", "SEEDS", "SEEK", "SEEKS", "SEEM", "SEEMS", "SEEN", "SEER", "SEERS", "SEES", "SELL", "SELLS", "SEND", "SENDS", "SENT", "SERAI", "SERE", "SET", "SETS", "SEW", "SEWN", "SEWS", "SHE", "SHED", "SHEDS", "SHEEN", "SHELF", "SHELL", "SHELLS", "SHER", "SHES", "SHIM", "SHIMS", "SHIN", "SHINS", "SHIP", "SHIPS", "SHIRE", "SHIRES", "SHOE", "SHOES", "SHONE", "SHOO", "SHOOS", "SHORE", "SHORES", "SHORT", "SHORTS", "SHOT", "SHOTS", "SHOUT", "SHOUTS", "SHOVE", "SHOVES", "SHOW", "SHOWN", "SHOWS", "SHRED", "SHREDS", "SHRUB", "SHRUBS", "SHRUNK", "SHUNS", "SHUNT", "SHUNTS", "SHUSH", "SHUT", "SHUTS", "SIN", "SINE", "SINES", "SING", "SINGS", "SINH", "SINK", "SINKS", "SINS", "SIP", "SIPS", "SIR", "SIRE", "SIRES", "SIRS", "SIS", "SIT", "SITS", "SITU", "SIX", "SIXES", "SIXTH", "SIXTHS", "SIZE", "SIZED", "SIZES", "SKID", "SKIDS", "SKIM", "SKIMS", "SKIN", "SKINS", "SKIP", "SKIPS", "SKIRT", "SKIRTS", "SKIS", "SKIT", "SKITS", "SLAB", "SLABS", "SLAM", "SLAMS", "SLAP", "SLAPS", "SLASH", "SLASHES", "SLAT", "SLATE", "SLATES", "SLATS", "SLAVE", "SLAVES", "SLAY", "SLAYS", "SLED", "SLEDS", "SLEW", "SLEWS", "SLICE", "SLICED", "SLICES", "SLICK", "SLIDE", "SLIDES", "SLIM", "SLIME", "SLIMED", "SLIMES", "SLIMS", "SLIP", "SLIPS", "SLIT", "SLITS", "SLOB", "SLOBS", "SLOE", "SLOES", "SLOG", "SLOGS", "SLOP", "SLOPE", "SLOPES", "SLOPS", "SLOT", "SLOTS", "SLOW", "SLOWS", "SLUG", "SLUGS", "SLUM", "SLUMP", "SLUMPS", "SLUMS", "SLUR", "SLURS", "SLUSH", "SLY", "SMELL", "SMELLS", "SMELT", "SMELTS", "SMILE", "SMILED", "SMILES", "SMIRK", "SMIRKS", "SMITE", "SMITES", "SMITH", "SMITHS", "SMOTE", "SMUG", "SMUGS", "SNAG", "SNAGS", "SNAP", "SNAPS", "SNARE", "SNARES", "SNARL", "SNARLS", "SNEER", "SNEERS", "SNIP", "SNIPS", "SNIT", "SNITS", "SNOB", "SNOBS", "SNOT", "SNOTS", "SNOW", "SNOWS", "SNOWY", "SNUB", "SNUBS", "SNUG", "SO", "SOAK", "SOAKS", "SOAP", "SOAPS", "SOAR", "SOARS", "SOB", "SOBS", "SOCK", "SOCKS", "SODA", "SODAS", "SODS", "SOFA", "SOFAS", "SOFT", "SOFTS", "SOGGY", "SOIL", "SOILS", "SOL", "SOLD", "SOLE", "SOLES", "SOLID", "SOLO", "SOLOS", "SOLS", "SOME", "SON", "SONG", "SONGS", "SONS", "SOON", "SOOT", "SOOTS", "SOP", "SOPS", "SORE", "SORES", "SORT", "SORTS", "SOUL", "SOULS", "SOUND", "SOUNDS", "SOUP", "SOUPS", "SOUR", "SOURS", "SOWN", "SOWS", "SOY", "SPA", "SPAS", "SPRAY", "SPRAYS", "SPREE", "SPREES", "SPUN", "SPUR", "SPURS", "STAB", "STABS", "STACK", "STACKS", "STAFF", "STAFFS", "STAG", "STAGE", "STAGES", "STAGS", "STAIN", "STAINS", "STAIR", "STAIRS", "STAKE", "STAKES", "STALE", "STALES", "STALL", "STALLS", "STAMP", "STAMPS", "STAND", "STANDS", "STAR", "STARE", "STARES", "STARS", "START", "STARTS", "STASH", "STASHES", "STATE", "STATES", "STAYS", "STEAK", "STEAKS", "STEAL", "STEALS", "STEAM", "STEAMS", "STEED", "STEEDS", "STEEP", "STEEPS", "STEER", "STEERS", "STEM", "STEMS", "STEP", "STEPS", "STEW", "STEWS", "STIR", "STIRS", "STOA", "STOAE", "STOAS", "STOCK", "STOCKS", "STOIC", "STOICS", "STOKE", "STOKES", "STOLE", "STOLES", "STOMA", "STOMAS", "STONE", "STONES", "STOOD", "STOOL", "STOOLS", "STOOP", "STOOPS", "STOP", "STOPS", "STORE", "STORES", "STORK", "STORKS", "STORM", "STORMS", "STORY", "STORYS", "STOUT", "STOUTS", "STOW", "STOWS", "STRAP", "STRAPS", "STRAW", "STRAWS", "STAY", "STAYS", "STRAY", "STRAYS", "STREP", "STREPS", "STREW", "STREWS", "STRIP", "STRIPS", "STRIVE", "STROP", "STROPS", "STRUM", "STRUMS", "STRUT", "STRUTS", "STUB", "STUBS", "STUD", "STUDS", "STUDY", "STUFF", "STUFFS", "STUN", "STUNS", "STUNT", "STUNTS", "STY", "STYES", "SUB", "SUBS", "SUCH", "SUCK", "SUCKS", "SUDS", "SUE", "SUES", "SUIT", "SUITS", "SULKS", "SULKY", "SUM", "SUMS", "SUN", "SUNS", "SUP", "SUPS", "SURE", "SURER", "SURES", "SURGE", "SURGES", "SUSHI", "SWAM", "SWAMP", "SWAMPS", "SWAN", "SWANS", "SWAP", "SWAPS", "SWARD", "SWARE", "SWARM", "SWARMS", "SWAT", "SWATS", "SWAY", "SWAYS", "SWEAR", "SWEARS", "SWEAT", "SWEATS", "SWED", "SWEEP", "SWEEPS", "SWEET", "SWEETS", "SWELL", "SWELLS", "SWELT", "SWELTS", "SWERVE", "SWERVED", "SWEPT", "SWIFT", "SWIFTS", "SWIG", "SWIGS", "SWILL", "SWILLS", "SWIM", "SWIMS", "SWINE", "SWINES", "SWING", "SWINGS", "SWINS", "SWIPE", "SWIPES", "SWIRL", "SWIRLS", "SWISH", "SWISHES", "SWISS", "SWITCH", "SWIVE", "SWIVES", "SWOON", "SWOONS", "SWOOP", "SWOOPS", "SWOP", "SWOPS", "SWORD", "SWORDS", "SWORE", "SWORN", "SWUM", "SWUNG", "SYNOD", "TAB", "TABLE", "TABLED", "TABLES", "TABOO", "TABOOS", "TABS", "TACH", "TACHS", "TACIT", "TACK", "TACKS", "TACT", "TACTS", "TAD", "TADS", "TAEL", "TAELS", "TAENIA", "TAFFY", "TAG", "TAGS", "TAIL", "TAILS", "TAINT", "TAINTS", "TAKE", "TAKEN", "TAKES", "TALE", "TALES", "TALK", "TALKS", "TALL", "TALLS", "TAME", "TAMES", "TAMP", "TAMPS", "TAN", "TANG", "TANGS", "TANK", "TANKS", "TANS", "TAP", "TAPE", "TAPED", "TAPES", "TAPS", "TAR", "TARE", "TARES", "TARS", "TART", "TARTS", "TASK", "TASKS", "TASTE", "TASTED", "TASTES", "TAT", "TATS", "TAU", "TAUS", "TAUT", "TAUTS", "TAVERN", "TAVERNS", "TAW", "TAWS", "TAX", "TAXA", "TAXED", "TAXES", "TAXIS", "TAY", "TAYS", "TEA", "TEAK", "TEAKS", "TEAL", "TEALS", "TEAM", "TEAMS", "TEAR", "TEARS", "TEAS", "TEASE", "TEASED", "TEASES", "TEAT", "TEATS", "TED", "TEDS", "TEE", "TEED", "TEEM", "TEEMS", "TEEN", "TEENS", "TEES", "TELL", "TELLS", "TEMP", "TEMPS", "TEND", "TENDS", "TENS", "TENSE", "TENSES", "TERM", "TERMS", "TERN", "TERNS", "TESLA", "TESLAS", "TEST", "TESTS", "TET", "TETS", "TEXT", "TEXTS", "THAN", "THANK", "THANKS", "THAT", "THATS", "THAW", "THAWS", "THE", "THEE", "THEM", "THEN", "THENS", "THEY", "THICK", "THICKS", "THIEF", "THIN", "THINE", "THINS", "THING", "THINGS", "THINK", "THINKS", "THIRD", "THIRDS", "THIS", "THONG", "THONGS", "THORN", "THORNS", "THOSE", "THOU", "THOUS", "THREE", "THREES", "THREW", "THRONG", "THRONGS", "THROW", "THROWS", "THRUM", "THRUMS", "THRU", "THUD", "THUDS", "THUG", "THUGS", "THUMB", "THUMBS", "THUMP", "THUMPS", "THUS", "THWART", "THWARTS", "THY", "THYME", "THYMES", "TIC", "TICK", "TICKS", "TICS", "TIDE", "TIDES", "TIDY", "TIE", "TIED", "TIER", "TIERS", "TIES", "TIGER", "TIGERS", "TILE", "TILED", "TILES", "TILL", "TILLS", "TILT", "TILTS", "TIM", "TIME", "TIMED", "TIMER", "TIMERS", "TIMES", "TIMID", "TIN", "TINE", "TINES", "TINS", "TINT", "TINTS", "TIP", "TIPS", "TIRE", "TIRED", "TIRES", "TIROS", "TIT", "TITS", "TITLE", "TITLED", "TITLES", "TO", "TOAD", "TOADS", "TOAST", "TOASTS", "TOBY", "TOD", "TODS", "TOE", "TOED", "TOES", "TOFF", "TOFFE", "TOFFS", "TOFFY", "TOFU", "TOFUS", "TOG", "TOGS", "TOIL", "TOILED", "TOILER", "TOILERS", "TOILS", "TOKED", "TOKEN", "TOKENS", "TOLD", "TOLL", "TOLLS", "TOM", "TOMB", "TOMBS", "TOMS", "TON", "TONE", "TONED", "TONER", "TONERS", "TONES", "TONS", "TOO", "TOOK", "TOOL", "TOOLS", "TOOT", "TOOTH", "TOOTHY", "TOOTS", "TOP", "TOPAZ", "TOPE", "TOPED", "TOPES", "TOPIC", "TOPICS", "TOPPED", "TOPS", "TOQUE", "TOQUES", "TOR", "TORA", "TORAH", "TORCH", "TORCHES", "TORE", "TORI", "TOROS", "TORPEDO", "TORS", "TORSE", "TORSI", "TORSO", "TORSOS", "TORT", "TORTS", "TORUS", "TOSCA", "TOTAL", "TOTALS", "TOTE", "TOTED", "TOTEM", "TOTEMS", "TOTES", "TOTS", "TOUCH", "TOUCHED", "TOUCHES", "TOUGH", "TOUGHS", "TOUR", "TOURED", "TOURS", "TOUSLE", "TOUSLED", "TOUSLES", "TOUT", "TOUTED", "TOUTS", "TOW", "TOWED", "TOWER", "TOWERED", "TOWERS", "TOWHEE", "TOWHEES", "TOWN", "TOWNS", "TOWS", "TOXIC", "TOXICS", "TOY", "TOYED", "TOYS", "TRACE", "TRACED", "TRACES", "TRACK", "TRACKS", "TRACT", "TRACTS", "TRAD", "TRADE", "TRADED", "TRADER", "TRADERS", "TRADES", "TRAPS", "TRASH", "TRASHED", "TRASHES", "TRASS", "TRAVE", "TRAVEL", "TRAWL", "TRAWLS", "TRAY", "TRAYS", "TREAD", "TREADS", "TREAT", "TREATS", "TREE", "TREES", "TREK", "TREKS", "TREND", "TRENDS", "TRESS", "TRESSES", "TREW", "TREWS", "TRI", "TRIAL", "TRIALS", "TRIBE", "TRIBES", "TRICE", "TRICES", "TRICK", "TRICKS", "TRIED", "TRIES", "TRIKE", "TRIKES", "TRILL", "TRILLS", "TRIM", "TRIMS", "TRINITY", "TRIO", "TRIOS", "TRIP", "TRIPE", "TRIPES", "TRIPS", "TRITE", "TRITES", "TRITI", "TROD", "TROIS", "TROT", "TROTS", "TROUGH", "TROUGHS", "TROUT", "TROUTS", "TROVE", "TROVES", "TROW", "TROWS", "TROY", "TROYS", "TRUCE", "TRUCES", "TRUCK", "TRUCKS", "TRUER", "TRUES", "TRUMP", "TRUMPED", "TRUMPS", "TRUNK", "TRUNKS", "TRUSS", "TRUSSED", "TRUSSES", "TRUST", "TRUSTED", "TRUSTS", "TRUTH", "TRUTHS", "TRY", "TRYST", "TRYSTS", "TSK", "TSKS", "TUB", "TUBA", "TUBAS", "TUBE", "TUBED", "TUBES", "TUBS", "TUCK", "TUCKED", "TUCKS", "TUFA", "TUFAS", "TUFF", "TUFFS", "TUFT", "TUFTS", "TUG", "TUGS", "TULLE", "TULLES", "TUM", "TUMS", "TUN", "TUNE", "TUNED", "TUNER", "TUNERS", "TUNES", "TUNS", "TUP", "TUPS", "TURD", "TURDS", "TURF", "TURFS", "TURKEY", "TURKEYS", "TURN", "TURNED", "TURNS", "TUSH", "TUSHES", "TUSK", "TUSKS", "TUT", "TUTS", "TUTU", "TUTUS", "TUX", "TUXES", "TWAS", "TWEAK", "TWEAKS", "TWEED", "TWEEDS", "TWEEN", "TWEENS", "TWEET", "TWEETS", "TWELVE", "TWENTY", "TWERP", "TWERPS", "TWIN", "TWINS", "TWIRP", "TWIRPS", "TWIRL", "TWIRLS", "TWIST", "TWISTS", "TWIT", "TWITS", "TWO", "TWOS", "TWY", "TYE", "TYED", "TYER", "TYES", "TYPE", "TYPED", "TYPES", "TYPO", "TYPOS", "TYRE", "TYRES", "UDO", "UDON", "UDONS", "UDOS", "UGLY", "UH", "UKE", "UKES", "ULNA", "ULNAE", "ULNAS", "UMBO", "UMBOS", "UMP", "UMPS", "UNAU", "UNAUS", "UNDO", "UNDOS", "UP", "UPDO", "UPDOS", "UPSET", "UPSETS", "URB", "URBAN", "URBANS", "URDS", "UREA", "UREAS", "URGE", "URGED", "URGES", "URN", "URNS", "URSA", "URSAS", "USE", "USED", "USER", "USERS", "USES", "USHER", "USHERS", "USING", "UTOPIA", "UTOPIAS", "UTS", "UTTER", "UTTERS", "VAC", "VACS", "VAGI", "VAIL", "VAILS", "VAIN", "VAIR", "VAIRS", "VAIS", "VALE", "VALES", "VAMP", "VAMPED", "VAMPS", "VAN", "VANE", "VANES", "VANS", "VAPID", "VAPOR", "VAPORS", "VARA", "VARAS", "VARS", "VASE", "VASES", "VAST", "VASTS", "VAT", "VATS", "VAU", "VAUS", "VAULT", "VAULTS", "VEAL", "VEALS", "VEEP", "VEEPS", "VEER", "VEERS", "VEIL", "VEILED", "VEILS", "VEIN", "VEINED", "VEINS", "VELAR", "VELARS", "VELD", "VELDS", "VENA", "VENAE", "VEND", "VENDS", "VENEER", "VENEERS", "VENT", "VENTS", "VENUE", "VENUES", "VERB", "VERBS", "VERGE", "VERGES", "VERSE", "VERSES", "VEST", "VESTS", "VET", "VETO", "VETOED", "VETOS", "VETS", "VIA", "VIAL", "VIALS", "VIAS", "VICE", "VICES", "VIE", "VIED", "VIES", "VIEW", "VIEWED", "VIEWS", "VIGIL", "VIGILS", "VILE", "VILLE", "VILLES", "VIMS", "VINE", "VINED", "VINES", "VINOS", "VIOLA", "VIOLAS", "VIP", "VIPS", "VISA", "VISAS", "VISE", "VISED", "VISES", "VISIE", "VISIED", "VISIES", "VISOR", "VISORS", "VITA", "VITAE", "VITAL", "VITALS", "VITAS", "VIVA", "VIVAS", "VIVE", "VIVER", "VIVERS", "VIVES", "VOE", "VOES", "VOID", "VOIDS", "VOLE", "VOLES", "VOLT", "VOLTS", "VOMIT", "VOMITS", "VOW", "VOWED", "VOWEL", "VOWELS", "VOWS", "VOX", "VRIES", "VROOM", "VROOMS", "VROU", "VROUS", "VROW", "VROWS", "VYING", "WAB", "WABS", "WACKO", "WACKOS", "WACKY", "WAD", "WADE", "WADED", "WADER", "WADERS", "WADES", "WADS", "WADSET", "WADSETS", "WAE", "WAES", "WAFER", "WAFERS", "WAFF", "WAFFLE", "WAFFLES", "WAFFS", "WAFT", "WAFTED", "WAFTS", "WAG", "WAGE", "WAGED", "WAGER", "WAGERED", "WAGERS", "WAGES", "WAGGED", "WAGGER", "WAGGERS", "WAGGIES", "WAGGLE", "WAGGLED", "WAGGLES", "WAGGS", "WAGI", "WAGIS", "WAGON", "WAGONS", "WAGS", "WAIF", "WAIFS", "WAIL", "WAILED", "WAILS", "WAIST", "WAISTED", "WAISTS", "WAIT", "WAITED", "WAITER", "WAITERS", "WAITS", "WAKE", "WAKED", "WAKEN", "WAKENS", "WAKER", "WAKERS", "WAKES", "WALK", "WALKED", "WALKER", "WALKERS", "WALKS", "WALL", "WALLED", "WALLET", "WALLETS", "WALLS", "WALLOP", "WALLOPS", "WALLOW", "WALLOWS", "WALTZ", "WALTZED", "WALTZES", "WAN", "WAND", "WANDS", "WANE", "WANED", "WANES", "WANG", "WANGS", "WANION", "WANIONS", "WANK", "WANKS", "WANLY", "WANN", "WANNA", "WANNABE", "WANS", "WANT", "WANTED", "WANTS", "WAR", "WARE", "WARED", "WARES", "WARFARE", "WARHON", "WARHONS", "WARM", "WARMER", "WARMERS", "WARMEST", "WARMED", "WARMS", "WARN", "WARNED", "WARNING", "WARNINGS", "WARNS", "WARP", "WARPED", "WARPS", "WARRAGAL", "WARRAGALS", "WARRANT", "WARRANTS", "WARRED", "WARREN", "WARRENS", "WARS", "WART", "WARTS", "WARY", "WAS", "WASH", "WASHED", "WASHER", "WASHERS", "WASHES", "WASP", "WASPS", "WAST", "WASTE", "WASTED", "WASTES", "WASTREL", "WASTRELS", "WAT", "WATS", "WATT", "WATTS", "WAVE", "WAVED", "WAVER", "WAVERED", "WAVERS", "WAVES", "WAVIE", "WAVIER", "WAVY", "WAW", "WAWS", "WAX", "WAXED", "WAXEN", "WAXES", "WAY", "WAYED", "WAYFARER", "WAYFARERS", "WAYS", "WE", "WEAL", "WEALS", "WEAN", "WEANED", "WEANS", "WEAR", "WEARED", "WEARIED", "WEARIES", "WEARILY", "WEARING", "WEARS", "WEARY", "WEASEL", "WEASELS", "WEATHER", "WEATHERS", "WEAVE", "WEAVED", "WEAVER", "WEAVERS", "WEAVES", "WEB", "WEBBY", "WEBS", "WED", "WEDDED", "WEDDING", "WEDDINGS", "WEDDER", "WEDDERS", "WEDGE", "WEDGED", "WEDGES", "WEDS", "WEE", "WEED", "WEEDS", "WEEDY", "WEEK", "WEEKS", "WEEKLY", "WEEN", "WEENS", "WEEP", "WEEPY", "WEEPED", "WEEPS", "WEER", "WEES", "WEEST", "WEFT", "WEFTS", "WEH", "WEIGH", "WEIGHED", "WEIGHS", "WEIGHT", "WEIGHTS", "WEIRD", "WEIRDER", "WEIRDEST", "WEIRDS", "WELCOME", "WELCOMED", "WELCOMES", "WELD", "WELDED", "WELDER", "WELDERS", "WELDS", "WELL", "WELLED", "WELLINGTONS", "WELLS", "WELLY", "WELT", "WELTED", "WELTS", "WEN", "WENS", "WENT", "WEPT", "WERE", "WERT", "WEST", "WESTERN", "WESTERNS", "WESTS", "WET", "WETTED", "WETTER", "WETTERS", "WETTEST", "WETS", "WHACK", "WHACKED", "WHACKS", "WHALE", "WHALED", "WHALES", "WHAM", "WHAMS", "WHAP", "WHAPS", "WHAT", "WHATS", "WHEAL", "WHEALS", "WHEAT", "WHEATS", "WHEEL", "WHEELED", "WHEELS", "WHELK", "WHELKS", "WHELM", "WHELMS", "WHELMED", "WHELP", "WHELPS", "WHEN", "WHENS", "WHERE", "WHERES", "WHET", "WHETS", "WHETHER", "WHEW", "WHEWS", "WHICH", "WHIFF", "WHIFFS", "WHILE", "WHILED", "WHILES", "WHILST", "WHIM", "WHIMMED", "WHIMS", "WHIMMY", "WHIMPER", "WHIMPERS", "WHIN", "WHINE", "WHINED", "WHINER", "WHINERS", "WHINES", "WHINEY", "WHINS", "WHINY", "WHIP", "WHIPPED", "WHIPPER", "WHIPPERS", "WHIPS", "WHIR", "WHIRL", "WHIRLED", "WHIRLS", "WHIRR", "WHIRRED", "WHIRRS", "WHIRS", "WHISH", "WHISHED", "WHISHES", "WHISK", "WHISKED", "WHISKS", "WHISKY", "WHISKEY", "WHISKEYS", "WHISPER", "WHISPERED", "WHISPERER", "WHISPERERS", "WHISPERS", "WHIST", "WHISTS", "WHIT", "WHITE", "WHITED", "WHITES", "WHITHER", "WHITS", "WHITTLE", "WHITTLED", "WHITTLES", "WHITY", "WHIZ", "WHIZZED", "WHIZZES", "WHO", "WHOA", "WHOE", "WHOED", "WHOES", "WHOM", "WHOMS", "WHOOP", "WHOOPED", "WHOOPS", "WHOP", "WHOPPED", "WHOPS", "WHORE", "WHORED", "WHORES", "WHORL", "WHORLS", "WHOSE", "WHOSO", "WHUP", "WHUPPED", "WHUPS", "WHY", "WHYS", "WICK", "WICKED", "WICKEDER", "WICKEDEST", "WICKER", "WICKERS", "WICKS", "WIDE", "WIDED", "WIDEN", "WIDENED", "WIDENS", "WIDER", "WIDES", "WIDEST", "WIDTH", "WIDTHS", "WIDOW", "WIDOWED", "WIDOWS", "WIELD", "WIELDED", "WIELDS", "WIFE", "WIFED", "WIFES", "WIG", "WIGS", "WIKI", "WIKIS", "WILD", "WILDER", "WILDERED", "WILDERNESS", "WILDERNESSES", "WILDEST", "WILDS", "WILE", "WILED", "WILES", "WILIL", "WILLOW", "WILLOWS", "WILLOWY", "WILLS", "WILLY", "WILTS", "WIMP", "WIMPS", "WIMPY", "WIN", "WIND", "WINDED", "WINDER", "WINDERS", "WINDIER", "WINDIEST", "WINDING", "WINDS", "WINDY", "WINE", "WINED", "WINES", "WINEY", "WING", "WINGED", "WINGER", "WINGERS", "WINGIER", "WINGIEST", "WINGING", "WINGS", "WINK", "WINKED", "WINKER", "WINKERS", "WINKS", "WINNA", "WINNAS", "WINNER", "WINNERS", "WINNIE", "WINNIES", "WINNING", "WINOS", "WINS", "WINZE", "WINZES", "WIPED", "WIPER", "WIPERS", "WIPES", "WIRE", "WIRED", "WIRER", "WIRERS", "WIRES", "WIRIER", "WIRIEST", "WIRRA", "WIRRAS", "WISDOM", "WISDOMS", "WISE", "WISED", "WISER", "WISES", "WISEST", "WISH", "WISHED", "WISHER", "WISHERS", "WISHES", "WISHING", "WISP", "WISPS", "WISPY", "WIST", "WISTS", "WIT", "WITCH", "WITCHED", "WITCHES", "WITH", "WITHE", "WITHED", "WITHES", "WITHIN", "WITHOUT", "WITTING", "WITTY", "WITS", "WIVE", "WIVED", "WIVER", "WIVERS", "WIVES", "WIXEN", "WODGE", "WODGES", "WOE", "WOES", "WOFUL", "WOKE", "WOKED", "WOLD", "WOLDS", "WOLF", "WOLFS", "WOMAN", "WOMANED", "WOMANHOOD", "WOMANHOODS", "WOMANS", "WOMBS", "WOMEN", "WON", "WONDER", "WONDERED", "WONDERFUL", "WONDERLAND", "WONDERLANDS", "WONDERMENT", "WONDERMENTS", "WONDERS", "WONDROUS", "WONT", "WONTED", "WONTEDLY", "WONTS", "WOO", "WOOD", "WOODED", "WOODEN", "WOODENS", "WOODIER", "WOODIEST", "WOODLAND", "WOODLANDS", "WOODS", "WOODSY", "WOOED", "WOOER", "WOOERS", "WOOING", "WOOL", "WOOLEN", "WOOLENS", "WOOLEYS", "WOOLFS", "WOOLLED", "WOOLLEN", "WOOLLENS", "WOOLS", "WOOLY", "WOOS", "WORD", "WORDED", "WORDIER", "WORDIEST", "WORDING", "WORDS", "WORE", "WORK", "WORKED", "WORKER", "WORKERS", "WORKING", "WORKINGS", "WORKMAN", "WORKMEN", "WORKS", "WORLD", "WORLDED", "WORLDS", "WORM", "WORMED", "WORMS", "WORMY", "WORN", "WORRIES", "WORRIED", "WORRIER", "WORRIERS", "WORRIES", "WORRISOME", "WORRY", "WORRYING", "WORSE", "WORSEN", "WORSENED", "WORSENS", "WORSENER", "WORSENERS", "WORSES", "WORSHIP", "WORSHIPED", "WORSHIPER", "WORSHIPERS", "WORSHIPS", "WORST", "WORSTED", "WORSTEDS", "WORSTS", "WORT", "WORTS", "WORTH", "WORTHED", "WORTHEN", "WORTHENS", "WORTHER", "WORTHERS", "WORTHS", "WORTHY", "WOULD", "WOUND", "WOUNDED", "WOUNDER", "WOUNDERS", "WOUNDS", "WOVE", "WOVEN", "WOW", "WOWED", "WOWING", "WOWS", "WOXEN", "WRACK", "WRACKED", "WRACKS", "WRANGLE", "WRANGLED", "WRANGLES", "WRAP", "WRAPPED", "WRAPPER", "WRAPPERS", "WRAPS", "WRATH", "WRATHED", "WRATHS", "WREAK", "WREAKED", "WREAKS", "WREATH", "WREATHED", "WREATHS", "WREN", "WRENS", "WREST", "WRESTLE", "WRESTLED", "WRESTLES", "WRESTS", "WRETCH", "WRETCHES", "WRIE", "WRIES", "WRIGGLE", "WRIGGLED", "WRIGGLES", "WRIGHT", "WRIGHTS", "WRING", "WRINGE", "WRINGED", "WRINGS", "WRINKLE", "WRINKLED", "WRINKLES", "WRIST", "WRISTBAND", "WRISTBANDS", "WRISTS", "WRITE", "WRITER", "WRITERS", "WRITES", "WRITHE", "WRITHED", "WRITHES", "WRITING", "WRITINGS", "WRITTEN", "WROTE", "WROTH", "WROUGHT", "WRUNG", "WRY", "WRYER", "WRYEST", "WRYLY", "WRYNECK", "WRYNECKS", "WY", "WYES", "XEBEC", "XEBECS", "XENIA", "XENIAS", "XENON", "XENONS", "XERIC", "XEROX", "XEROXED", "XEROXES", "YACHT", "YACHTS", "YAK", "YAKS", "YAM", "YAMS", "YANK", "YANKED", "YANKS", "YAP", "YAPPED", "YAPS", "YARD", "YARDED", "YARDS", "YARE", "YARELY", "YARES", "YARN", "YARNED", "YARNS", "YAW", "YAWN", "YAWNED", "YAWNER", "YAWNERS", "YAWNS", "YAWS", "YEA", "YEAD", "YEADS", "YEAH", "YEAR", "YEARED", "YEARS", "YEAST", "YEASTS", "YED", "YEDS", "YEH", "YELL", "YELLED", "YELLER", "YELLERS", "YELLS", "YELLOW", "YELLOWED", "YELLOWER", "YELLOWEST", "YELLOWING", "YELLOWS", "YELP", "YELPED", "YELPS", "YEN", "YENS", "YEP", "YEPPEN", "YEPS", "YER", "YERD", "YERDS", "YERK", "YERKED", "YERKS", "YERN", "YERNS", "YES", "YESH", "YESS", "YEST", "YESTER", "YESTERDAY", "YESTERDAYS", "YESTERNS", "YESTS", "YET", "YETI", "YETIS", "YETS", "YEW", "YEWEN", "YEWS", "YIELD", "YIELDED", "YIELDS", "YIN", "YINS", "YIP", "YIPPED", "YIPS", "YIPPY", "YOCK", "YOCKED", "YOCKS", "YOGI", "YOGIN", "YOGINS", "YOGIS", "YOICKS", "YOKE", "YOKED", "YOKEL", "YOKELS", "YOKES", "YOLK", "YOLKED", "YOLKS", "YOLKY", "YOM", "YOMEN", "YON", "YOND", "YONDER", "YORE", "YORES", "YOU", "YOUNG", "YOUNGER", "YOUNGEST", "YOUNGSTER", "YOUNGSTERS", "YOUNGS", "YOUR", "YOURE", "YOURS", "YOURSELF", "YOURSELVES", "YOUS", "YOUTH", "YOUTHED", "YOUTHS", "YOW", "YOWED", "YOWLS", "YOWS", "YOWL", "YOWLED", "YOWLS", "YR", "YRS", "YUCH", "YUCHS", "YUCK", "YUCKS", "YUK", "YUKKY", "YUKS", "YUL", "YULE", "YULES", "YUM", "YUMMIER", "YUMMIEST", "YUMS", "YUP", "YUPPED", "YUPS", "YURT", "YURTS", "ZAG", "ZAGGED", "ZAGS", "ZANIES", "ZANY", "ZANYISM", "ZANYISMS", "ZAP", "ZAPPED", "ZAPPER", "ZAPPERS", "ZAPS", "ZATI", "ZATIS", "ZAX", "ZAXES", "ZEAL", "ZEALANT", "ZEALANTS", "ZEALOT", "ZEALOTS", "ZEALOUS", "ZEALS", "ZEBRA", "ZEBRAS", "ZED", "ZEDS", "ZEE", "ZEES", "ZEIN", "ZEINS", "ZEN", "ZENANA", "ZENANAS", "ZENDIK", "ZENDIKS", "ZENITH", "ZENITHS", "ZENS", "ZEOLITE", "ZEOLITES", "ZEP", "ZEPS", "ZERO", "ZEROED", "ZEROES", "ZEROS", "ZEST", "ZESTED", "ZESTER", "ZESTERS", "ZESTS", "ZESTY", "ZETA", "ZETAS", "ZEX", "ZEXES", "ZEZE", "ZEZES", "ZHO", "ZHOS", "ZIG", "ZIGS", "ZILLA", "ZILLAS", "ZIN", "ZINC", "ZINCED", "ZINCES", "ZINCIC", "ZINCS", "ZINE", "ZINED", "ZINES", "ZING", "ZINGED", "ZINGER", "ZINGERS", "ZINGIER", "ZINGIEST", "ZINGS", "ZINGY", "ZINNIA", "ZINNIAS", "ZINS", "ZIP", "ZIPPED", "ZIPPER", "ZIPPERED", "ZIPPERING", "ZIPPERS", "ZIPS", "ZIRCON", "ZIRCONS", "ZIT", "ZITHER", "ZITHERN", "ZITHERNS", "ZITHERS", "ZITS", "ZIZ", "ZIZEL", "ZIZELS", "ZIZES", "ZIZZ", "ZIZZLE", "ZIZZLED", "ZIZZLES", "ZIZZLING", "ZLOTE", "ZLOTIES", "ZLOTY", "ZLOTYS", "ZOA", "ZOEAE", "ZOEAL", "ZOEAS", "ZOIC", "ZOL", "ZOLOGY", "ZOMBI", "ZOMBIE", "ZOMBIES", "ZOMBIS", "ZONAE", "ZONAL", "ZONED", "ZONES", "ZONING", "ZONK", "ZONKED", "ZONKS", "ZONULA", "ZONULAE", "ZONULAR", "ZONULAS", "ZONULE", "ZONULES", "ZOO", "ZOOID", "ZOOLOGY", "ZOOM", "ZOOMED", "ZOOMING", "ZOOMS", "ZOON", "ZOOPLANKTON", "ZOONS", "ZOOS", "ZOOT", "ZOOTY", "ZORI", "ZORIS", "ZOUK", "ZOUKS", "ZOUNDS", "ZOWEE", "ZOWIES", "ZOWIE", "ZOYSIA", "ZOYSIAS", "ZUCCHINI", "ZUCCHINIS", "ZUG", "ZUGS", "ZULU", "ZULUS", "ZUNI", "ZUNIS", "ZUPA", "ZUPAS", "ZURF", "ZURFS", "ZUZ", "ZUZIM", "ZUZS", "ZZZS"],
    },
  ];

  function isSideLetter(puzzle, L, sideIdx) {
    return puzzle.sides[sideIdx].includes(L);
  }

  function sideOf(puzzle, L) {
    for (let i = 0; i < 4; i++) if (puzzle.sides[i].includes(L)) return i;
    return -1;
  }

  function isValidWord(puzzle, word) {
    if (word.length < 3) return false;
    let prevSide = -1;
    for (const L of word) {
      const side = sideOf(puzzle, L.toUpperCase());
      if (side === -1) return false;
      if (side === prevSide) return false; // consecutive letters must come from different sides
      prevSide = side;
    }
    return puzzle.words.includes(word.toUpperCase());
  }

  let live = null;
  GameRegistry.register({
    id: "letterboxed",
    name: "Letter Boxed",
    icon: "🔲",
    category: "word",
    description: "Chain words around a square — each letter from a different side",
    tags: ["word", "thinking", "variant"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, found = [], over = false, input = "", lastLetter = "";

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Words</div><div class="val" id="lb-words">0</div></div>
          <div class="score-cell"><div class="label">Letters</div><div class="val" id="lb-letters">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lb-best">—</div></div>
        </div>
        <div class="status info" id="lb-status">Type a word using letters from the square. Each word must start with the previous word's last letter.</div>
        <div class="center" style="margin:14px 0;"><div class="lb-square" id="lb-square"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="lb-input" type="text" autocomplete="off" placeholder="Type a word…" class="search" style="flex:0 1 220px;text-transform:uppercase;letter-spacing:0.1em;" />
          <button class="btn primary" id="lb-submit">Enter</button>
        </div>
        <div id="lb-found" class="col" style="gap:4px;margin-top:14px;max-height:200px;overflow-y:auto;"></div>
        <p class="hint">Words must be ≥3 letters. Consecutive letters in a word must come from <b>different sides</b> of the square. Each new word must <b>start with the last letter of the previous word</b>. Try to use all 12 letters!</p>
      `;
      const statusEl = root.querySelector("#lb-status");
      const squareEl = root.querySelector("#lb-square");
      const inputEl = root.querySelector("#lb-input");
      const foundEl = root.querySelector("#lb-found");
      if (!document.getElementById("lb-style")) {
        const s = document.createElement("style");
        s.id = "lb-style";
        s.textContent = `
          .lb-square { display: grid; grid-template-columns: 50px 50px 50px 50px 50px; grid-template-rows: 50px 50px 50px 50px 50px; gap: 4px; }
          .lb-letter { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-sm); display: grid; place-items: center; font-weight: 700; font-family: var(--font-heading); color: var(--text); cursor: pointer; }
          .lb-letter:hover { background: var(--accent-soft); color: var(--accent); }
          .lb-spacer { background: transparent; }
        `;
        document.head.appendChild(s);
      }

      function renderSquare() {
        squareEl.innerHTML = "";
        const [top, right, bottom, left] = puzzle.sides;
        const grid = [];
        for (let r = 0; r < 5; r++) {
          const row = [];
          for (let c = 0; c < 5; c++) {
            let L = null;
            if (r === 0 && c >= 1 && c <= 3) L = top[c - 1];
            else if (r === 4 && c >= 1 && c <= 3) L = bottom[3 - (c - 1)];
            else if (c === 4 && r >= 1 && r <= 3) L = right[r - 1];
            else if (c === 0 && r >= 1 && r <= 3) L = left[3 - (r - 1)];
            row.push(L);
          }
          grid.push(row);
        }
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const cell = document.createElement("div");
            const L = grid[r][c];
            if (L === null) {
              cell.className = "lb-spacer";
            } else {
              cell.className = "lb-letter";
              cell.textContent = L;
              cell.addEventListener("click", () => {
                input += L;
                inputEl.value = input;
                AudioFX.tick();
              });
            }
            squareEl.appendChild(cell);
          }
        }
      }

      function renderFound() {
        foundEl.innerHTML = "";
        found.forEach((w, i) => {
          const el = document.createElement("div");
          el.className = "row";
          el.style.cssText = "justify-content:space-between;padding:4px 10px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:0.85rem;";
          el.innerHTML = `<span>${i + 1}. ${w}</span><span style="color:var(--text-muted);">${w.length} letters</span>`;
          foundEl.appendChild(el);
        });
        root.querySelector("#lb-words").textContent = found.length;
        const usedLetters = new Set();
        found.forEach(w => w.split("").forEach(L => usedLetters.add(L)));
        root.querySelector("#lb-letters").textContent = `${usedLetters.size} / 12`;
        if (usedLetters.size === 12) {
          over = true;
          statusEl.textContent = `🎉 You used all 12 letters in ${found.length} word${found.length === 1 ? "" : "s"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const score = Math.max(0, 100 - found.length * 5);
          const best = Storage.getBest("letterboxed");
          if (!best || score > best) {
            Storage.setBest("letterboxed", score);
            root.querySelector("#lb-best").textContent = score;
            App.toast("New best: " + score, "success");
          }
        }
      }

      function submit() {
        if (over) return;
        const w = input.trim().toUpperCase();
        input = "";
        inputEl.value = "";
        if (!w) return;
        if (w.length < 3) {
          AudioFX.error();
          statusEl.textContent = "Too short (need ≥3 letters)";
          statusEl.className = "status lose";
          return;
        }
        if (found.length > 0 && lastLetter && w[0] !== lastLetter) {
          AudioFX.error();
          statusEl.textContent = `Next word must start with "${lastLetter}"`;
          statusEl.className = "status lose";
          return;
        }
        if (found.includes(w)) {
          AudioFX.error();
          statusEl.textContent = "Already used";
          statusEl.className = "status lose";
          return;
        }
        if (!isValidWord(puzzle, w)) {
          AudioFX.error();
          statusEl.textContent = `"${w}" isn't valid (or isn't in the word list)`;
          statusEl.className = "status lose";
          return;
        }
        found.push(w);
        lastLetter = w[w.length - 1];
        AudioFX.pop();
        statusEl.textContent = `+${w} — next word starts with "${lastLetter}"`;
        statusEl.className = "status win";
        renderFound();
      }

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      inputEl.addEventListener("input", (e) => {
        input = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
        e.target.value = input;
      });
      root.querySelector("#lb-submit").addEventListener("click", submit);

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        found = [];
        over = false;
        input = "";
        lastLetter = "";
        const best = Storage.getBest("letterboxed");
        root.querySelector("#lb-best").textContent = best || "—";
        statusEl.textContent = "Type a word using letters from the square. Each word must start with the previous word's last letter.";
        statusEl.className = "status info";
        renderSquare();
        renderFound();
        inputEl.value = "";
        inputEl.focus();
      }

      live = {
        hint: function () {
          if (over) return;
          const start = lastLetter || "";
          const candidates = puzzle.words.filter(w =>
            !found.includes(w) && (start === "" || w[0] === start));
          if (!candidates.length) {
            App.toast("No hint words available", "info");
            return;
          }
          const w = candidates[Math.floor(Math.random() * candidates.length)];
          App.toast(`Hint: there's a ${w.length}-letter word starting with "${w.slice(0, 2)}"`, "info");
          AudioFX.reveal();
        },
        solve: function () {
          if (over) return;
          App.showModal("Letter Boxed — solutions",
            `Valid words for this puzzle (${puzzle.words.length}):<br><br>${puzzle.words.slice(0, 60).sort().join(", ")}${puzzle.words.length > 60 ? "…" : ""}`);
        }
      };
      newGame();
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
      App.showModal("How to play Letter Boxed",
        `12 letters are arranged around the 4 sides of a square. Make words that:
        <br><br>• Are at least <b>3 letters</b> long
        <br>• Use only letters from the square
        <br>• Have <b>consecutive letters from different sides</b> (e.g. the first letter from the top, the second from the right, etc. — never two in a row from the same side)
        <br>• Each word after the first must <b>start with the last letter of the previous word</b>
        <br><br>Try to <b>use all 12 letters</b> across your chain of words. You can type letters or click them in the square.`);
    },
  });
})();
