# Choosing the Right Single-Board Computer

The tiny computer at the heart of your cyberdeck — usually called a single-board computer, or SBC — is the one decision that affects everything else: what software you can run, how long your battery lasts, how hot the inside of your case gets, and how much help you'll find online when something doesn't work. The good news is that for most builds, the answer is straightforward, and it's hard to pick wrong.

This article walks through the major options, what makes each one a good fit (or not) for different kinds of decks, and the tradeoffs that actually matter. If you haven't read [Your First Cyberdeck: A Beginner's Guide](/wiki/your-first-cyberdeck) yet, start there — it covers the full build process. This page goes deeper on the computer part.

## What Is a Single-Board Computer?

A single-board computer is a complete computer — processor, memory, storage slot, USB ports, video output, and sometimes Wi-Fi and Bluetooth — all on a single circuit board, usually about the size of a credit card or smaller. You plug in a screen, a keyboard, power, and a microSD card with an operating system *(the software that makes the computer run, like Windows or macOS — except most SBCs run Linux, which is free)*, and you have a working computer.

They're not as fast as a laptop or desktop. You won't be editing video or running heavyweight software on most of them. But for writing, reading, browsing, coding, running servers, playing retro games, and controlling hardware — which covers the vast majority of cyberdeck use cases — they're more than enough.

## The Raspberry Pi Family

The Raspberry Pi is by far the most popular SBC for cyberdecks, and for good reason: the documentation is excellent, the community is enormous, almost every question you'll have has already been answered somewhere, and the accessories ecosystem (screens, cases, battery boards, camera modules) is huge. If you're building your first deck, a Raspberry Pi is the safest choice.

There are several models, and they're different enough that which one you pick matters.

### Raspberry Pi 4 Model B

**The community favorite for cyberdecks.**

This is the board that most cyberdeck guides, tutorials, and TikTok builds are based on. It has a quad-core processor *(four processing cores working together)* clocked at 1.5 GHz, and it comes in 1GB, 2GB, 4GB, and 8GB RAM versions. For a cyberdeck, **4GB is the sweet spot** — it handles web browsing, writing apps, coding, and light multitasking without issue, and you rarely use more than 2–3GB in practice. The 2GB model works fine if you're trying to save money and don't plan to run a desktop browser.

**What's great about it for cyberdecks:**
It draws 3–7 watts depending on what you're doing, which means a 10,000 mAh USB power bank will keep it running for several hours. It has two full-size USB ports, two USB 3.0 ports, two micro-HDMI video outputs, Gigabit Ethernet, Wi-Fi, Bluetooth, and a 40-pin GPIO header *(a row of programmable pins you can use to connect sensors, LEDs, buttons, and other hardware)*. The sheer volume of tutorials, accessories, and community support available for the Pi 4 makes it the easiest board to build with as a beginner.

**What to watch out for:**
It's been on the market since 2019, so it's not the fastest option anymore. Web browsing with lots of tabs open can feel sluggish. It requires a 5V/3A USB-C power supply — most decent phone chargers or power banks handle this, but very cheap ones may not deliver enough power, which causes random crashes and throttling *(the computer slowing itself down to avoid overheating)*.

**Price:** ~$35 (2GB), ~$55 (4GB), ~$75 (8GB). Secondhand Pi 4s go for $25–40 on eBay and Facebook Marketplace.

**Good for:** First builds, writerdecks, offline media decks, general-purpose portable computers, learning Linux. This is what most TikTok cyberdeck builders are using.

### Raspberry Pi 5

**More power, more heat, more options.**

The Pi 5 uses a newer processor (Cortex-A76 cores at 2.4 GHz) that's roughly 2–3 times faster than the Pi 4 in most real-world tasks. Web browsing is noticeably smoother, apps launch faster, and it can handle heavier workloads like compiling code or running local AI models without grinding to a halt. It also adds a PCIe connector *(a high-speed data interface)* that lets you attach an NVMe SSD *(a fast solid-state drive)* for dramatically faster storage — boot times drop from 30+ seconds on a microSD card to under 10 seconds on NVMe.

The Pi 5 comes in 2GB, 4GB, 8GB, and 16GB RAM versions. For cyberdecks, 4GB or 8GB covers almost everything.

