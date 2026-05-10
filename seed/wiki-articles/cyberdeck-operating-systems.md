# Operating Systems for Your Cyberdeck

Your cyberdeck's operating system — the software layer that makes the hardware do things — shapes what the device feels like to use more than almost any other choice you'll make. The same Raspberry Pi with the same screen and the same keyboard can feel like a clunky little laptop, a dedicated writing machine, a retro terminal, or something that looks and behaves like a device you invented, depending entirely on what software you put on it and how you configure it.

This article covers the main operating system options for cyberdeck builds, how to think about choosing between them, and — maybe most usefully — how to use kiosk mode and window manager configuration to make your deck feel like it's running a custom OS, even though it's running standard Linux underneath.

## A Quick Orientation

Almost every cyberdeck runs some version of **Linux** — a free, open-source operating system. If you've never used Linux before, here's the thirty-second version: Linux is an alternative to Windows and macOS. It's free, it's maintained by a global community, and it comes in many "distributions" *(versions packaged with different default software and visual styles — the way chocolate ice cream and vanilla ice cream are both ice cream)*. You interact with it either through a graphical desktop (windows, icons, a mouse pointer — like what you're used to) or through a terminal (a text-based interface where you type commands).

Linux runs on Raspberry Pi and most other single-board computers *(SBCs — the small, affordable computers at the heart of most cyberdecks)*. Some boards can also run Windows or Android, but Linux is the default for good reasons: it's free, lightweight, endlessly customizable, and has a huge community of people building tools and answering questions.

You don't need to be a Linux expert to set up a cyberdeck. You'll learn as you go — and that's part of the point.

## The Main Options

### Raspberry Pi OS (the default starting point)

If you're using a Raspberry Pi, **Raspberry Pi OS** is the operating system made specifically for it by the Raspberry Pi Foundation. It comes pre-loaded with a web browser, a file manager, a terminal, a text editor, and basic productivity tools. It's based on Debian *(one of the oldest and most stable Linux distributions)*, which means almost any software that runs on Debian will run on Pi OS.

It comes in two versions:

**Raspberry Pi OS (Desktop)** includes a full graphical desktop environment — taskbar, start menu, windows you can drag around, desktop wallpaper. This is the friendliest starting point if you've never used Linux. You install it with the [Raspberry Pi Imager](https://www.raspberrypi.com/software/) tool, boot up, and you're looking at something that feels roughly familiar if you've used Windows.

**Raspberry Pi OS Lite** is the same operating system but without the graphical desktop. When you boot it, you see a text terminal — a blinking cursor on a dark screen, waiting for you to type commands. This sounds intimidating, but it has a real advantage for cyberdecks: it's faster, uses less memory, and uses less battery. If your deck is a dedicated device (a writing machine, a music player, an e-reader), you probably don't need a full desktop environment — you need one app, running well. Lite is the foundation for that.

**Good for:** First builds, general-purpose decks, anyone who wants the smoothest setup experience with the most available documentation.

### Ubuntu and Ubuntu Server

**Ubuntu** is one of the most popular Linux distributions in the world. The desktop version gives you a polished graphical environment with a dock, an app store, and a modern look. The server version (no graphical desktop) is leaner and popular for headless setups *(running without a screen attached — like a portable server you SSH into from another device)*.

Ubuntu runs on Raspberry Pi 4 and 5, as well as many other SBCs. Its main advantage over Raspberry Pi OS is a larger general-purpose software library and more corporate/professional support. Its main disadvantage for cyberdecks is that it's heavier — it uses more memory and processing power, which matters on small boards.

**Good for:** Builders who already know Ubuntu, decks built on non-Pi boards (where Pi OS isn't available), and server-oriented builds.

### Manjaro and Arch Linux

**Arch Linux** is a do-it-yourself distribution where you build your system from the ground up, choosing every component. **Manjaro** is based on Arch but comes pre-configured so you don't have to assemble everything yourself. Both use a "rolling release" model *(updates arrive continuously rather than in big version jumps)*, which means you always have the latest software.

These are popular among experienced Linux users and cyberdeck builders who want deep control over their system. The Arch wiki ([wiki.archlinux.org](https://wiki.archlinux.org)) is one of the best-documented resources in all of Linux — even if you're not running Arch, the wiki often has the best explanation of how something works.

**Good for:** Builders who want maximum customization and are comfortable reading documentation. Not the best first-time Linux experience, but a great second or third build.

### DietPi

**DietPi** is an extremely lightweight Linux distribution designed specifically for single-board computers. It strips out everything unnecessary and gives you a menu-driven setup tool to install only the software you want. A fresh DietPi installation uses as little as 30MB of RAM — compared to 300–500MB for Raspberry Pi OS Desktop.

This makes it excellent for cyberdeck builds where you want every bit of performance and battery life, or where you're running on a low-powered board like the Pi Zero 2 W *(which has only 512MB of memory)*. The tradeoff is fewer defaults — you're expected to know what you want to install, or be willing to figure it out.

**Good for:** Performance-sensitive builds, Pi Zero 2 W builds, builders who want a minimal starting point.

### Specialty Distributions

A few distributions are worth knowing about for specific cyberdeck use cases:

**Kali Linux** is designed for security testing and network analysis. It comes pre-loaded with hundreds of security tools. Some cyberdeck builders install Kali for portable penetration testing setups. It runs on Raspberry Pi but is not beginner-friendly — the tools it includes can be misused, and the documentation assumes you already understand networking and security concepts.

**RetroPie / Lakka / Batocera** are gaming-focused distributions that turn your Pi into a retro game console, complete with a controller-friendly interface and emulators for classic systems. If your cyberdeck is primarily a portable gaming machine, these give you a polished experience out of the box.

**LibreELEC** turns your Pi into a media center running Kodi. If your deck is a portable movie player or music station, this is a streamlined option.

## Making It Feel Like Yours: Kiosk Mode

Here's where things get interesting — and where a cyberdeck stops feeling like "a small Linux laptop" and starts feeling like *a device you designed*.

### What Kiosk Mode Is

Kiosk mode is a configuration technique where your deck boots directly into a single application, fullscreen, with no desktop, no taskbar, no window borders, and no visible operating system. The user *(you, or whoever you hand the deck to)* sees only the application. The application *is* the device.

You've encountered kiosk mode in the wild without knowing it. Airport flight information screens, museum interactive displays, self-checkout machines at the grocery store, and digital menu boards at restaurants are all computers running a single app in kiosk mode. The point is that the underlying operating system is invisible — the device feels purpose-built, even though it's running standard hardware and software underneath.

For cyberdecks, kiosk mode is powerful because it lets you create the **feeling of a custom operating system** without actually writing one. Your writerdeck boots straight into FocusWriter with no browser, no file manager, no distractions — turn it on, start typing. Your music deck boots into a fullscreen player. Your offline-Wikipedia deck boots into Kiwix. The experience is the app, and the app is the experience.

### How to Set It Up

There are a few approaches, from easiest to most customizable.

**Approach 1: Raspberry Pi OS Lite + a single graphical app**

This is the most common cyberdeck kiosk setup. You install Raspberry Pi OS Lite (no desktop), then configure it to start a minimal graphical environment that launches a single app fullscreen.

The broad steps:

1. Install Raspberry Pi OS Lite using the [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. Boot into the text terminal and install a minimal window system and your app. For example, to set up a fullscreen web browser (useful for dashboards, local web apps, or Kiwix):

```
sudo apt update
sudo apt install xserver-xorg x11-xserver-utils xinit chromium-browser unclutter
```

3. Create a startup script that launches the browser in kiosk mode *(fullscreen, no toolbars, no way to exit to a desktop — because there is no desktop)*:

```
nano ~/kiosk.sh
```

Put this in the file:

```
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.5 -root &
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:8080
```

The first three lines prevent the screen from going to sleep. The `unclutter` line hides the mouse cursor after half a second of inactivity. The last line opens Chromium *(the open-source browser that Chrome is based on)* in kiosk mode, pointed at whatever URL you want — a local web app, a dashboard, Kiwix, or anything else.

4. Configure the system to run this script automatically on boot by adding `xinit /home/pi/kiosk.sh` to your `.bashrc` or creating a systemd service.

When you turn on your deck, it goes from power-on to fullscreen app in about 15–30 seconds. No login screen, no desktop, no menus. It *feels* like a custom device.

**Approach 2: Raspberry Pi OS Lite + a terminal app**

Even simpler. If your app is terminal-based *(text-only, no graphical interface)* — like WordGrinder for writing, or cmus for music — you don't need a graphical environment at all. You configure the Pi to auto-login to the terminal and auto-launch your app.

1. Install Raspberry Pi OS Lite.
2. Enable auto-login: run `sudo raspi-config`, go to System Options → Boot / Auto Login, and select "Console Autologin."
3. Edit your `~/.bashrc` file *(a script that runs every time you open a terminal)* and add your app at the bottom:

```
# Launch WordGrinder on boot
wordgrinder
```

Now your deck boots straight into a fullscreen word processor. No desktop, no distractions, no visible operating system. Turn it on, wait fifteen seconds, start writing. This is how many TikTok writerdeck builders set up their machines.

**Approach 3: A web app you built yourself**

This is where kiosk mode gets really exciting. Because the browser can display *any* web page, you can build a custom interface using HTML, CSS, and JavaScript, serve it locally from the Pi, and have kiosk mode display it fullscreen. Your deck boots into an interface you designed — your colors, your layout, your buttons, your fonts.

Many cyberdeck builders create custom dashboards this way: a start screen with the time, weather, battery level, and launcher buttons for different apps. From the outside, it looks like a bespoke operating system. Underneath, it's a Chromium browser showing a local web page.

Some builders use frameworks like [Next.js](https://nextjs.org/), [Svelte](https://svelte.dev/), or plain HTML to create these interfaces. If you know a bit of web development — or want to learn — this is one of the most rewarding cyberdeck projects you can take on.

### What Kiosk Mode Feels Like in Practice

The psychological difference between a deck running a standard Linux desktop and a deck running kiosk mode is enormous. A desktop says "this is a small, awkward computer." A kiosk-mode device says "this is a purpose-built machine that does one thing well." It changes how you relate to the device and how you use it.

Some builders take this further by customizing the boot sequence: replacing the default Raspberry Pi boot logo with their own image *(a custom splash screen)*, hiding the boot text *(the scrolling log messages that appear while Linux starts up)*, and going straight from logo to app. The result is a device that feels like it has its own firmware — like a Game Boy or a Kindle — even though it's a $55 Raspberry Pi running Debian.

If you want to hide the boot text and add a custom splash screen, look into **Plymouth** — a boot splash manager that comes with most Linux distributions. The Raspberry Pi also has a simple config option: add `disable_splash=1` and `quiet` to `/boot/config.txt` and `/boot/cmdline.txt` respectively to suppress the default Pi logo and boot log.

## Window Managers: The Middle Ground

Kiosk mode is great for single-purpose decks, but what if you want your deck to do multiple things — writing, browsing, music, terminal — while still feeling intentional and custom? That's where tiling window managers come in.

### What's a Window Manager?

A window manager is the part of the operating system that controls how application windows are arranged on your screen. The default desktop environment on Raspberry Pi OS (called LXDE) gives you floating windows that you can drag around, resize, overlap, and minimize — like Windows or macOS. A **tiling window manager** takes a different approach: it automatically arranges windows in a grid so they never overlap, and you navigate between them using keyboard shortcuts instead of a mouse.

On a small cyberdeck screen (5–7 inches), tiling window managers are practical in a way they aren't on a normal monitor. You're not going to be dragging and resizing tiny windows with a trackpad on a 5-inch display — it's frustrating. But snapping windows into tiles with a keyboard shortcut? That works well, even at small sizes.

### i3 and Sway

The two most popular tiling window managers for cyberdecks are **i3** (for older display systems) and **Sway** (a modern replacement that's nearly identical in configuration and usage). Both are controlled almost entirely by keyboard shortcuts, configured through a single text file, and designed to be minimal — they use very little memory and processing power.

Out of the box, i3/Sway gives you a blank screen with a thin bar at the bottom showing your workspaces *(virtual desktops you switch between)* and system info (time, battery, network). You press a key combo to open a terminal, another to launch an app, another to move windows between tiles. There's no start menu, no icons, no desktop wallpaper by default.

This sounds spartan, but that's the point — you add exactly what you want and nothing else. Many cyberdeck builders customize their i3/Sway setup with:

- **A custom status bar** (using Waybar or Polybar) showing battery percentage, CPU temperature, Wi-Fi status, and the current date/time — styled with custom colors and fonts
- **Custom keybindings** that launch specific apps with specific key combos — your deck, your shortcuts
- **A color scheme** that matches the aesthetic of your build — amber-on-black for a retro terminal feel, pastels for cottagecore, pink and lavender for something femme
- **A custom wallpaper** and app launcher (using wofi or rofi) that ties the look together

The result is a desktop environment that looks and feels nothing like a standard Linux desktop. It looks like something you designed, because you did. The learning curve is real — plan to spend an afternoon reading documentation and experimenting — but the payoff is a deck that feels genuinely personal.

**Installing i3 on Raspberry Pi OS:**

```
sudo apt install i3 i3status i3lock dmenu
```

Then log out, select "i3" from the session menu on the login screen, and log back in. i3 will walk you through initial setup (choosing your modifier key).

**Installing Sway on Raspberry Pi OS:**

```
sudo apt install sway waybar wofi
```

Launch it from the terminal with `sway`. Sway is the Wayland-native option *(Wayland is the modern display protocol replacing the older X11 system)* — it's the future-facing choice, though i3 is more battle-tested and has more tutorials available.

### Other Window Managers Worth Knowing

**Openbox** — A floating window manager (not tiling) that's extremely lightweight. It gives you right-click menus, window decorations, and a more traditional feel, but uses far less memory than a full desktop environment. Good middle ground between a full desktop and a tiling WM.

**dwm** — An even more minimal tiling window manager than i3. Configured by editing C source code and recompiling, which makes it the most customizable option and also the least beginner-friendly. Popular among experienced Linux users who want absolute control.

**Hyprland** — A newer Wayland compositor with built-in animations, rounded corners, and visual polish. Heavier than Sway but much prettier out of the box. Worth considering if aesthetics matter to you and your board has enough processing power (Pi 5 recommended).

## Choosing What's Right for Your Deck

Here's a practical decision tree:

**"I'm building my first deck and want the easiest path."**
→ Install Raspberry Pi OS Desktop. Use it as-is. You can always change later.

**"I'm building a dedicated device that does one thing (writing, music, reading, dashboard)."**
→ Install Raspberry Pi OS Lite. Set up kiosk mode with your app. This gives you the fastest boot, the longest battery life, and the most satisfying single-purpose feel.

**"I want my deck to do several things but I want it to feel intentional and custom, not like a clunky mini-laptop."**
→ Install Raspberry Pi OS Lite or Desktop, then install i3 or Sway. Spend an afternoon configuring it. The result will feel like yours.

**"I want to build a custom interface from scratch."**
→ Install Raspberry Pi OS Lite + a kiosk-mode browser pointed at a local web app you build. This is the path to a truly bespoke device experience.

**"I want maximum performance from a tiny board."**
→ DietPi, configured to run only what you need.

**"I want a retro gaming machine."**
→ RetroPie or Batocera.

There's no wrong answer here, and you can reinstall a different operating system in about ten minutes by re-imaging your microSD card *(copying a fresh operating system onto the card with Pi Imager)*. Experimenting is cheap. Try things.

## Software Worth Installing

Regardless of which OS and configuration you choose, here's a collection of software that cyberdeck builders commonly use, organized by what your deck is for:

**Writing:** FocusWriter (graphical, distraction-free), WordGrinder (terminal-based), Obsidian (notes and knowledge management), Vim/Neovim (terminal text editors with a steep but rewarding learning curve), [WareWoolf](http://www.writerdeck.org/) and [ZeroWriter](http://www.writerdeck.org/) (writerdeck-specific open-source apps)

**Offline content:** Kiwix (offline Wikipedia, Project Gutenberg, Wiktionary, and more — [kiwix.org](https://www.kiwix.org/)), Calibre (e-book library management)

**Music:** cmus (terminal-based music player — lightweight and keyboard-driven), VLC (plays everything), MPD + ncmpcpp (a server/client music setup that's popular among tiling-WM users)

**Coding:** Vim/Neovim, VS Code (runs on Pi 4 and 5 but is heavy), Micro (a terminal editor that feels like a normal text editor — ctrl+s to save, ctrl+q to quit)

**System monitoring:** htop (shows what's running and how much memory/CPU is being used), Waybar or Polybar (status bars for tiling window managers), Conky (a desktop widget that displays system info)

**Networking:** Tailscale (creates a private network between your devices — lets you SSH into your deck from your phone or laptop), nmap (network scanning), Meshtastic (off-grid mesh messaging, if your deck has a LoRa radio)

**Retro terminal feel:** cool-retro-term (a terminal emulator that looks like a vintage CRT monitor — fun for the aesthetic, if you have the processing power to spare)

## Further Reading

- [Raspberry Pi software setup](https://www.raspberrypi.com/software/) — Download Pi Imager and operating system images
- [Raspberry Pi documentation](https://www.raspberrypi.com/documentation/) — Official guides for configuring Pi OS
- [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) — Covers software setup in context
- [writerdeck.org](http://www.writerdeck.org/) — Software resources for writerdeck builds
- [i3 user guide](https://i3wm.org/docs/userguide.html) — Official i3 window manager documentation
- [Sway wiki](https://github.com/swaywm/sway/wiki) — Setup and configuration for Sway
- [awesome-cyberdeck on GitHub](https://github.com/DayZedAndConfused762/awesome-cyberdeck) — Curated list of cyberdeck software and resources
- [DietPi](https://dietpi.com/) — Lightweight Linux for SBCs
- [Your First Cyberdeck: A Beginner's Guide](/wiki/your-first-cyberdeck) — Full build walkthrough
- [Choosing the Right Single-Board Computer](/wiki/choosing-the-right-single-board-computer) — Hardware decision guide
