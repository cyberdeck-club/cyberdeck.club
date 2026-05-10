# Thrifting & Upcycling Cyberdeck Enclosures

The case is the soul of a cyberdeck. It's the first thing people see, the thing that makes your build yours, and — if you're thrifting it — probably the cheapest and most fun part of the entire project. A $3 purse from Goodwill, a lunchbox from your childhood, a tin you found at a yard sale, a toy that's been sitting in a drawer for fifteen years: any of these can become a computer.

The 2026 TikTok wave proved this in a big way. The builds that captured millions of views weren't in expensive specialty cases — they were in [clamshell purses](https://www.tiktok.com/@ubeboobey), [Polly Pocket compacts](https://www.tiktok.com/@rainbowsandbiscuits/video/7617401659861339414), [Pokémon tins](https://www.tiktok.com/@amora.davis/video/7623984642927906061), [Jollibee boxes](https://www.tiktok.com/@serialexperiments404/video/7623252926227664146), [Lego bricks](https://www.tiktok.com/@sheydaelise/video/7624727069305425183), and [vintage makeup caboodles](https://www.tiktok.com/@fulltimemenace_/video/7626421821218311438). The case doesn't need to be bought from an electronics retailer. It needs to be interesting, big enough to hold your parts, and something that makes you smile when you look at it.

This article covers where to find enclosures, how to evaluate whether something will work, what tools you need to modify it, and practical tips for the actual construction — all aimed at people who don't own a workshop or a 3D printer.

## Where to Look

### Thrift Stores

Goodwill, Salvation Army, Savers, Value Village, local charity shops — these are your best friends. Here's what to check in each section:

**Bags and purses.** Clamshell purses *(purses with a rigid frame that open like a book)* are the iconic 2026 cyberdeck enclosure. Look for anything with hard sides and a hinge. Clutches, vintage evening bags, beaded purses with stiff shells, cosmetics cases, and jewelry boxes all work. The pearlescent clamshell purse that started the TikTok wave cost a few dollars from a secondhand shop.

**Toys.** Polly Pocket compacts, vintage lunchboxes *(metal ones are especially sturdy)*, action figure carrying cases, toy toolboxes, play kitchens that have compartments, toy cash registers, and yes — hollow dinosaur toys. If it's rigid, hollow, and bigger than your fist, it's a candidate. Check the toy bins carefully; the weird, oversized, can't-quite-identify-it items are often the most interesting enclosures.

**Kitchen.** Bento boxes, vintage Tupperware containers, bread boxes, tea tins, cookie tins, lunch containers with compartments. Metal lunch boxes (the rectangular kind with a latch) are a classic cyberdeck enclosure.

**Electronics.** Old cameras, portable radios, cassette players, Walkman-style devices, portable DVD players, handheld TVs, and vintage electronics with hollow enclosures. Vintage test equipment cases are often beautifully built and can be found for a few dollars. The guts are usually worthless — it's the shell you want.

**Accessories.** Makeup organizers (caboodles), cigar boxes, jewelry boxes, glasses cases, pencil cases, small toolboxes, sewing baskets with rigid sides.

**General.** Briefcases, camera cases, small hard-sided luggage, instrument cases *(flute and clarinet cases are great sizes)*, and anything else that catches your eye and makes you think "I could put a computer in that."

### Dollar Stores and Discount Shops

Dollar Tree, Five Below, 99 Cents Only, and similar stores have surprisingly useful things: small toolboxes, pencil cases, storage containers, phone cases you can gut and repurpose, and cheap tools (hot glue guns, craft knives, small files). The quality is lower than thrift-store finds, but the prices are predictable and the selection is consistent.

### Your Own Home

Before you buy anything, look around. Things people already own that make good cyberdeck enclosures: old lunchboxes, jewelry boxes, cigar boxes, tins that held holiday cookies or popcorn, tackle boxes, craft supply organizers, shoe boxes *(as prototypes — more on this below)*, empty gift boxes with magnetic closures, cosmetic bags with rigid frames, and the packaging from electronics you've already unboxed.

### Online Secondhand

