# Input Devices for Cyberdeck Builds

How you interact with your cyberdeck — how you type, how you move a cursor, how you scroll, how you navigate — shapes how the device feels to use more than almost anything else. A deck with a great screen and a terrible keyboard is frustrating. A deck with a mediocre screen and a keyboard you love is a joy.

This article covers every category of input device you might put in a cyberdeck: keyboards, pointing devices (trackpads, trackballs, mice), touchscreens, rotary encoders, and some less conventional options. The goal is to help you figure out what matters for your build and what tradeoffs you're making with each choice.

## Keyboards

The keyboard is the primary input device for most cyberdecks — the thing your hands touch most. Your options range from full-sized mechanical keyboards down to thumbnail-sized thumb boards, and the right choice depends entirely on your enclosure size, what you're using the deck for, and how much typing comfort matters to you.

### Mini Wireless Keyboards with Trackpad

**The easiest starting point.**

These are the small, flat, rectangular keyboards (about the size of a TV remote) that include a built-in touchpad *(a flat surface you drag your finger across to move the cursor)*. They connect wirelessly via a tiny USB dongle *(a small plug that sticks out of a USB port)* and work immediately with any Raspberry Pi — no setup needed.

**What's good:** Cheap ($12–25), zero configuration, keyboard and pointing device in one unit, thin enough to fit in most enclosures. Many TikTok cyberdeck builders use these because they let you go from unboxing to working deck in minutes.

**What's not great:** The keys are small and mushy. If you're doing a lot of typing (a writerdeck, for instance), you'll feel the limitations within an hour. The trackpads tend to be imprecise. Build quality varies — the best-reviewed options are the Rii i8+ and the Logitech K400 (larger, but much nicer to type on).

**Good for:** First builds, general-purpose decks, builds where keyboard size needs to be minimal, and anyone who wants "it works" without fuss.

### Mechanical Keyboards

**Better typing, bigger footprint.**

Mechanical keyboards use individual mechanical switches under each key instead of a membrane sheet. They feel noticeably better to type on — each keypress has a defined click point, and you can type faster and more accurately once you're used to them. The cyberdeck and writerdeck communities are deeply intertwined with the mechanical keyboard hobby.

**Sizes that work for cyberdecks:**

- **40% keyboards** (about 30–40 keys) — The most compact option. They fit in small cases but require extensive use of layers *(holding a key to access numbers, symbols, and function keys on the same physical keys)*. The Gherkin, Planck, and similar layouts are popular. If you've never used a 40% keyboard, expect a learning curve of a few days.

- **60% keyboards** (about 60 keys) — No function row, no numpad, no arrow keys (arrows are on a layer). This is the sweet spot for many cyberdeck builds — compact enough to fit in a mid-sized case, complete enough to type comfortably without constantly hunting for layers. Popular options include the Keychron K12, Akko 3068, and various budget 60% boards.

- **65–75% keyboards** (65–80 keys) — Adds dedicated arrow keys and sometimes a function row. Larger, but much more comfortable for extended typing. If your enclosure is big enough (a Pelican case, a large lunchbox, a briefcase), this is the most comfortable option.

**Wired vs. wireless:** Wired (USB) is more reliable and doesn't need charging. Wireless (Bluetooth or 2.4 GHz dongle) is cleaner for cable management. For a cyberdeck where the keyboard is permanently inside the case, wired makes sense — the cable is hidden. For a removable keyboard, wireless is more convenient.

**Thrift store keyboards:** Goodwill and similar stores often have USB keyboards for $3–10. They won't be mechanical, but they're functional, available immediately, and cost almost nothing. The [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) recommends checking thrift stores before buying new.

**Good for:** Writerdecks, any build where you'll type for extended periods, builders who care about how typing feels.

### Ultra-Compact and Specialty Keyboards

For very small builds — Polly Pocket compacts, Altoids tins, brooch cases — standard keyboards don't fit. Here's what people use instead.

