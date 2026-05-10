# Battery & Power Management for Cyberdecks

Power is the least glamorous part of a cyberdeck build, but it's the one that determines whether your deck is a portable computer or a desk ornament that needs a wall outlet. Understanding how much power your deck uses, what your options are for providing it, and how to estimate battery life takes a little bit of math — but the math is straightforward, and this article walks through all of it.

It also covers battery safety, because lithium batteries are involved in most portable builds, and lithium batteries require respect. The safety section is not optional reading. Please don't skip it.

## How Much Power Does Your Deck Use?

Every component in your cyberdeck draws power, measured in **watts** (W). A watt is a rate — how much energy something uses per second. Think of it like water flow: watts are how fast the water comes out of the tap, and the total water used over time is your battery capacity.

Here's what the major components draw:

| Component | Typical power draw |
|---|---|
| **Raspberry Pi Zero 2 W** | 0.4–3W (idle to full load) |
| **Raspberry Pi 4 (4GB)** | 3–6W (idle to full load) |
| **Raspberry Pi 5 (4GB)** | 3–10W (idle to full load) |
| **5-inch HDMI screen** | 1–2W |
| **7-inch HDMI screen** | 2–4W |
| **7-inch touchscreen** | 3–5W |
| **E-ink display** | ~0.1W (near-zero between refreshes) |
| **Mini wireless keyboard** | 0.1–0.3W |
| **Small USB fan** | 0.5–1.5W |
| **USB LED or indicator** | 0.1–0.5W |

**Your total system draw** is roughly the sum of everything running at once. A Pi 4 with a 7-inch screen and a mini keyboard under typical use draws about **6–8 watts total**. A Pi Zero 2 W with a 5-inch screen draws about **2–4 watts**. A Pi 5 with a touchscreen and active fan might draw **8–12 watts**.

These are averages — your actual draw depends on what the computer is doing. Sitting at a text editor uses less than streaming video or compiling code.

## Estimating Battery Life

The formula is simpler than it looks:

**Battery life (hours) = Battery capacity (watt-hours) ÷ System power draw (watts)**

The tricky part is that most battery packs advertise their capacity in **milliamp-hours (mAh)** at the battery cell voltage (3.7V), not in watt-hours at the 5V your Pi needs. To convert:

**Watt-hours = (mAh × 3.7V) ÷ 1000 × 0.85**

The 0.85 is an efficiency factor — about 15% of the battery's energy is lost as heat during the voltage conversion from 3.7V to 5V. It varies by power bank quality, but 85% is a reasonable estimate for decent hardware. Cheap power banks may be closer to 75%.

**Example:** A 10,000 mAh power bank has roughly (10,000 × 3.7 ÷ 1000 × 0.85) = **31.5 watt-hours** of usable energy. Powering a Pi 4 + 7-inch screen drawing 7 watts: 31.5 ÷ 7 = about **4.5 hours**.

**Example:** The same 10,000 mAh bank powering a Pi Zero 2 W + 5-inch screen drawing 3 watts: 31.5 ÷ 3 = about **10.5 hours**.

A few real-world caveats: advertised mAh ratings are sometimes optimistic (some manufacturers round up aggressively), batteries lose capacity as they age, and power draw varies with use. Treat your estimate as a ceiling, not a guarantee.

## Power Options, Ranked by Complexity

### Option 1: USB Power Bank (No Soldering, No Risk)

**The best starting point for most builders.**

A USB power bank — the same kind you'd use to charge a phone — plugs into the Pi's USB-C port and provides power. No soldering, no wiring, no battery management to think about. The bank handles charging, voltage regulation, and overcharge protection internally.

**What to look for:**

The Pi 4 needs a power supply that can deliver at least **5V at 3A (15W)**. The Pi 5 needs **5V at 5A (27W)** for full performance, though it will run at reduced USB capacity with a 15W supply. Check the label on your power bank — if it says "PD" (Power Delivery) or lists a 5V/3A output, it'll work for a Pi 4. For a Pi 5, look for a bank that explicitly supports USB-C PD at 5V/5A or higher.

The Pi Zero 2 W is much less demanding — nearly any USB power bank will run it, even small 3,000–5,000 mAh ones.