eBay, Facebook Marketplace, OfferUp, Mercari, and Depop all have sections where you can search for vintage cases, tins, and boxes. eBay is especially good for specific vintage items (a particular tin, a specific vintage lunchbox) but prices tend to be higher than in-person thrift stores. Facebook Marketplace is better for local deals — you can often find the same items for less and without shipping costs.

### Fast-Food and Product Packaging

This one is underrated. Several viral cyberdeck builds used branded packaging as permanent enclosures: a [Dunkin' Donuts box](https://www.tiktok.com/@cocoasaesthetic), a [Jollibee carton](https://www.tiktok.com/@serialexperiments404/video/7623252926227664146), and various cookie and snack tins. If you seal cardboard with clear-coat spray (a few dollars at a hardware store), it becomes surprisingly durable. The aesthetic is deliberate — it says something about reclaiming disposable corporate objects and turning them into personal tech.

## How to Evaluate a Potential Enclosure

You're standing in a thrift store holding something interesting. Here's how to figure out if it'll work.

### Size: Will Your Parts Fit?

Before you go shopping, measure your components — or bring them with you. The parts that determine your minimum enclosure size:

A **Raspberry Pi 4** is about 85mm × 56mm (roughly 3.4 × 2.2 inches). A **Pi Zero 2 W** is about 65mm × 30mm (2.6 × 1.2 inches). Your **screen** is whatever size it is — a 5-inch screen is roughly 120 × 75mm, a 7-inch screen is roughly 165 × 100mm. Your **keyboard** varies hugely. Your **power bank or battery** has its own dimensions.

Stack these up mentally or on a piece of paper. Add at least half an inch of clearance around the edges for cables, airflow, and mounting. If it all fits inside the object you're holding — you've got a candidate.

A trick many builders use: **bring a paper template** of your Pi (or whatever board you're using) with you when you thrift. Cut a piece of paper to the board's exact dimensions. Drop it into the container. Does it fit with room to spare? You're good.

### Structure: Is It Sturdy Enough?

Your enclosure needs to hold electronics without crushing them. Things to check:

**Rigidity.** Does it flex when you squeeze it? A little flex is fine (plastic bento boxes flex and still work great as enclosures). A lot of flex means things will rattle and connectors will wiggle loose. Metal and hard plastic are ideal. Soft fabric bags are not enclosures — they're sleeves, which is a different thing.

**Hinge quality.** If it has a hinge *(the folding mechanism that lets it open and close)*, test it. Does it stay open on its own? Does it close securely? A clamshell purse with a weak clasp will flop open and drop your screen. You can reinforce a weak clasp with magnets or velcro, but a totally broken hinge is hard to fix.

**Internal volume.** Is there enough depth? A screen-to-Pi stack can be as thin as 25mm (about an inch) if you're careful, but most builds need 40–60mm (1.5–2.5 inches) of internal depth to fit everything comfortably plus cables.

### Material: What Is It Made Of?

This matters because different materials require different tools to modify.

**Thin plastic** (Polly Pocket compacts, cosmetic cases, cheap lunchboxes): easy to cut with a craft knife or rotary tool. Can crack if you're aggressive — go slow.

**Thick plastic** (Pelican-style cases, hard toolboxes, caboodles): tougher but still manageable with a rotary tool. Less likely to crack.

**Metal** (tins, vintage lunchboxes, cookie tins): requires a rotary tool with a metal cutting disc or a drill with step bits for round holes. Metal edges are sharp after cutting — you'll need to file or sand them smooth.

**Wood** (cigar boxes, some jewelry boxes): drill and saw work well. Wood is forgiving and easy to work with, and the aesthetic is beautiful — cottagecore cyberdeck vibes.

**Cardboard** (product packaging, fast-food boxes): easy to cut with a craft knife or scissors. Not durable on its own, but a coat of clear polyurethane spray makes it surprisingly tough. Several layers of spray create a hard, glossy surface. Not waterproof, but fine for indoor use.

### Character: Does It Spark Something?

This is the part no buying guide can answer for you. The best cyberdeck enclosures are the ones that feel personal — the toy you loved as a kid, the purse that matches your aesthetic, the tin that reminds you of something, the lunchbox that makes you laugh. The 2026 wave taught us that the most celebrated builds aren't the most technically sophisticated ones. They're the ones where the builder's personality is visible in every choice. Pick the enclosure that makes you excited to work on it.

## Tools You'll Need

Most enclosure modifications require making holes — for screens, ports, charging cables, ventilation, and power switches. Here's the tool list, from most essential to nice-to-have.

### The Essentials (~$30 total)

**A rotary tool** (often called a Dremel, which is a brand name, like how people call all tissues "Kleenex"). This is the single most useful tool for enclosure work. It cuts, sands, grinds, and polishes. You can cut rectangular holes for screens, round holes for USB ports, and slots for SD card access. Harbor Freight sells a functional rotary tool kit for about $20–30. The genuine Dremel brand costs $40–80 and is nicer to hold, but the cheap ones work fine for occasional use.

**Tips for using a rotary tool on plastic:** Run it at low speed. High speed melts plastic instead of cutting it — you'll end up with a gummy, deformed mess. If you see the plastic getting soft or stringy, stop, let it cool, and continue at a lower speed. Make your initial cuts slightly smaller than your target size (you can always remove more material, but you can't add it back), then file or sand to the final fit.

**A hot glue gun** (~$5–10). Holds components in place inside the case, secures cables, and fills gaps. Hot glue is strong enough to hold a Pi in place but peels off cleanly if you change your mind later. It's the most forgiving adhesive for prototyping.

**A set of small files** (~$5–8 for a set). Needle files and small flat files let you clean up cut edges, enlarge holes incrementally, and smooth rough spots. After cutting a hole with a rotary tool, you'll use files to make the edges neat. A set of jeweler's files from a hardware store or Amazon covers most needs.

**A craft knife / utility knife** (~$3). For scoring thin plastic, trimming hot glue, cutting cardboard, and general cleanup work.

### Very Helpful but Not Required

**A drill with assorted bits** (~$25–40 for a cheap corded drill). Round holes (for USB ports, charging ports, switches, ventilation) are much easier with a drill than a rotary tool. Step drill bits *(a cone-shaped bit that cuts progressively larger holes as you push deeper)* are especially useful — one bit makes holes from 4mm to 20mm in diameter, and they cost $5–10.

**Velcro strips** (~$5). Stick-on Velcro is one of the best mounting methods for cyberdeck components. Stick one side to your Pi, the other side to the inside of the case. Components stay put during use but can be pulled off for maintenance or upgrades. Many builders use Velcro exclusively for internal mounting.

**Double-sided foam tape** (~$5). Thicker than regular double-sided tape, it provides cushioning and keeps components from rattling. Good for mounting screens and battery packs.

**Standoffs** (~$5 for an assorted set). Small threaded spacers that elevate your Pi or screen off the floor of the case. This provides airflow for cooling and prevents the bottom of the circuit board from touching the enclosure (which could cause short circuits *(unintended electrical connections that can damage components)* on metal enclosures). M2.5 standoffs fit the Raspberry Pi's mounting holes.

**Aquarium tubing** (~$3). This is a deep-cut tip from experienced modders: slit a short length of flexible aquarium tubing lengthwise and slide it over cut metal edges. It covers the sharp edge completely, looks clean, and costs almost nothing. Much cheaper and easier than buying specialty edge trim.

### If You Have a 3D Printer

You can print custom mounting brackets, screen bezels *(the frame around the screen)*, port adapters, hinge reinforcements, and internal organizers. This lets you combine a thrifted enclosure with precision-fit internal components — the best of both worlds. [Printables](https://www.printables.com/search/all?q=cyberdeck) and [Thingiverse](https://www.thingiverse.com/search?q=cyberdeck&page=1&type=things) have plenty of parametric designs you can modify to fit your specific case.

But a 3D printer is not required. Velcro, hot glue, foam tape, and standoffs will get you a long way.

## Practical Construction Tips

### Prototype in Cardboard First

Before you cut into your beautiful thrifted find, build a mock-up in a cardboard box. Tape your components into approximate position. Connect the cables. Power it on. Does everything fit? Can you reach the microSD card slot? Is the screen at a usable angle? Are the cables long enough? Are they too long (coiled cables eat up space)?

Prototyping in cardboard takes an hour and saves you from making irreversible cuts in the wrong places. Several TikTok builders have documented this step — and a few have used the cardboard prototype as the final enclosure, sealed with clear coat.

### Plan Your Cuts Before You Cut

Once you know where everything goes, mark your cut lines on the actual enclosure with a pencil, marker, or masking tape. For screen cutouts, trace the visible area of the screen (not the circuit board behind it — the screen is smaller than its board). For port holes, measure the port with calipers or a ruler and mark the center point.

**The golden rule of enclosure cutting: cut small, test, enlarge.** You can always remove more material. You cannot add it back. If your screen cutout is 2mm too wide, it looks sloppy and the screen rattles. Start your cuts 1–2mm inside your marked lines and work outward with files until the part fits snugly.

### Airflow Matters

Your Pi generates heat, and a sealed enclosure with no ventilation will make it run hot, which causes throttling *(the computer slowing itself down to avoid damage)*. You have a few options:

**Drill ventilation holes.** A cluster of small holes (3–4mm each) on the bottom or sides of the case, away from the screen, lets warm air escape. Pattern them in a grid or a shape that fits the enclosure's aesthetic — some builders drill ventilation in the shape of their initials, a star, or a geometric pattern.

**Leave a gap.** If the case doesn't close perfectly airtight (most thrifted enclosures don't), that gap is your ventilation. You may not need to drill anything.

**Add a heatsink.** A small adhesive heatsink on the Pi's processor *(the square chip in the center of the board)* costs $2–3 and makes a meaningful difference, especially in enclosed builds. Stick it on with the included thermal adhesive pad.

**Add a tiny fan.** A 30mm or 40mm fan, wired to the Pi's 5V GPIO pins, provides active cooling. This is more relevant for Pi 5 builds (which run hotter) than Pi 4 or Zero 2 W builds.

### Making It Close

Getting an enclosure to close properly after you've added a Pi, a screen, a keyboard, and cables inside it is one of the trickiest parts of the build. Some tips:

**Use right-angle cables.** USB, HDMI, and power cables that exit the Pi at a right angle take up much less vertical space than straight cables that poke up and then bend. Right-angle micro-HDMI and USB-C cables are available on Amazon for a few dollars each, and they're one of the highest-impact upgrades for tight builds.

**Route cables flat.** Run cables along the walls of the enclosure rather than across the middle. Use small cable clips or dabs of hot glue to hold them in place.

**Shave down connector housings.** The plastic shells around USB and HDMI connectors are sometimes unnecessarily bulky. With a craft knife or file, you can carefully shave down the housing to save a few millimeters. Be careful not to cut into the actual wiring.

**Use flexible flat cables where possible.** DSI ribbon cables *(thin, flat cables used for certain Pi displays)* take up almost no space compared to HDMI cables. If your screen supports DSI, use it.

### Securing Components

The inside of a thrifted enclosure is rarely flat, regularly shaped, or pre-drilled with mounting holes. Here's how to deal with that:

**Velcro for nearly everything.** Stick one side to the component, the other to the enclosure wall. The Pi, the battery board, and small keyboards all mount well this way. You can pull them off and rearrange.

**Hot glue for permanent mounts.** If you're confident about placement, a line of hot glue holds components firmly. To remove later, gently pry with a credit card or plastic tool — hot glue bonds to surfaces but doesn't usually damage them.

**Foam tape for vibration dampening.** Screens and hard drives (if you have one) benefit from a layer of foam tape between them and the case, which absorbs vibration and prevents rattling.

**Custom mounting plates.** If you have a 3D printer, print a flat plate with screw holes that matches your Pi's mounting pattern, then attach the plate to the case with adhesive or screws. If you don't have a printer, a piece of acrylic, thin plywood, or even thick cardboard cut to shape works. The plate gives you a flat surface with known hole positions inside an irregularly-shaped enclosure.

### Edge Finishing

The difference between a build that looks scrappy and one that looks intentional often comes down to edge finishing.

**Sand or file cut edges smooth.** A few minutes with fine sandpaper (220 grit) on a cut plastic or metal edge removes burrs and makes it safe to touch.

**Paint cut edges.** If you've cut through a painted or finished surface, touching up the exposed edge with matching paint (or contrasting paint, if that's your aesthetic) makes the modification look planned rather than hacked.