**What's great about it for cyberdecks:**
Speed. If you want your deck to feel snappy and responsive — especially for web browsing or running multiple apps — the Pi 5 is a big step up from the Pi 4. It also has a real-time clock *(a small clock circuit that keeps time even when the board is powered off)*, which is useful for decks that go offline for long periods, and a hardware power button, which lets you do a clean shutdown instead of pulling the plug.

**What to watch out for:**
It draws more power (5–10 watts under load) and runs hotter than the Pi 4. Battery life will be shorter with the same power bank, and you'll need active cooling *(a small fan)* or at minimum a heatsink to keep temperatures in check. The official Raspberry Pi Active Cooler (~$5) or the Pi 5 case with built-in fan are both good options. It also requires a beefier power supply: 5V/5A (27 watts) via USB-C. The official Raspberry Pi power supply costs about $12 and is worth buying to avoid headaches. Most standard phone chargers and power banks will not deliver 5A — check the label.

Because it's newer, some older Pi 4 accessories (certain cases, a few HATs) may not fit or work without modification. Most things are compatible, but check before buying.

**Price:** ~$50 (2GB), ~$60 (4GB), ~$80 (8GB), ~$120 (16GB).

**Good for:** Builds where you want laptop-like responsiveness, decks that will be plugged in more than they're on battery, coding workstations, media centers, and anyone who found the Pi 4 too slow for their use case.

### Raspberry Pi Zero 2 W

**Tiny, cheap, sips power — but limited.**

The Zero 2 W is the smallest Raspberry Pi you'd want to build a cyberdeck around. It's about half the size of a stick of gum, costs $15, and draws as little as 0.7 watts at idle (up to about 3 watts under load). That means incredible battery life — a small power bank can run it for a day or more.

It has a quad-core processor (Cortex-A53 at 1 GHz) and 512MB of RAM. That's enough for a terminal-based writerdeck, a music player, a dedicated e-reader, or a lightweight server — but it struggles with graphical desktops and web browsing. Wi-Fi and Bluetooth are built in.