**Mounting it:** Velcro the power bank to the back or bottom of your case. Run a short USB-C cable from the bank to the Pi. Done. This is how many TikTok cyberdeck builders power their decks, and there is nothing wrong with it.

**Passthrough charging:** Some power banks support "passthrough" — they can charge themselves while simultaneously powering the Pi. This means you can plug your deck into a wall outlet to charge the bank and keep using the deck without interruption. Not all power banks support this (and some that claim to have issues with it), so check reviews before relying on this feature.

**Price:** $15–40 for a 10,000–20,000 mAh bank from a reputable brand (Anker, Baseus, Nitecore, etc.).

### Option 2: PiSugar or UPS HAT (No Soldering, Integrated)

**The cleanest integrated solution.**

A PiSugar or UPS HAT *(an add-on board that attaches directly to the Pi)* combines a lithium battery, a charging circuit, voltage regulation, and power management into a single module that mounts onto your Pi with screws or standoffs. The result is a self-contained, rechargeable computer — plug in USB-C to charge, unplug to go portable.

**PiSugar** is the most popular brand for cyberdeck builds. Current models:

- **PiSugar 3** (~$40) — For Pi Zero / Zero 2 W. Includes a 1,200 mAh battery, real-time clock *(keeps time when the Pi is off)*, UPS functionality *(keeps the Pi running briefly during power transitions)*, software-controlled shutdown, and a programmable button. With a Pi Zero 2 W at light use, expect roughly 3–5 hours of battery life.
- **PiSugar 3 Plus** (~$50) — Same features, larger 5,000 mAh battery for Pi 3/4. Expect 4–8 hours depending on load and screen.
- **PiSugar 2 Pro** (~$45) — For Pi 3/4. 5,000 mAh battery, up to 10 hours of battery life. Well-reviewed but the power switch placement can be awkward inside tight enclosures.

PiSugar modules connect through pogo pins on the underside of the Pi's GPIO header *(the row of programmable pins)*, leaving the top of the GPIO free for other accessories. No soldering required — they attach with screws.

**Other UPS HATs** worth knowing about: Waveshare UPS HAT (various models, $15–30), SunFounder PiPower, and the MakerHawk UPS Power Supply (~$30, uses standard 18650 batteries that you supply separately).

**Installing the software:** PiSugar modules work out of the box for basic power, but to see battery percentage, configure auto-shutdown, or set wake-up alarms, you install the PiSugar Power Manager software. It provides a web-based dashboard you access through your browser. Installation is one command in the terminal.

**Price:** $30–50 depending on model and battery size.

### Option 3: USB-C Power Delivery Board + Battery (Some Wiring, No Soldering Possible)

**For builders who want control over battery size and shape.**

A USB-C PD board *(a small circuit board that handles charging, voltage regulation, and protection)* paired with a standalone lithium-polymer (LiPo) battery gives you flexibility to choose your own battery size and shape. Boards like the Adafruit PowerBoost 1000C, the Pimoroni LiPo SHIM, or various AliExpress boost converter boards take a 3.7V LiPo cell and output regulated 5V for your Pi.

Some of these boards have screw terminals or JST connectors *(small two-pin plugs)* that don't require soldering — you can attach wires by tightening a screw or plugging in a connector. Others require soldering two or three wires. If this is your first time soldering, this is a very manageable project — two connections, large pads, low stakes.

This approach lets you pick a battery that fits your specific enclosure — flat pouch cells, cylindrical 18650 cells, or whatever geometry works. The tradeoff is that you're responsible for choosing compatible components, and you need to understand the safety section below.

**Price:** $10–25 for the board, $8–20 for the battery, depending on capacity.

### Option 4: Custom LiPo Build (Soldering Required, Most Flexible)

**Maximum control, maximum responsibility.**