**Use trim.** Adhesive rubber or silicone trim (U-shaped channel) fits over cut edges and covers them cleanly. Aquarium tubing slit lengthwise does the same thing for free.

**Leave it raw.** Some builders deliberately leave cut edges visible as part of the aesthetic — the "I built this with my hands" vibe is part of cyberdeck culture. There's no obligation to make it look factory-finished.

## What to Do When It Doesn't Work

Sometimes the enclosure you fell in love with just doesn't work. The parts don't fit, the hinge breaks when you add weight, the material cracks when you try to cut it, or the final result doesn't look or feel like what you imagined.

This is normal and it happens to everyone — beginners and experienced builders alike. A few things to keep in mind:

**Your first build doesn't have to be your forever build.** Many builders treat their first enclosure as a learning experience and move the components to a better case later. The Pi, the screen, the keyboard, and the battery are all reusable. The only thing "lost" is the enclosure and your time — and the time was spent learning.

**A bad enclosure choice isn't wasted money.** If you thrifted it for $3, you spent $3 on a lesson about what does and doesn't work as a cyberdeck case. That's cheaper than most tutorials.

**The community has seen it all.** If you're struggling with fit, structural integrity, or fabrication, post in the [Cyberdeck Cafe Discord](https://cyberdeck.cafe), the [cyberdeck.club forum](/forum), or even the TikTok comments of a builder whose work you admire. People are genuinely helpful, and someone has probably solved the exact problem you're facing.