**What to watch out for:**
The ports are small. Video output is mini-HDMI, and the USB port is micro-USB OTG *(meaning you'll need an adapter to plug in a regular USB keyboard or other device)*. The GPIO header comes unpopulated *(the holes are there but no pins are soldered in)*, so you'll need to solder a header on yourself if you want to connect HATs *(add-on boards that stack on top of the Pi)* or other GPIO accessories. Soldering a pin header is a good beginner soldering project — it takes about 10 minutes and there are many video tutorials — but it is an extra step.

512MB of RAM is tight. Running Raspberry Pi OS with a full desktop will work but feel cramped. Many Zero 2 W builders run Raspberry Pi OS Lite *(a version without a graphical desktop — you interact through a text terminal only)* and configure it to boot directly into a single application, like a word processor or music player. This makes the device feel like a dedicated tool rather than a general computer.

**Price:** ~$15.

**Good for:** Ultra-compact builds (Polly Pocket decks, Altoids tin decks, brooch cases), dedicated single-purpose devices, builds where battery life is the top priority, and projects where the computer needs to be as small as possible.

### Raspberry Pi 500

**The keyboard is the computer.**

The Pi 500 is a Raspberry Pi 5 built into a keyboard — all-in-one, no separate board to deal with. Plug in a screen, a mouse, and power, and you're running. It costs $90 for the 8GB version and comes with passive cooling (no fan needed — the aluminum body acts as a heatsink). There's also a Pi 500+ at $200 with 16GB of RAM, a pre-installed 256GB NVMe SSD, and a mechanical keyboard.

**For cyberdecks specifically**, the Pi 500 is a mixed bag. It's great if your deck design can accommodate a keyboard-shaped computer — some builders have built cases around the Pi 500 directly. But the form factor doesn't fit into compact enclosures like purses, tins, or toys the way a standalone board does. Think of it as a ready-made cyberdeck for people who want a portable Linux machine without the fabrication.

**Price:** ~$90 (Pi 500), ~$200 (Pi 500+).

**Good for:** Builders who want a complete, no-assembly-required portable computer, classroom or workshop settings, and deck designs built around a full-size keyboard.

### Quick Comparison

| Board | Processor | RAM | Power draw | Price | Best for |
|---|---|---|---|---|---|
| **Pi 4 (4GB)** | Cortex-A72 · 1.5 GHz | 4GB | 3–7W | ~$55 | First builds, most decks |
| **Pi 5 (4GB)** | Cortex-A76 · 2.4 GHz | 4GB | 5–10W | ~$60 | Speed-sensitive builds |
| **Pi Zero 2 W** | Cortex-A53 · 1.0 GHz | 512MB | 0.7–3W | ~$15 | Tiny/ultra-compact builds |
| **Pi 500** | Cortex-A76 · 2.4 GHz | 8GB | ~5–10W | ~$90 | All-in-one keyboard decks |

## Beyond Raspberry Pi

The Pi is the default, but it's not the only option. Here's when you might want to look elsewhere, and what's worth looking at.

### When a Pi Isn't Enough

A few scenarios where an alternative board makes sense:

**You need to run Windows or x86 software.** The Raspberry Pi runs Linux (and technically some other operating systems), but it uses ARM processors *(a different chip architecture than what most laptops and desktops use)*. If you need to run Windows, or software that only works on x86 processors *(the kind in most Intel and AMD computers)*, you'll need an x86-based board. This is relevant for people who want to run specific commercial software, certain security tools, or Windows-only applications.

**You need significantly more processing power.** For tasks like local AI inference, running large language models, heavy data processing, or high-resolution video work, the Pi's processors top out. Boards with Rockchip RK3588 processors or Intel N-series chips offer noticeably more headroom.

**You can't find a Pi in stock.** Pi availability has improved since the shortage years of 2021–2023, but stock still varies by region. If you can't find what you need at a fair price, alternatives are worth exploring.

### Orange Pi

Orange Pi makes a range of boards that look and feel similar to Raspberry Pi boards, often at lower prices. The **Orange Pi 5** (Rockchip RK3588S processor, up to 16GB RAM, ~$60–90) is a popular choice for builders who want more processing power than the Pi 5 offers. It supports NVMe storage, has decent community support, and runs Ubuntu and Debian.

The tradeoff: the software ecosystem and community are smaller than the Pi's. You'll find fewer tutorials, fewer beginner guides, and less plug-and-play accessory support. If something doesn't work out of the box, you may need to dig deeper into forums and documentation to find answers. Orange Pi is a good choice for builders who are comfortable with Linux and don't mind doing some troubleshooting.

### Radxa

Radxa's **Rock 5B** (RK3588, up to 16GB RAM, ~$80–150) is another powerful alternative that competes with the Orange Pi 5. It has PCIe 3.0 *(faster than the Pi 5's PCIe 2.0)* for NVMe storage, dual 2.5 Gigabit Ethernet, and strong GPU capabilities. Community support has been growing steadily.

Like Orange Pi, Radxa boards are best for builders who already have some Linux experience and are comfortable reading technical documentation.

### LattePanda

LattePanda boards run **Intel x86 processors**, which means they can run full Windows, Ubuntu, and any software you'd run on a regular laptop. The **LattePanda Iota** (Intel N150, 8GB RAM, ~$130–160) is a compact option, and the older **LattePanda Delta** and **LattePanda 3 Delta** are available secondhand.

The upside is full software compatibility — if it runs on your laptop, it'll run on a LattePanda. The downside is higher power consumption (15–25 watts under load, compared to 5–10 for a Pi), which means shorter battery life and the need for beefier power supplies. They also generate more heat and often need active cooling. These boards make sense for builders who specifically need x86 compatibility and are building decks that will spend most of their time plugged in.

### Framework Mainboard

Framework makes modular, repairable laptops and sells their mainboards *(the core circuit board from their laptops)* separately for use in custom projects. A Framework mainboard gives you a full Intel laptop processor, NVMe storage, Thunderbolt/USB4 ports, and integrated power management — at the cost of being significantly more expensive ($200–400+ depending on generation) and larger than a Pi.