A fully custom power setup means choosing a LiPo cell (or multiple cells), a battery management system (BMS) *(a circuit that prevents overcharging, over-discharging, and short circuits)*, a boost converter *(a circuit that steps the battery's 3.7V up to the 5V the Pi needs)*, and wiring it all together. This gives you total control over battery capacity, form factor, and charging behavior.

This is what experienced cyberdeck builders use when they want maximum battery life in a specific case shape, or when they're building a deck with unusual power requirements (multiple boards, high-draw screens, powered USB devices).

**This approach requires understanding battery safety.** Read the next section before considering it.

**Price:** $15–40 total, depending on cell size and component quality.

## Battery Safety

**This section is important. Please read it carefully.**

Most cyberdeck batteries use **lithium-polymer (LiPo)** or **lithium-ion (Li-ion)** chemistry. These batteries store a lot of energy in a small space, which is why they're great for portable devices. It also means they can be dangerous if mishandled. LiPo battery fires are real — they burn hot, they're difficult to extinguish, and they produce toxic fumes. This isn't meant to scare you away from using them; it's meant to help you use them safely.

**Always use a battery management system (BMS) or a charge controller.** Never connect a raw lithium cell to a charger or load without protection circuitry. The BMS prevents the three things that cause lithium battery failures: overcharging (voltage too high), over-discharging (voltage too low, which damages the cell internally), and short circuits (which cause rapid, uncontrolled energy release — fire). PiSugar modules, UPS HATs, and commercial power banks all have BMS circuits built in. If you're buying a standalone cell, make sure your charging board provides these protections.

**Never puncture, crush, or physically damage a lithium cell.** If a cell is puffy or swollen, it is damaged and should not be used. Do not try to "use up" a swollen battery. Dispose of it at a battery recycling drop-off (most hardware stores and electronics retailers accept them).

**Use appropriate wire gauges.** Thin wires carrying high current get hot. For most cyberdeck builds, 22–24 AWG *(American Wire Gauge — a standard measurement where lower numbers mean thicker wire)* silicone-jacketed wire is appropriate. Silicone insulation withstands heat better than PVC.

**Don't charge unattended until you trust the setup.** For your first few charge cycles with any new battery configuration, stay nearby. Once you've confirmed the charger cuts off at full charge and nothing gets warm, it's fine to leave it.

**Store batteries at partial charge.** If you're putting your deck away for a while (weeks or months), charge the battery to about 50–60%. Storing fully charged or fully empty degrades the cell faster.

**Avoid using Geekworm-brand battery boards.** The [Cyberdeck Cafe build guide](https://cyberdeck.cafe/build) specifically warns against them due to fire risk. Stick with established brands: PiSugar, Adafruit, Pimoroni, Waveshare, or well-reviewed boards from AliExpress with genuine protection circuits.

For deeper reading on battery safety, Adafruit has an [excellent guide to working with LiPo batteries](https://learn.adafruit.com/li-ion-and-lipoly-batteries) that covers storage, charging, handling, and disposal.

## Extending Battery Life

Once your deck is running on battery, here's how to get more time out of each charge.

### Use Less Power

The most effective strategy. Every watt you save adds roughly 15–30 minutes of battery life on a typical 10,000 mAh bank.

**Reduce screen brightness.** The screen is usually the single biggest power consumer after the Pi itself. If your screen has adjustable brightness (hardware or software), turning it down from 100% to 50% can save 1–2 watts.

**Use an e-ink screen.** E-ink displays use almost zero power between refreshes. If your use case is reading or writing (where the screen doesn't need to update 60 times per second), e-ink can extend battery life dramatically — from hours to potentially a full day on a small battery.

**Disable Wi-Fi and Bluetooth when not needed.** On the Pi, you can disable them from the terminal:

```
sudo rfkill block wifi
sudo rfkill block bluetooth
```

Re-enable with `unblock` when you need them. This saves roughly 0.3–0.5 watts.

**Disable HDMI output if using a DSI screen.** If your screen connects via DSI *(ribbon cable)* rather than HDMI, you can turn off the HDMI output to save ~0.1–0.3W:

```
sudo tvservice -o
```

**Turn off the activity LEDs.** Small savings, but they add up. Add these lines to `/boot/config.txt`:

```
dtparam=act_led_trigger=none
dtparam=act_led_activelow=on
```

**Use Raspberry Pi OS Lite instead of Desktop.** The graphical desktop environment uses additional CPU and memory, which means additional power draw. If your deck runs a single app in kiosk mode (see [Operating Systems for Your Cyberdeck](/wiki/operating-systems-for-your-cyberdeck)), Lite is the leaner option.

### Choose Lower-Power Hardware

If you're still in the planning phase, your hardware choices have a big impact on battery life:

A **Pi Zero 2 W** draws 0.4–3W. A **Pi 4** draws 3–6W. A **Pi 5** draws 3–10W. That difference compounds over hours. If battery life is your top priority and your use case is lightweight (writing, music, reading), the Zero 2 W will run two to three times longer on the same battery.

A **5-inch screen** draws less than a 7-inch. A **non-touch screen** draws less than a touchscreen. An **e-ink screen** draws almost nothing.

### Graceful Shutdown

When a battery dies mid-use, the Pi loses power instantly — like pulling the plug on a desktop computer. This can corrupt your microSD card's filesystem *(the organizational structure that keeps your files intact)*, which can mean your deck won't boot next time.

**UPS modules and PiSugar boards** solve this by detecting low battery and triggering a clean shutdown before the power runs out. The Pi saves all open files, flushes the write cache, and shuts down safely. This is one of the strongest arguments for using a PiSugar or UPS HAT over a plain power bank.

**If you're using a plain power bank,** you can set up a software-based low-battery shutdown by monitoring the Pi's undervoltage warnings, but this is less reliable than a dedicated UPS module. The simplest protection is to keep an eye on your power bank's indicator LEDs and shut down manually when it's getting low.

To shut down cleanly from the command line:

```
sudo shutdown -h now
```

Or from the desktop, use the shutdown option in the start menu. Either way, wait until the green activity LED stops blinking before disconnecting power.

## Solar Charging

For solarpunk-oriented builders and off-grid use, solar panels can charge your cyberdeck's battery. A 10–20 watt USB solar panel can charge a 10,000 mAh power bank in 4–8 hours of direct sunlight (longer on cloudy days).

The setup is straightforward: solar panel → USB power bank → Pi. The power bank acts as a buffer between the panel's variable output and the Pi's need for steady voltage. Don't connect a solar panel directly to a Pi without a battery or regulator in between — solar output fluctuates with cloud cover and angle, and the Pi needs stable 5V.

Small portable solar panels from brands like Anker, BigBlue, and Nekteck cost $25–50 for 10–20W panels and fold up for portability. Annike Tan ([@ubeboobey](https://www.tiktok.com/@ubeboobey)) has posted builds incorporating solar panels as part of the anti-megacorp, off-grid cyberdeck ethos.

For more advanced solar setups — charge controllers, larger panels, 12V systems — the off-grid and solarpunk communities have extensive documentation. But for a cyberdeck, a USB solar panel feeding a power bank is the path of least resistance.

## Quick Reference: Power Setups by Build Type

| Build type | Recommended power setup | Expected battery life |
|---|---|---|
| **First build / prototyping** | USB power bank (10,000+ mAh) | 3–6 hours |
| **Writerdeck (Pi Zero 2 W + small screen)** | PiSugar 3 (1,200 mAh) or small power bank | 3–5 hours (PiSugar) / 8–12 hours (10K bank) |
| **General portable (Pi 4 + 7" screen)** | PiSugar 2 Pro (5,000 mAh) or 10K–20K power bank | 4–8 hours |
| **Performance deck (Pi 5 + touchscreen)** | 20,000 mAh PD power bank | 3–5 hours |
| **Ultra-compact (Polly Pocket, tin, brooch)** | PiSugar 3 (1,200 mAh) | 2–4 hours |
| **Off-grid / solarpunk** | Power bank + USB solar panel | Indefinite (with sunlight) |
| **Mostly plugged in** | Official Pi power supply, no battery needed | N/A |

## Further Reading

- [Cyberdeck Cafe build guide — power section](https://cyberdeck.cafe/build) — Practical power advice including budget tips and brand warnings
- [Adafruit LiPo battery guide](https://learn.adafruit.com/li-ion-and-lipoly-batteries) — Comprehensive safety and handling documentation
- [PiSugar documentation on GitHub](https://github.com/PiSugar) — Setup guides and software for PiSugar modules
- [Raspberry Pi power consumption benchmarks](https://www.pidramble.com/wiki/benchmarks/power-consumption) — Measured power draw for every Pi model
- [Your First Cyberdeck: A Beginner's Guide](/wiki/your-first-cyberdeck) — Full build walkthrough including power setup
- [Choosing the Right Single-Board Computer](/wiki/choosing-the-right-single-board-computer) — Power draw comparisons between boards