**M5Stack CardKB** (~$15) — A credit-card-sized QWERTY keyboard with 50 tiny keys. It connects over I2C *(a type of wired communication protocol that uses just two signal wires)*, not USB, which means it requires a small driver script to work with the Raspberry Pi. [Ian AntKing's cardkb script on GitHub](https://github.com/ian-antking/cardkb) handles this and runs as a background service. The keys are very small — you'll be thumb-typing or pecking with fingertips. Typing speed is limited, but for a device where compactness is everything, it's one of the only options. M5Stack also recently previewed the **CardKB2** and the **CardputerZero**, a complete handheld Pi-based system with an integrated keyboard.

**BlackBerry keyboards (Q10, Q20)** — Salvaged from old BlackBerry phones. These tiny QWERTY keyboards are surprisingly nice for thumb-typing and have a devoted following in the cyberdeck and handheld Linux communities. Using one requires soldering the keyboard's ribbon cable to a breakout board and writing or installing a driver to translate key presses into Linux input events. This is a moderate-difficulty project, but there are well-documented guides. The BlackBerry Q10 keyboard is the most commonly used and can be found on AliExpress or eBay for $5–15.

**Repurposed device keyboards** — Some builders salvage keyboards from old PDAs, calculators, or portable game consoles. The Sharp PC-G801's membrane keyboard, various TI calculator keypads, and Game Boy button layouts have all been repurposed for cyberdeck builds. These require custom wiring and firmware, typically using an Arduino or similar microcontroller *(a small programmable chip)* to translate button presses into USB keyboard signals.

**Good for:** Ultra-compact builds, Pi Zero 2 W builds, builds where the keyboard is secondary to another input method (touchscreen, rotary encoder).

### The Keyboard-Is-the-Computer Option

The **Raspberry Pi 400 and 500** are complete computers built into keyboards. If your cyberdeck design puts the keyboard at the center and everything else (screen, battery, case) is attached to it, these can save you the trouble of sourcing a separate keyboard and board. The Pi 500 especially — with its aluminum heatsink body and mechanical key switches (in the 500+ model) — is a solid starting point for a keyboard-centric build.

**Lenovo ThinkPad USB keyboards** with TrackPoint *(the small red nub in the center of the keyboard that acts as a pointing device)* are another popular "keyboard with pointer built in" option. They're full-sized and well-built, and the TrackPoint means you don't need a separate mouse or trackpad. Available new (~$60) or used (~$20–30).

## Pointing Devices

Unless your deck has a touchscreen, you need some way to move a cursor around the screen. Here are your options.

### Touchscreens

The most direct input method — you tap and drag on the screen itself. Many Raspberry Pi displays come in touchscreen versions (the official 7-inch Pi touchscreen, various Waveshare and Elecrow panels). Touchscreens eliminate the need for a separate pointing device, which saves space and reduces complexity.

**What to know:** Touchscreens work well for tapping buttons and scrolling, but they're imprecise for tasks that require pixel-level accuracy (selecting text, positioning a cursor between characters, detailed graphical work). Your finger also covers part of the screen while you're touching it, which matters more on small displays. On a 7-inch screen this is fine; on a 3.5-inch screen it can be frustrating.

**Capacitive vs. resistive:** Capacitive touchscreens *(the kind on your phone — they respond to the electrical charge in your skin)* are smoother and more responsive. Resistive touchscreens *(they respond to physical pressure — you can use them with gloves or a stylus)* are cheaper and work in more conditions but feel less precise. For cyberdecks, capacitive is generally preferable unless you need glove or stylus compatibility.

**Good for:** Builds where you want to minimize the number of separate input devices, tablet-style decks, dashboard and kiosk builds.

### Built-in Trackpads

Many mini wireless keyboards include a small trackpad. You can also buy standalone USB trackpads (Apple Magic Trackpad, Logitech T650, various generic options). A standalone trackpad gives you a larger, more accurate surface than the tiny ones built into mini keyboards.

For tiling window managers *(which are keyboard-driven and require very little mouse input)*, even a small, mediocre trackpad is sufficient — you'll mostly use it for the occasional click.

**Good for:** Builds paired with a mini wireless keyboard, tiling-WM setups where pointing is secondary.

### Trackballs

A trackball is a ball set into a housing — you roll the ball with your fingers or thumb to move the cursor, and the housing stays still. Trackballs are popular for cyberdecks because they don't need a flat surface to operate (unlike a mouse), they take up very little space, and they can be mounted permanently into a case.

**Full-size trackballs:** The Logitech Ergo M575 and Kensington Expert Mouse are well-regarded and connect via Bluetooth or USB dongle. They're too large to mount inside most cyberdeck cases, but they work well as external peripherals or for larger builds.

**Mini trackballs:** Small trackball modules designed for embedded use — like the BlackBerry-style optical trackball breakout boards available on AliExpress and Adafruit (~$5–10) — can be wired to an Arduino or directly to GPIO and embedded into a case or keyboard. These require custom firmware (typically using an Arduino Pro Micro or similar) to present as a USB HID device *(Human Interface Device — the standard protocol that lets the Pi recognize it as a mouse)*. The [blackberry-mini-trackball library on GitHub](https://github.com/LSChyi/blackberry-mini-trackball) is a good starting point.

**Keychron Nape Pro** — A new (2026) product that combines a 25mm thumb trackball with six buttons and a scroll wheel in a slim bar designed to sit alongside a keyboard. It runs ZMK firmware *(open-source keyboard/input device firmware)* and is fully customizable. This is a promising option for cyberdeck builders who want a trackball without building one from scratch.

**Good for:** Builds that need a pointing device in a small or unusual form factor, permanent case-mounted installations, use on uneven surfaces or in your lap.

### TrackPoint (Pointing Stick)

The TrackPoint — the small red nub found on ThinkPad keyboards — is a pressure-sensitive pointing device that sits between the G, H, and B keys. You push it gently in the direction you want the cursor to move. It takes a few hours to get comfortable with, but experienced users swear by it because your fingers never leave the home row.

If you're using a ThinkPad USB keyboard, you already have one. Standalone TrackPoint modules also exist and can be integrated into custom keyboards, though this is an intermediate-to-advanced project.

**Good for:** Keyboard-centric builds, writerdecks, builders who already love the TrackPoint from ThinkPad use.

### No Pointing Device at All

If your deck runs a terminal-based interface or a tiling window manager, you may not need a pointing device. Terminal applications are navigated entirely by keyboard. Tiling window managers like i3 and Sway are designed for keyboard-driven workflow — you can open, close, resize, and switch between windows without ever touching a mouse.

Many writerdeck builders deliberately omit a pointing device to reinforce the distraction-free purpose of the machine. If the only app on the deck is a fullscreen word processor, there's nothing to point at.

**Good for:** Writerdecks, kiosk-mode builds, terminal-only setups.

## Rotary Encoders and Scroll Wheels

A rotary encoder is a knob or dial that you turn to scroll, adjust values, or navigate menus. Turning it sends discrete "clicks" to the computer — each click can mean "scroll up," "next item," "increase volume," or whatever you program it to do. Many also have a push-button function (press the knob to select).

**The ANO Directional Navigation and Scroll Wheel** from Adafruit (~$5) is an iPod-style rotary encoder — a circular ring you drag your finger around, with directional input and a center button. It's popular in cyberdeck builds because it provides scrolling and directional navigation in a compact, tactile package. It requires an Arduino or microcontroller to read the signals and translate them into USB input events.

Rotary encoders are especially useful for:
- Scrolling through documents or code on a small screen (faster than dragging a trackpad)
- Navigating menus in kiosk-mode interfaces
- Adjusting volume, brightness, or other settings with a physical knob
- Adding a tactile, mechanical feel to builds that are otherwise all flat surfaces and touchscreens

Wiring a rotary encoder to an Arduino and programming it to present as a USB scroll wheel is a good beginner microcontroller project — it involves three or four wire connections and a short firmware script.

**Good for:** Builds that want a physical scrolling mechanism, kiosk and dashboard interfaces, builders who like tactile controls.

## Game Controllers and Buttons

Some cyberdecks — particularly retro gaming decks and handheld builds — use game-controller-style inputs: D-pads *(directional pads, the cross-shaped button on game controllers)*, face buttons (A/B/X/Y), and analog joysticks.

**For RetroPie / Batocera builds:** You can wire arcade-style buttons and a joystick to the Pi's GPIO using a USB encoder board (a small board that translates button presses into USB game controller input — available for $5–10 on Amazon). This lets you build a portable arcade with whatever button layout you design.

**Analog thumbsticks** (the kind from PlayStation or Xbox controllers) can be connected to an Arduino with analog-to-digital conversion and mapped to mouse movement. These are smaller than trackballs and can be mounted flush with a case surface.

**Good for:** Gaming-focused builds, handheld builds, builds targeting kids or non-technical users who find a joystick more intuitive than a keyboard.

## Putting It All Together: Input by Build Type

| Build type | Recommended input | Why |
|---|---|---|
| **First build / general purpose** | Mini wireless keyboard with trackpad | Zero setup, keyboard + pointer in one device |
| **Writerdeck** | Mechanical 60% keyboard, no pointing device | Typing comfort is everything; no pointer needed in a fullscreen text editor |
| **Ultra-compact (tin, compact, brooch)** | M5Stack CardKB or BlackBerry keyboard | The only keyboards that fit in very small enclosures |
| **Dashboard / kiosk** | Touchscreen + rotary encoder | Tap to select, turn to scroll — no keyboard needed |
| **Coding / terminal workstation** | Mechanical keyboard + trackball or TrackPoint | Long typing sessions with occasional precise pointing |
| **Retro gaming** | D-pad + face buttons via USB encoder | Controller-style input matches the use case |
| **Lap-friendly / no-desk use** | Keyboard with built-in TrackPoint or trackball | No flat surface needed for the pointing device |

## Thrifting Input Devices

Before buying new, check:

**Thrift stores:** USB keyboards ($3–10), wireless keyboards ($5–15), trackballs ($5–10), and game controllers ($3–8) show up regularly at Goodwill and similar stores. Test before you buy — plug them into your phone or a store kiosk if possible, or at minimum check that batteries aren't corroded and USB connectors aren't bent.

**Your own drawers:** Old keyboards, phone charger cables (some double as data cables for wired devices), game controllers from consoles you no longer use, and laptop trackpads from dead laptops are all potentially usable.

**eBay and AliExpress:** BlackBerry keyboards, mini trackball modules, CardKB units, and other specialty components are available cheaply. Shipping from AliExpress takes 2–4 weeks but prices are often 30–50% lower than Amazon.

## A Note on Ergonomics

On a small screen with a small keyboard, you're working in constrained space. A few things that help:

**Angle the screen.** A screen lying flat in the bottom of a case forces you to look down, which is hard on your neck. A screen angled 30–45 degrees toward you (propped up with a hinge, a kickstand, or a 3D-printed bracket) is much more comfortable for extended use.

**Elevate the keyboard slightly.** A thin foam pad or rubber feet under the front edge of the keyboard creates a gentle tilt that's more natural for your wrists.

**Take breaks.** Cyberdeck ergonomics will never match a proper desk setup. For extended work sessions, step away periodically. This isn't a failing of your build — it's physics. Small devices in constrained enclosures involve compromises, and your body deserves the same care you put into your electronics.

## Further Reading

- [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) — Covers input device selection and thrifting tips
- [CardKB Raspberry Pi driver](https://github.com/ian-antking/cardkb) — Setup guide for M5Stack CardKB on Pi
- [BlackBerry mini trackball library](https://github.com/LSChyi/blackberry-mini-trackball) — Arduino code for embedded trackball modules
- [writerdeck.org](http://www.writerdeck.org/) — Keyboard and software guidance for writing-focused builds
- [ANO rotary encoder at Adafruit](https://www.adafruit.com/product/5001) — Product page with wiring guide
- [Your First Cyberdeck: A Beginner's Guide](/wiki/your-first-cyberdeck) — Full build walkthrough
- [Thrifting & Upcycling Cyberdeck Enclosures](/wiki/thrifting-and-upcycling-cyberdeck-enclosures) — Where to find cases and input devices secondhand