Several impressive cyberdeck builds use Framework boards, including [Brickbot's open-source Framedeck](https://github.com/brickbots/framedeck) and [Penk Chen's circular-screen build](https://www.tomshardware.com/news/framework-mainboard-modular-circular-cyberdeck). These are advanced builds, but Framework publishes full technical documentation, CAD models, and pinouts to help. Worth considering if you want a deck with genuine laptop-class performance, or if you have a retired Framework laptop whose mainboard deserves a second life.

### Old Laptops

This isn't an SBC, but it's worth mentioning: you can build a cyberdeck out of a laptop you already own. Strip it down to the mainboard, screen, and keyboard, design a new enclosure, and you have a cyberdeck with all the processing power of whatever laptop it was. This costs nothing (if you already have the laptop) and lets you run whatever operating system the laptop originally supported.

The downsides are size (laptop mainboards are bigger than SBCs), power consumption, and heat. But if you have an old laptop collecting dust and you're drawn to the fabrication side more than the electronics side, this is a legitimate path.

## What Actually Matters for Cyberdecks

With all these options, here's a framework *(no pun intended)* for thinking through the decision. The factors that matter most for cyberdeck builds specifically, in rough priority order:

**Community and documentation.** When you're stuck at 11pm trying to figure out why your screen is showing garbled colors, the size and friendliness of the community around your board matters more than its clock speed. The Raspberry Pi wins here by a wide margin. This alone is reason enough to pick a Pi for your first build.

**Power consumption.** A board that draws 3 watts will give you three times the battery life of one that draws 9 watts, all else being equal. If your deck is portable, power consumption drives your battery size, your case's thermal design *(how it handles heat)*, and whether you need a fan. Lower is almost always better for portable builds.

**Physical size.** If you're building inside a Polly Pocket compact, a Pi Zero 2 W is your only realistic option. If you're building in a Pelican case, any board will fit. Measure your enclosure before you buy your board.

**Software compatibility.** If you need to run specific software, check that it's available for your board's processor architecture *(ARM vs. x86)* and operating system. Most open-source software and all the common cyberdeck tools (Obsidian, FocusWriter, Kiwix, VLC, terminal emulators) run on ARM Linux without issue.

**Performance.** For most cyberdeck use cases — writing, reading, music, light coding, terminal work — even a Pi Zero 2 W is fine. Performance only becomes a deciding factor if you want smooth web browsing with modern sites (Pi 4 minimum, Pi 5 preferred), local AI inference (Pi 5 or RK3588-based boards), or video editing (consider a laptop mainboard or LattePanda).

**Price.** SBCs range from $15 to $400+. A $55 Pi 4 can do almost everything a cyberdeck needs to do. Spending more gets you speed, not capability — and that extra budget might be better spent on a nicer screen, a better keyboard, or a more interesting case.

## The Recommendation

If you're building your first cyberdeck: **get a Raspberry Pi 4 with 4GB of RAM.** It's affordable, well-documented, runs everything you need, and the community will be there when you get stuck. You can always swap in a different board later — the screen, keyboard, power, and case from your first build will mostly carry over.

If you've built a deck before and want more speed: **get a Raspberry Pi 5 with 4GB or 8GB of RAM**, and budget for the official power supply and a small fan.

If your build needs to be very small: **get a Raspberry Pi Zero 2 W** and plan for a text-based or single-app interface.

If you specifically need Windows or x86 software: **look at LattePanda** or a **secondhand Framework mainboard**, and plan for higher power consumption and active cooling.

Everything else — Orange Pi, Radxa, Banana Pi, ODROID — is worth exploring once you know what you're doing and have a specific reason to leave the Pi ecosystem. They're good boards. They're not beginner boards.

## Further Reading

- [Raspberry Pi buying guide](https://www.raspberrypi.com/products/) — Official product pages with current specs and pricing
- [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) — Covers SBC selection in the context of a full build
- [Alexine's beginner cyberdeck guide](https://jalexine.github.io/lab/build-your-first-cyberdeck.html) — Beginner-friendly component guidance
- [Brickbot's Framedeck](https://github.com/brickbots/framedeck) — Open-source Framework mainboard cyberdeck with full documentation
- [awesome-cyberdeck on GitHub](https://github.com/DayZedAndConfused762/awesome-cyberdeck) — Curated list of components, builds, and resources
- [Your First Cyberdeck: A Beginner's Guide](/wiki/your-first-cyberdeck) — Start here if you haven't yet
- [What Is a Cyberdeck?](/wiki/what-is-a-cyberdeck) — History, culture, and the 2026 TikTok wave