## Gallery of Thrifted Enclosure Ideas

This isn't exhaustive — it's a starting point to jog your imagination. Every one of these has been used in a real build.

**From the purse section:** Clamshell purses, hard-shell clutches, vintage beaded bags with rigid frames, seashell purses, lucite box purses, wicker baskets with lids.

**From the toy section:** Polly Pocket compacts, Fisher-Price medical kits, vintage metal lunchboxes (Transformers, Barbie, Star Wars — all appear regularly), plastic dinosaur figures (hollow them out), Bop It housings, toy laptops from VTech or LeapFrog, Game Boy shells.

**From the kitchen section:** Bento boxes, bread tins, cookie tins, tea caddies, picnic sets with rigid cases, vintage Tupperware, cigar boxes.

**From the electronics section:** Portable cassette player housings, vintage radio enclosures, old laptop shells (gut the internals, keep the case), calculator housings, portable TV sets (the kind with tiny CRT screens — thrift stores often have these for under $10).

**From the accessories section:** Makeup caboodles, pencil boxes, watch boxes, eyeglass cases (tight fit, but the Pi Zero fits), jewelry organizers, vintage cigarette cases, card-game tins.

**From packaging:** Jollibee boxes, Dunkin' boxes, Pokémon card tins, Altoids tins (Pi Zero only), decorative gift boxes, holiday popcorn tins, board game boxes.

## Further Reading

- [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) — Includes thrifting tips and budget strategies
- [Alexine's beginner cyberdeck guide](https://jalexine.github.io/lab/build-your-first-cyberdeck.html) — Covers enclosure selection for first-timers
- [awesome-cyberdeck on GitHub](https://github.com/DayZedAndConfused762/awesome-cyberdeck) — Curated list of builds and components
- [TikTok: #cyberdeck](https://www.tiktok.com/discover/pretty-cyberdeck) — Endless thrifted-enclosure inspiration
- [Your First Cyberdeck: A Beginner's Guide](/wiki/your-first-cyberdeck) — Full build walkthrough
- [Choosing the Right Single-Board Computer](/wiki/choosing-the-right-single-board-computer) — Helps you know what board dimensions to shop around
