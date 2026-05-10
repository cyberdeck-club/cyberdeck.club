# Your First Cyberdeck: A Beginner's Guide

So you want to build a cyberdeck. Maybe you saw one on TikTok and thought *I want that*. Maybe you've been wanting a distraction-free writing machine, a portable music player that isn't a phone, or a computer you actually own in a way that feels real. Whatever brought you here — you can do this, and you don't need to already know anything about electronics to start.

This guide walks through the whole process: figuring out what you want your deck to do, choosing parts, putting it together, getting the software running, and finding your people when you get stuck. It's written for people who have never touched a Raspberry Pi *(a credit-card-sized computer that costs $35–75)* before, but builders at any level might find something useful here.

## Before You Buy Anything: What Do You Want It to Do?

This is the most important step, and it's the one that a lot of guides skip. What your deck does determines every other decision — which computer to buy, what screen to get, how much battery you need, and what kind of case makes sense.

Some starting points to think about:

- **A distraction-free writing machine** (sometimes called a "writerdeck") — a keyboard, a screen, a text editor, and nothing else. No browser, no notifications, no email. Several builders on TikTok have made these for around $100 as an alternative to commercial options like the Freewrite, which costs $400+.
- **An offline media device** — loaded up with music, audiobooks, maps, a copy of Wikipedia, and photos. This is the kind of deck Annike Tan ([@ubeboobey](https://www.tiktok.com/@ubeboobey)) made famous with her mermaid cyberdeck — a personal archive that doesn't need Wi-Fi or an internet connection.
- **A portable coding or server terminal** — for connecting to other computers remotely, running scripts, or managing servers on the go.
- **A creative coding or art tool** — running generative art, music software, or interactive projects.
- **An e-reader or digital journal** — with an e-ink screen for long battery life and easy outdoor reading.
- **A retro gaming console** — running emulators for classic games.
- **A communication device** — with mesh networking (like [Meshtastic](https://meshtastic.org/)), amateur radio, or LoRa for off-grid messaging.
- **An "I'll figure it out later" machine** — and that's fine too. Many builders start with a general-purpose setup and find their use case along the way.

Don't worry about picking the "right" answer. Your first deck will probably evolve as you build it. The point is to give yourself a direction so you're not overwhelmed by choices at the parts stage.

## The Core Parts

Every cyberdeck, from a mermaid-purse build to a Pelican case rig, comes down to the same five pieces. Here's what each one is, what it does, and how to choose.

### 1. The Computer

The brain of your deck. Most builders use a **Raspberry Pi** — a small, affordable computer about the size of a credit card. It runs Linux *(a free operating system, like an alternative to Windows or macOS)* and has a huge community of people making tutorials, answering questions, and building accessories for it.

**Which Pi to pick:**

The **Raspberry Pi 4 (4GB RAM version)** is the most popular choice for cyberdecks right now. It's powerful enough for most tasks, well-supported, and runs around $55. If you find one secondhand for less, even better — check Facebook Marketplace, eBay, or local thrift shops.

The **Raspberry Pi 5** is faster but draws more power and runs hotter, which makes battery life trickier. Great if your deck will mostly be plugged in; more of a challenge for portable builds.

The **Raspberry Pi Zero 2 W** is tiny and cheap (~$15), which makes it great for ultra-compact builds where you don't need a lot of processing power — think a dedicated music player or a simple writerdeck.

There are also alternatives from other companies — LattePanda, Radxa, Orange Pi, Banana Pi — but the Raspberry Pi has by far the most beginner-friendly documentation and community support. For your first build, a Pi 4 is the safest bet.

**What you'll also need:** A microSD card (32GB is plenty to start, ~$8) to store the operating system and your files.

### 2. The Screen

Your display. This is where you'll see what your computer is doing.

**Size matters, and so does how you connect it.** Most cyberdeck screens connect over HDMI *(the same cable you'd use for a TV)* or DSI *(a ribbon cable that plugs directly into the Pi)*. HDMI screens are easier to set up — you plug in a cable and it works. DSI screens are thinner and save space inside a case, but can take more configuration.

**Common sizes:**

- **3.5 inches** — Very compact. Good for status displays or ultra-small builds, but you won't want to write a novel on one.
- **5 inches** — A good middle ground. Fits in small cases, readable enough for text work.
- **7 inches** — The most popular size for general-purpose decks. Big enough to be comfortable, small enough to be portable. Waveshare and the official Raspberry Pi touchscreen are well-documented options.
- **10+ inches** — Getting into laptop territory. Heavier, needs more power, but nice if usability is your priority.
- **E-ink** — Paper-like displays that are gentle on the eyes and incredible on battery life. They refresh slowly (no video), but they're wonderful for reading and writing.

**Touchscreen or not?** Touchscreens add a mouse-like input without needing a separate trackpad, but they cost a bit more and can be finicky to configure. Non-touch screens are cheaper and more straightforward — you'd pair them with a keyboard that has a built-in trackpad, or a small external mouse.

Avoid anything below 1024×600 resolution for your main display. Lower-res screens are fine as secondary displays (showing system stats, clock, etc.) but frustrating to work on.

### 3. The Keyboard

You need a way to type. Your options range from full-sized mechanical keyboards all the way down to tiny thumb-boards, depending on your case and use case.

**Beginner-friendly options:**

- **Mini wireless keyboard with trackpad** — The cheapest and easiest option. Lots of generic ones on Amazon for $15–25. They connect over USB and work out of the box with the Pi. Not the nicest typing experience, but zero configuration needed.
- **M5Stack CardKB** — A tiny keyboard designed for small builds. Connects over I2C *(a type of wiring connection)* and takes a bit more setup, but it's very compact.
- **Mechanical keyboard** — If your case is big enough, a small mechanical keyboard (like a 40% or 60% layout) gives you a much nicer typing experience. Many builders use whatever keyboard they already like and build a case around it.
- **Repurposed BlackBerry keyboard** — Popular for ultra-compact builds. Requires soldering and custom wiring, so probably not a first-build choice unless you're excited about that part.

For your first deck, a mini wireless keyboard with a built-in trackpad is the path of least resistance. You can always upgrade later.

### 4. Power

Your deck needs electricity. How you provide it depends on whether you want portability or not.

**The no-soldering option:** A USB-C power bank. The same kind you'd use to charge your phone. Plug it into the Pi, and you're running. The Pi 4 draws about 3–5 watts, so a 10,000 mAh power bank will give you several hours of use. You can tape or velcro the power bank to the back of your case and call it done. This is how many first-time builders handle power, and there is nothing wrong with it.

**The integrated option:** A battery board like the PiSugar (designed specifically for the Pi) or a generic USB-C battery management board. These mount directly to the Pi and give you a rechargeable battery with charge-level indicators. They cost $20–40 and require no soldering — they attach with screws or standoffs. This is a great upgrade for a second build, or if you want a cleaner look.

**The custom option:** Lithium-polymer (LiPo) cells wired to a charge controller. This gives you the most flexibility but requires understanding battery safety. LiPo batteries can be dangerous if shorted, punctured, or overcharged. If you go this route, please read about battery safety first — the [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) has a good section on this, and Adafruit has [extensive documentation on working with LiPo batteries safely](https://learn.adafruit.com/li-ion-and-lipoly-batteries).

For a first build: **a USB-C power bank is great.** Don't let anyone tell you it doesn't count.

### 5. The Case (the Fun Part)

This is where your deck becomes *yours*. The case is what people see first, and it's where the 2026 TikTok wave has expanded the possibilities furthest.

**No fabrication needed:**

- **A lunchbox or bento box** — Metal or plastic, from a thrift store or your kitchen. Cut holes for ports and screen with a rotary tool or even a sharp craft knife (for thin plastic).
- **A purse, clutch, or makeup case** — Clamshell purses from thrift stores are a favorite. The "caboodle" (a vintage plastic makeup organizer) is having a moment.
- **A tin** — Pokémon tins, cookie tins, Altoids tins (for very tiny builds). Metal tins may need a drill for port holes.
- **A toy** — Polly Pocket compacts, dinosaur figures, vintage lunchboxes. If it's hollow and big enough, it's a case.
- **A Pelican or Harbor Freight case** — The classic option. Waterproof, tough, foam-lined. Apache cases from Harbor Freight are the budget-friendly version (~$30).
- **A cardboard box** — Temporary, but functional. Prototype your layout in cardboard before committing to something permanent. Several builders have used Jollibee, Dunkin', and other fast-food boxes as permanent builds with clear-coat sealant.

**If you have a 3D printer:**

You can design your own case from scratch, or download and modify existing designs from [Printables](https://www.printables.com/search/all?q=cyberdeck) or [Thingiverse](https://www.thingiverse.com/search?q=cyberdeck&page=1&type=things). Budget 20–60 hours of print time for a full case. Print in sections, and test-fit your components with rough draft prints before committing to a long final print.

**If you have a laser cutter:**

Wood and acrylic cases look beautiful. Finger-jointed plywood cases have a warm, cottagecore-meets-cyberpunk vibe.

**If you have none of those tools:**

That's completely fine. Some of the most celebrated decks of the 2026 wave are thrifted containers with holes cut in them. A rotary tool (like a Dremel, ~$30) and a hot glue gun (~$10) will get you a long way.

## Putting It Together

Here's a general assembly flow. Your specific build will vary, but the broad strokes are the same.

### Step 1: Plan your layout

Before you attach anything permanently, put all your parts inside your case and figure out where everything goes. Pay attention to where cables need to reach, where the screen will sit, and where air can flow to keep the computer cool. Take photos of your test layout so you can reference them later.

### Step 2: Set up the software first

Before you mount anything in a case, get your Pi running on a desk. This way, if something doesn't work, you're not disassembling your build to troubleshoot.

1. **Download Raspberry Pi Imager** from [raspberrypi.com/software](https://www.raspberrypi.com/software/) onto your regular computer (Windows, Mac, or Linux all work).
2. **Insert your microSD card** into your regular computer.
3. **Open Pi Imager**, choose "Raspberry Pi OS" as the operating system, and choose your microSD card as the target. Click "Write." This copies the operating system onto the card, which takes a few minutes.
4. **Put the microSD card into your Pi**, connect it to your screen, keyboard, mouse, and power, and turn it on. You should see a desktop appear. If you don't, check that your HDMI cable is firmly seated and that you're using the right HDMI port (on the Pi 4, use the one labeled "HDMI 0," which is the one closer to the USB-C power port).

Once you're at a working desktop, connect to Wi-Fi (if you want to) and run updates. Open a terminal *(a text-based window for typing commands — you can find it in the menu bar at the top)* and type:

```
sudo apt update && sudo apt upgrade -y
```

This downloads the latest software updates. It might take 10–15 minutes. Let it finish.

### Step 3: Install the software you need

What to install depends on what your deck is for. Here are some starting points by use case:

**For writing:**
- **FocusWriter** — A fullscreen, distraction-free word processor. Install it with `sudo apt install focuswriter`.
- **Obsidian** — A note-taking app that stores files as plain text. Download the ARM version from [obsidian.md](https://obsidian.md/).
- **WordGrinder** — A terminal-based word processor for ultra-minimalist writing. Install it with `sudo apt install wordgrinder`.
- **WareWoolf** and **ZeroWriter** — Open-source writerdeck-specific software. More info at [writerdeck.org](http://www.writerdeck.org/).

**For offline media:**
- **Kiwix** — Lets you browse offline copies of Wikipedia, Wiktionary, Project Gutenberg, and more. Download from [kiwix.org](https://www.kiwix.org/).
- **VLC** — Plays audio and video. Install it with `sudo apt install vlc`.

**For general use:**
- Raspberry Pi OS comes with a web browser, file manager, and terminal out of the box. That might be all you need at first.

### Step 4: Mount things in your case

Once everything works on the desk, it's time to put it in the case. A few tips:

- **Velcro strips and double-sided tape** are perfectly legitimate mounting methods. Not everything needs screws.
- **Hot glue** works well for securing cables and lightweight components, and it peels off if you change your mind later.
- **Standoffs** (small threaded spacers, ~$5 for a bag of assorted sizes) keep your Pi and screen elevated off the case floor, which helps with airflow and prevents short circuits.
- **Cable management is worth the effort.** Buy cables that are close to the length you actually need. Long, looped cables take up space and look messy. Short right-angle HDMI and USB cables are your friends.
- **Leave access to the microSD card slot.** You will need to pull the card at some point — don't bury it behind other components.

### Step 5: Test everything before closing it up

Power on your deck with everything mounted but the case still open. Make sure the screen displays correctly, the keyboard and trackpad work, the power holds, and nothing is getting too hot. If your Pi runs warm, a small heatsink (a few dollars, sticks on with thermal adhesive) makes a big difference.

## What It Might Cost

Cyberdecks can cost as little or as much as you want. Here are two realistic budgets:

**The thrift-store build (~$75–100):**
Secondhand Raspberry Pi 4 from Facebook Marketplace or eBay ($25–35), a 5-inch HDMI screen ($20–30), a mini wireless keyboard ($15–20), a USB-C power bank you already own ($0), a case from a thrift store ($2–5), and a microSD card ($8). Several TikTok builders have documented builds in this range.

**The "I want it nice" build (~$150–250):**
New Raspberry Pi 4 4GB ($55), a 7-inch touchscreen ($45–65), a decent mini keyboard ($25–35), a PiSugar battery board ($25–40), a 3D-printed or purpose-bought case ($10–30), cables and small hardware ($10–15), and a microSD card ($8).

You can go higher — some builds hit $400+ — but there's no minimum spend required to make something that works and that you're proud of. Secondhand parts are your friend. Check thrift stores for cases, eBay and Facebook Marketplace for Pis, and your own drawers for power banks and cables you already have.

## When You Get Stuck

You will get stuck. Everyone does — first-time builders and experienced ones alike. Here's where to go:

- **[Cyberdeck Cafe](https://cyberdeck.cafe)** — An inclusive community with a Discord server full of people who are happy to help. Their [build guide](https://cyberdeck.cafe/build) is one of the best resources on the internet for this. No gatekeeping, all skill levels welcome.
- **[Alexine's beginner cyberdeck guide](https://jalexine.github.io/lab/build-your-first-cyberdeck.html)** — A clear, friendly walkthrough from someone who has helped hundreds of first-time builders.
- **TikTok** — Search [#cyberdeck](https://www.tiktok.com/discover/pretty-cyberdeck) or [#writerdeck](https://www.tiktok.com/discover/how-to-build-an-e-reader-cyber-deck). The comment sections on build videos are often full of helpful answers to beginner questions. Creators like [@arkitechnology](https://www.tiktok.com/@arkitechnology), [@sheydaelise](https://www.tiktok.com/@sheydaelise), and [@mewtru](https://www.tiktok.com/@mewtru) post beginner-friendly content.
- **[r/cyberDeck on Reddit](https://www.reddit.com/r/cyberDeck/)** — The largest cyberdeck forum (~183,000 members). Good for browsing builds and getting inspired; the community tone can be uneven, so if you get a curt response, it's not you.
- **[writerdeck.org](http://www.writerdeck.org/)** — If your build is specifically a distraction-free writing machine, this site aggregates hardware and software resources for that niche.
- **[Raspberry Pi documentation](https://www.raspberrypi.com/documentation/)** — The official docs for setting up and configuring your Pi. Very thorough.
- **cyberdeck.club** — You're here. Ask in the forum, post in the build log channel, or browse the wiki. That's what we're for.

## You Don't Have to Do It All at Once

The best advice most experienced builders give is: **get it working first, then make it pretty.** Your first deck might be a Raspberry Pi taped to a power bank inside a cardboard box with a keyboard balanced on top. That counts. It's a cyberdeck. You can iterate from there — swap the case, add a battery board, upgrade the screen, 3D-print a custom enclosure — at whatever pace works for you and your budget.

The point has never been to build the perfect computer. It's to build *your* computer.

## Further Reading

- [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) — The most comprehensive parts-and-assembly guide available
- [Alexine's beginner cyberdeck guide](https://jalexine.github.io/lab/build-your-first-cyberdeck.html) — Beginner-focused, recently updated
- [Raspberry Pi "In celebration of cyberdecks"](https://www.raspberrypi.com/news/in-celebration-of-cyberdecks/) — Inspiration roundup from the Pi Foundation
- [awesome-cyberdeck on GitHub](https://github.com/DayZedAndConfused762/awesome-cyberdeck) — A curated list of builds, components, software, and resources
- [writerdeck.org](http://www.writerdeck.org/) — Everything about writerdeck-specific builds and software
- [Raspberry Pi software setup](https://www.raspberrypi.com/software/) — Download Pi Imager and get started
- [What Is a Cyberdeck?](/wiki/what-is-a-cyberdeck) — Our wiki article on the history and culture of cyberdecks, including the 2026 TikTok wave
