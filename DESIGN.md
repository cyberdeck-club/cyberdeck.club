# DESIGN.md — cyberdeck.club Design System

> **This file is persistent design context for code-generation agents (Claude,
> Minimax M2.7, Copilot, Cursor, etc.) working on this Astro 6 + Tailwind v4
> site. ALWAYS read this file before generating any UI code, component, page,
> or copy. NEVER deviate from these tokens, classes, and patterns. If a task
> seems to require something outside this system, STOP and ask in a comment.**

---

## 0. What This Is

**cyberdeck.club** is a community platform for cyberdeck builders — part wiki,
part forum, part build showcase. The primary audience is **women, femmes, queer
folk, and people historically excluded from tech/maker spaces.** The community
celebrates cyberdecks as **aesthetic expression** — people making cyberdecks in
Polly Pocket toys, dinosaur toys, purses, clamshell compacts, vintage
lunchboxes — not just utilitarian mil-spec Pelican case builds.

The design system is **femme maximalist neobrutalism**: the structural
confidence of neobrutalism (thick borders, hard offset shadows, flat fills,
mono eyebrow labels, editorial grids) combined with a warm, bold, unapologetically
femme palette (coral, lavender, honey, cream, deep plum). The result should
read as "made by builders who also wear nail polish" — not "made by Barbie"
and not "made by an operator with a Pelican case."

### Stack

- **Framework**: Astro 6 (SSR mode, `astro.config.mjs`)
- **Styling**: Tailwind CSS v4 (CSS-first config — NO `tailwind.config.js`)
- **Styles entry**: `src/styles/global.css`
- **Components**: `src/components/**/*.astro`
- **CMS**: EmDash CMS (`/_emdash/admin`)
- **Deployment**: Cloudflare Pages

---

## 1. Design Principles (ranked — #1 always wins conflicts)

1. **Femme-first, always.** Every design decision asks: "does this make a
   femme/queer/beginner maker feel like this space was built for them?" If not,
   change it.
2. **Warm over cool, bold over muted.** Coral over steel, lavender over slate,
   cream over white, plum over black. NEVER pure `#FFFFFF`. NEVER pure `#000000`.
3. **Structure is neobrutalist; palette is femme maximalist.** Thick plum
   borders, hard offset shadows, flat fills, sharp corners — but in coral,
   lavender, honey, and cream. The structure is the skeleton; the palette is
   the personality.
4. **Plainspoken over jargon.** Every piece of copy assumes the reader picked
   up a soldering iron last week. Define every acronym. Delete every "just" and
   "simply."
5. **One accent per viewport.** Don't rainbow-vomit the palette. Pick ONE
   accent color per section/card/hero and let it breathe against cream.
6. **Monospaced anchors for data.** `font-mono` for any identifier, date,
   status, code snippet, or build number. Mono is the cyberdeck identity;
   everything else is the editorial voice.
7. **Motion ≤ 250ms.** Animate opacity and transform only — NEVER hue, NEVER
   color. Wrap all animation in `motion-safe:` or honor
   `prefers-reduced-motion`.

---

## 2. Color System

### 2.1 Semantic Tokens (ALWAYS use these — NEVER raw palette values)

Components MUST reference semantic tokens via Tailwind utilities. Theme
switching happens at the CSS-variable layer. Components NEVER use `dark:`
prefixed overrides.

| Semantic Token       | Role                              | Light Value (default)        | Utility Example            |
|----------------------|-----------------------------------|------------------------------|----------------------------|
| `--bg`               | Page background                   | `surface-50` (cream)         | `bg-bg`                    |
| `--surface`          | Card/panel fill                   | `surface-100` (warm white)   | `bg-surface`               |
| `--surface-alt`      | Alternate section band            | `secondary-100` (pale lilac) | `bg-surface-alt`           |
| `--text`             | Body text                         | `ink-800` (deep plum)        | `text-text`                |
| `--text-muted`       | Meta text, timestamps             | `ink-600` (mid plum)         | `text-text-muted`          |
| `--text-inverse`     | Text on dark/accent backgrounds   | `surface-50` (cream)         | `text-text-inverse`        |
| `--border`           | All borders, card frames          | `ink-900` (near-black plum)  | `border-border`            |
| `--focus`            | Focus ring color                  | `secondary-600` (lavender)   | `ring-focus`               |
| `--shadow-hard`      | Hard offset shadow color          | `ink-900`                    | *(used in shadow tokens)*  |

### 2.2 Full Palette Ramps (OKLCH)

**CRITICAL**: These ramps exist for the `@theme` block in `global.css`.
Components NEVER reference ramp steps directly (e.g., NEVER `bg-primary-500`).
Components ONLY use semantic tokens from §2.1.

```css
/* === PRIMARY — coral-pink, hue ~14–22 === */
--color-primary-50:  oklch(0.971 0.013 17);
--color-primary-100: oklch(0.936 0.038 15);
--color-primary-200: oklch(0.885 0.075 14);
--color-primary-300: oklch(0.808 0.130 14);
--color-primary-400: oklch(0.722 0.190 16);
--color-primary-500: oklch(0.660 0.220 18);   /* hero coral */
--color-primary-600: oklch(0.590 0.230 20);   /* button fill */
--color-primary-700: oklch(0.510 0.205 22);   /* link color */
--color-primary-800: oklch(0.445 0.175 22);
--color-primary-900: oklch(0.395 0.140 22);
--color-primary-950: oklch(0.260 0.092 24);

/* === SECONDARY — lavender / lilac, hue ~300–305 === */
--color-secondary-50:  oklch(0.977 0.014 305);
--color-secondary-100: oklch(0.946 0.033 305);
--color-secondary-200: oklch(0.902 0.063 305);
--color-secondary-300: oklch(0.827 0.110 305);   /* chip fill */
--color-secondary-400: oklch(0.738 0.165 302);
--color-secondary-500: oklch(0.660 0.205 300);
--color-secondary-600: oklch(0.572 0.235 300);   /* focus ring */
--color-secondary-700: oklch(0.496 0.215 302);
--color-secondary-800: oklch(0.438 0.180 304);
--color-secondary-900: oklch(0.385 0.145 305);
--color-secondary-950: oklch(0.270 0.110 305);

/* === ACCENT — honey / warm gold, hue ~78–95 === */
--color-accent-50:  oklch(0.987 0.022 95);
--color-accent-100: oklch(0.962 0.058 95);
--color-accent-200: oklch(0.924 0.115 92);
--color-accent-300: oklch(0.878 0.165 90);   /* badge fill */
--color-accent-400: oklch(0.828 0.185 86);
--color-accent-500: oklch(0.770 0.180 82);   /* honey */
--color-accent-600: oklch(0.665 0.175 75);
--color-accent-700: oklch(0.555 0.150 68);
--color-accent-800: oklch(0.475 0.125 62);
--color-accent-900: oklch(0.415 0.105 58);
--color-accent-950: oklch(0.285 0.075 55);

/* === SURFACE — cream / warm-white, hue ~75–80 === */
--color-surface-50:  oklch(0.985 0.008 80);   /* page bg */
--color-surface-100: oklch(0.965 0.014 80);   /* card */
--color-surface-200: oklch(0.928 0.020 78);
--color-surface-300: oklch(0.875 0.024 76);   /* divider */
--color-surface-400: oklch(0.760 0.028 74);
--color-surface-500: oklch(0.620 0.030 72);
--color-surface-600: oklch(0.500 0.032 70);
--color-surface-700: oklch(0.395 0.035 65);
--color-surface-800: oklch(0.310 0.038 60);
--color-surface-900: oklch(0.235 0.040 50);
--color-surface-950: oklch(0.165 0.042 40);

/* === INK — deep plum (NEVER pure black), hue ~350–358 === */
--color-ink-50:  oklch(0.972 0.008 355);
--color-ink-100: oklch(0.930 0.014 355);
--color-ink-200: oklch(0.870 0.022 354);
--color-ink-300: oklch(0.770 0.030 352);
--color-ink-400: oklch(0.610 0.045 350);
--color-ink-500: oklch(0.460 0.060 350);
--color-ink-600: oklch(0.360 0.072 350);     /* muted text */
--color-ink-700: oklch(0.280 0.078 352);     /* body text */
--color-ink-800: oklch(0.220 0.075 354);     /* headings */
--color-ink-900: oklch(0.170 0.065 355);     /* borders */
--color-ink-950: oklch(0.120 0.045 358);     /* darkest plum */

/* === STATUS (closed set — no other status colors permitted) === */
--color-signal:  oklch(0.72 0.17 155);       /* success green */
--color-warn:    oklch(0.75 0.16 65);        /* warm amber */
--color-danger:  oklch(0.58 0.22 18);        /* hot coral-red */
--color-info:    oklch(0.65 0.14 260);       /* blue-lavender */
```

**Verified WCAG 2.2 AA Contrast (light theme):**

| Pair                              | Ratio  | Pass  |
|-----------------------------------|--------|-------|
| `ink-800` on `surface-50` (body)  | 13.9:1 | AAA   |
| `ink-900` on `surface-50` (border)| 14.1:1 | AAA   |
| `ink-950` on `primary-500` (btn)  | 5.6:1  | AA    |
| `ink-900` on `secondary-300` (chip)| 8.4:1 | AAA   |
| `ink-950` on `accent-300` (badge) | 9.2:1  | AAA   |
| `primary-700` on `surface-50` (link)| 5.2:1| AA    |

### 2.3 Dark Mode (Optional — Femme-Coded, NOT Terminal-Coded)

Dark mode uses `data-theme="dark"` on `<html>`. It is NOT the default.
When present, it MUST remain femme-coded. Deep plum-black backgrounds, cream
text, lavender surfaces. NEVER terminal green. NEVER "hacker" aesthetics.

```css
[data-theme="dark"] {
  --bg:           var(--color-surface-950);    /* deep plum-black */
  --surface:      var(--color-secondary-950);  /* deep lavender */
  --surface-alt:  var(--color-ink-800);
  --text:         var(--color-surface-100);    /* cream */
  --text-muted:   var(--color-surface-400);
  --text-inverse: var(--color-ink-900);
  --border:       var(--color-surface-100);    /* cream borders in dark */
  --focus:        var(--color-primary-400);    /* warm coral */
  --shadow-hard:  var(--color-surface-100);    /* cream shadows in dark */
}
```

### 2.4 Hard Rules for Color

- NEVER use `bg-white`, `bg-black`, `text-white`, `text-black`. Always cream/plum.
- NEVER use Tailwind palette colors (`bg-zinc-*`, `bg-blue-*`, `bg-rose-*`).
- NEVER use arbitrary hex values (`bg-[#abc]`).
- NEVER use `dark:` class prefixes. Theme swap is at the CSS variable layer.
- NEVER use `primary-500` as text on cream — only 3.4:1, fails AA. Use
  `primary-700` for links.
- ALWAYS pair color signals with non-color cues (icons, weight, underlines,
  patterns) per WCAG 1.4.1.

---

## 3. Typography

### 3.1 Font Stack

| Role        | Family                   | Tailwind Utility | Usage                                  |
|-------------|--------------------------|------------------|----------------------------------------|
| **Display** | Fraunces (variable)      | `font-display`   | h1, h2, hero headlines, pull quotes    |
| **Body/UI** | General Sans (Fontshare) | `font-sans`      | Body text, buttons, nav, form labels   |
| **Code**    | JetBrains Mono           | `font-mono`      | Code blocks, inline code               |
| **Eyebrow** | Departure Mono           | `font-pixel`     | Eyebrow labels, build IDs, status tags |

**Fallback**: If General Sans is unavailable, use Inter. If Departure Mono is
unavailable, use JetBrains Mono.

NEVER use: Roboto, Open Sans, Lato, Arial, system-ui as display. NEVER use
Space Grotesk, Geist, or Fira Code as primary. NEVER use more than 4
typeface families total.

### 3.2 The Hero Move (Fraunces at Maximum Femme)

This is the signature typographic gesture of the site:

```css
.hero-headline {
  font-family: 'Fraunces', ui-serif, Georgia, serif;
  font-style: italic;
  font-weight: 400;
  font-variation-settings: "opsz" 144, "SOFT" 100, "WONK" 1;
  font-size: clamp(3rem, 7vw, 6rem);
  letter-spacing: -0.02em;
  line-height: 1.02;
  color: var(--text);
}
```

Fraunces italic with SOFT and WONK cranked up produces ball-terminal
curvy serifs that are the femme-editorial signature. ALWAYS use this
for h1 and hero headlines. Pair with a Departure Mono boxed eyebrow above it.

### 3.3 Eyebrow Labels

```css
.eyebrow {
  font-family: 'Departure Mono', 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  display: inline-block;
  background: var(--color-secondary-200);
  color: var(--text);
  border: 2px solid var(--border);
  padding: 4px 8px;
  box-shadow: 3px 3px 0 var(--shadow-hard);
}
```

Prefix eyebrow text with `▸` or `///` as a restrained system/cyberdeck nod.
Example: `▸ BUILD LOG` or `/// WIKI ARTICLE`.

### 3.4 Type Scale (16px base, 1.25 ratio, fluid clamp)

| Token         | Size                                | Usage                    |
|---------------|-------------------------------------|--------------------------|
| `--fs-eyebrow`| `0.6875rem` (11px)                  | Mono eyebrows, tags      |
| `--fs-small`  | `0.8125rem` (13px)                  | Captions, footnotes      |
| `--fs-body`   | `1rem` (16px)                       | Body text                |
| `--fs-lead`   | `1.125rem` (18px)                   | Intro paragraphs         |
| `--fs-h4`     | `1.5rem` (24px)                     | Section subheads         |
| `--fs-h3`     | `clamp(1.75rem, 2.5vw, 2.25rem)`   | Card titles              |
| `--fs-h2`     | `clamp(2.25rem, 4vw, 3.5rem)`      | Section headlines        |
| `--fs-h1`     | `clamp(3rem, 7vw, 6rem)`           | Hero / page titles       |

**Body weight is 500, not 400.** Lighter palettes lose perceived weight; bumping
every weight one step keeps the brutalist density readable. Headings use 800–900.

---

## 4. Spacing

### CLOSED ENUMERATION — Only These Values Are Permitted

`0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32`

These map to Tailwind's default scale (`p-0` through `p-32`).

**FORBIDDEN values**: `5, 7, 9, 10, 11, 13, 14, 15, 18, 20`. NEVER use
arbitrary spacing (`p-[7px]`, `m-[13px]`). If you need a value not in this
list, you are making the wrong design decision — rethink the layout.

### Common Spacing Patterns

| Context              | Token       | Pixels |
|----------------------|-------------|--------|
| Card padding         | `p-6`       | 24px   |
| Card gap in grid     | `gap-6`     | 24px   |
| Section vertical     | `py-16`     | 64px   |
| Section vertical (hero) | `py-24` | 96px   |
| Button padding       | `px-5 py-2.5` | 20×10px |
| Input padding        | `px-4 py-3` | 16×12px |
| Stack gap (items)    | `gap-4`     | 16px   |

---

## 5. Borders, Radius, Shadows

### 5.1 Borders

| Token           | Width | Usage                      |
|-----------------|-------|----------------------------|
| `--border-thin` | `2px` | Inputs, secondary dividers |
| `--border-base` | `3px` | Cards, buttons (default)   |
| `--border-thick`| `4px` | Hero sections, feature cards|

Border color is ALWAYS `var(--border)` (semantic token). NEVER `border-black`
or `border-gray-*`.

### 5.2 Border Radius

| Token          | Value   | Usage                          |
|----------------|---------|--------------------------------|
| `--radius-none`| `0px`   | Not used (too harsh for femme) |
| `--radius-sm`  | `4px`   | Default: cards, buttons, inputs|
| `--radius-md`  | `8px`   | Max permitted. Modals only.    |
| `--radius-full`| `9999px`| Avatars ONLY.                  |

**NEVER** use `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
These break the neobrutalist structure. Max is `rounded-md` (8px) and only
for modals. Default everything to `rounded-sm` (4px).

### 5.3 Hard Offset Shadows

These are the canonical neobrutalist tell. NEVER use soft/blurred shadows
(`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`). ONLY hard offset.

```css
--shadow-brut-sm:     3px 3px 0 0 var(--shadow-hard);
--shadow-brut:        4px 4px 0 0 var(--shadow-hard);     /* default */
--shadow-brut-lg:     6px 6px 0 0 var(--shadow-hard);
--shadow-brut-xl:     8px 8px 0 0 var(--shadow-hard);
--shadow-brut-pressed: 1px 1px 0 0 var(--shadow-hard);
```

**Shadow color matrix:**
- Cream surface → `ink-900` shadow (default)
- Coral primary fill → `ink-950` or `primary-900` shadow
- Lavender secondary fill → `secondary-900` shadow
- Honey accent fill → `ink-900` shadow
- Dark mode → `surface-100` (cream) shadow (inverted)

---

## 6. Layout Patterns

### 6.1 Page Shell

```html
<main class="mx-auto max-w-7xl px-4 md:px-8">
  <!-- page content -->
</main>
```

### 6.2 Editorial Grid

```html
<div class="grid grid-cols-12 gap-6">
  <div class="col-span-12 md:col-span-8 row-span-2"><!-- Featured --></div>
  <div class="col-span-12 md:col-span-4"><!-- Standard card --></div>
  <div class="col-span-12 md:col-span-4"><!-- Standard card --></div>
</div>
```

### 6.3 Section Banding

Alternate between `bg-bg` (cream) and `bg-surface-alt` (pale lilac) for
section rhythm. Each section gets `py-16 md:py-24`.

### 6.4 Breakpoints

| Name | Width    | Usage        |
|------|----------|--------------|
| `sm` | `40rem`  | Phone → wide |
| `md` | `48rem`  | Tablet       |
| `lg` | `64rem`  | Desktop      |
| `xl` | `80rem`  | Wide desktop |

Mobile-first. Use container queries (`@container`, `@md:`) inside reusable
components. Use viewport breakpoints for page shell only.

---

## 7. Component Recipes

### 7.1 Button

```html
<!-- PRIMARY -->
<button class="
  bg-primary-600 text-ink-950
  border-3 border-border rounded-sm
  px-5 py-2.5
  font-display font-extrabold text-base
  shadow-[4px_4px_0_0_var(--shadow-hard)]
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[1px_1px_0_0_var(--shadow-hard)]
  active:translate-x-1 active:translate-y-1 active:shadow-none
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-focus focus-visible:ring-offset-2
  transition-[transform,box-shadow] duration-75
">Get Started</button>

<!-- SECONDARY -->
<button class="
  bg-secondary-200 text-ink-800
  border-3 border-border rounded-sm
  px-5 py-2.5
  font-sans font-bold text-base
  shadow-[3px_3px_0_0_var(--shadow-hard)]
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[1px_1px_0_0_var(--shadow-hard)]
  active:translate-x-1 active:translate-y-1 active:shadow-none
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-focus focus-visible:ring-offset-2
  transition-[transform,box-shadow] duration-75
">Browse Builds</button>

<!-- GHOST -->
<button class="
  bg-transparent text-text
  border-3 border-border rounded-sm
  px-5 py-2.5
  font-sans font-bold text-base
  hover:bg-surface-200
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-focus focus-visible:ring-offset-2
">Cancel</button>
```

### 7.2 Card (Build Card)

```html
<article class="
  bg-surface border-3 border-border rounded-sm
  shadow-[4px_4px_0_0_var(--shadow-hard)]
  overflow-hidden
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[1px_1px_0_0_var(--shadow-hard)]
  transition-[transform,box-shadow] duration-75
">
  <!-- 4:3 photo -->
  <img src="..." alt="Polly Pocket cyberdeck with Raspberry Pi Zero inside,
    pastel pink shell, RGB LEDs visible through translucent case"
    class="aspect-[4/3] w-full object-cover" />

  <!-- Mono metadata strip -->
  <div class="
    bg-primary-100 border-t-3 border-border
    px-4 py-2
    font-pixel text-[11px] uppercase tracking-wider text-text-muted
  ">
    ▸ BUILD #0142 · PALMTOP · 2026-04-12
  </div>

  <!-- Content -->
  <div class="p-6">
    <h3 class="font-display font-bold text-xl text-text">
      Polly Pocket Pi
    </h3>
    <p class="mt-2 font-sans text-sm text-text-muted">
      A Raspberry Pi Zero tucked inside a vintage Polly Pocket compact.
      Runs a tiny Linux with a 1.3″ OLED screen.
    </p>
    <!-- Tags -->
    <div class="mt-4 flex flex-wrap gap-2">
      <span class="
        bg-secondary-200 text-ink-800
        border-2 border-border rounded-sm
        px-2 py-0.5
        font-pixel text-[11px] uppercase tracking-wider
      ">raspberry pi</span>
      <span class="
        bg-accent-200 text-ink-800
        border-2 border-border rounded-sm
        px-2 py-0.5
        font-pixel text-[11px] uppercase tracking-wider
      ">toy case</span>
    </div>
  </div>
</article>
```

### 7.3 FAQ Accordion

```html
<details class="
  border-3 border-border rounded-sm
  bg-surface
  [&[open]]:shadow-[4px_4px_0_0_var(--shadow-hard)]
  transition-shadow duration-150
">
  <summary class="
    flex items-center justify-between
    px-6 py-4
    font-sans font-bold text-base text-text
    cursor-pointer
    list-none
    [&::-webkit-details-marker]:hidden
  ">
    What even is a cyberdeck?
    <span class="
      w-6 h-6 flex items-center justify-center
      border-2 border-border rounded-full
      text-sm font-mono
    ">+</span>
  </summary>
  <div class="px-6 pb-6 font-sans text-sm text-text-muted leading-relaxed">
    A cyberdeck is a custom-built portable computer. Think of it as a
    creative project where you design and assemble your own little
    computer from parts — and put it in whatever case makes you happy.
    A lunchbox, a purse, a toy, a vintage radio. There are no rules.
  </div>
</details>
```

### 7.4 Input / Text Field

```html
<label class="block">
  <span class="font-sans font-bold text-sm text-text">Display Name</span>
  <input type="text" placeholder="What should we call you?"
    class="
      mt-1 w-full
      bg-surface border-2 border-border rounded-sm
      px-4 py-3
      font-sans text-base text-text
      placeholder:text-text-muted
      focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2
    " />
</label>
```

### 7.5 Eyebrow + Hero Headline Combo

```html
<div class="text-center py-24">
  <span class="eyebrow">/// Welcome to the Club</span>
  <h1 class="
    mt-6
    font-display italic font-normal
    text-[clamp(3rem,7vw,6rem)]
    leading-[1.02] tracking-tight
    text-text
    [font-variation-settings:'opsz'_144,'SOFT'_100,'WONK'_1]
  ">
    Build your cyberdeck.<br/>Meet your people.
  </h1>
  <p class="mt-6 max-w-xl mx-auto font-sans text-lg text-text-muted">
    A community for folks turning toys, purses, compacts, and lunchboxes
    into actual computers. Whether you've been soldering for decades or
    picked up an iron last week — you belong here.
  </p>
</div>
```

### 7.6 Footer (Inverted Section)

```html
<footer class="bg-ink-900 text-surface-50 border-t-4 border-border py-16">
  <div class="mx-auto max-w-7xl px-4 md:px-8">
    <h2 class="
      font-display italic font-normal text-3xl
      [font-variation-settings:'opsz'_72,'SOFT'_100,'WONK'_1]
    ">
      Stay in the loop.
    </h2>
    <p class="mt-2 font-sans text-surface-300">
      New builds, guides, and community stuff — no spam, no tracking.
    </p>
    <!-- Newsletter form -->
    <div class="mt-6 flex gap-3">
      <input type="email" placeholder="your@email.com" class="
        flex-1 bg-ink-800 border-2 border-surface-300 rounded-sm
        px-4 py-3 font-sans text-base text-surface-50
        placeholder:text-surface-500
        focus:outline-none focus:ring-2 focus:ring-primary-400
      " />
      <button class="
        bg-primary-500 text-ink-950
        border-3 border-surface-100 rounded-sm
        px-5 py-2.5
        font-display font-extrabold
        shadow-[4px_4px_0_0_var(--color-surface-100)]
        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[1px_1px_0_0_var(--color-surface-100)]
        transition-[transform,box-shadow] duration-75
      ">Subscribe</button>
    </div>
  </div>
</footer>
```

---

## 8. Decorative Kit

### SVG Shape Vocabulary

Adapted from the Ella Mae inspiration template. Replace Ella Mae's DeFi-coded
shapes (flowers, hearts, suns) with cyberdeck-femme equivalents:

| Shape                       | Fill Options                       | Usage                              |
|-----------------------------|------------------------------------|------------------------------------|
| Concentric circles          | Primary-200 + ink-900 outline      | Section margins, hero accents      |
| Star / sparkle / asterisk   | Accent-300 or secondary-300        | Achievement badges, celebrations   |
| Daisy / flower (LilyPad nod)| Primary-300 fill, ink-900 outline  | Category markers                   |
| Bow / ribbon                | Secondary-300                      | Special/featured badges            |
| Circuit-trace divider (SVG) | ink-300, 1px stroke                | Section dividers (subtle)          |
| Dotted/dashed rule           | ink-300                           | Alternative to solid `<hr>`        |

### Usage Rules

- Decorative shapes go in **section margins** as rhythm marks, NEVER inside
  reading content.
- Maximum **2 decorative shapes** visible per viewport.
- Shapes are flat-fill SVG with optional ink-900 outline. NEVER gradients.
- At 3% opacity max for background textures (circuit-trace, dot grid).
- NEVER use: crosshairs, scope reticles, skulls, Punisher logos, Matrix
  glyphs, hexagonal "tech" patterns, or neon glow effects.

---

## 9. Accessibility (Non-Negotiable)

### 9.1 Contrast

- Body text: minimum **4.5:1** ratio (WCAG 2.2 AA).
- Large text (≥18.66px bold or ≥24px): minimum **3:1**.
- UI components and graphical objects: minimum **3:1**.
- ALWAYS test new color pairings before using them.

### 9.2 Focus States

EVERY interactive element MUST have:

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-focus
focus-visible:ring-offset-2
```

Focus indicator MUST be ≥ 2 CSS pixels with ≥ 3:1 contrast (WCAG 2.4.13).
Focus MUST NOT be obscured by sticky headers (WCAG 2.4.11).

### 9.3 Touch Targets

Minimum **24×24 CSS pixels** (WCAG 2.5.8). Prefer **44×44** for primary
actions. Apply to buttons, links, form controls, and tag chips.

### 9.4 Motion

- Wrap ALL animations in `motion-safe:` or respect `prefers-reduced-motion`.
- Maximum animation duration: **250ms** for UI, **400ms** for entrance.
- Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- NEVER auto-advance carousels.
- NEVER animate hue or color.

### 9.5 Semantic HTML

- Headings sequential: `h1 → h2 → h3`. NEVER skip levels for styling.
- Skip-link in every layout.
- `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>` landmarks.
- ARIA only when no native HTML element exists.
- All build photos: **descriptive alt text** including form factor + key
  components (e.g., "Polly Pocket cyberdeck with Raspberry Pi Zero,
  pastel pink shell, 1.3-inch OLED screen").

### 9.6 Forms

- Every input has a visible `<label>`.
- Error messages appear inline, adjacent to the field, using both color
  AND icon/text.
- NEVER use color alone to communicate state.

---

## 10. Voice & Copy Guidelines

### 10.1 Core Voice

The voice is **a friend showing you something cool they made and wanting you
to try it too** — not an instructor, not a hacker, not a brand. Five
adjectives: **warm, plainspoken, encouraging, specific, playful** (not snarky).

### 10.2 The Word Swap Table

**ALWAYS use these substitutions in all community-facing copy:**

| ❌ AVOID                                          | ✅ USE INSTEAD                                       |
|---------------------------------------------------|------------------------------------------------------|
| SBC, MCU, PCB, GPIO, BOM, PSU                     | Tiny computer, microcontroller (chip that runs your code), circuit board, programmable pins, parts list, power supply |
| Flash the firmware                                 | Copy the software onto the chip                      |
| Headless / brick / bring up                        | No screen attached / stop responding / turn it on for the first time |
| Master/slave                                       | Main/replica                                         |
| Whitelist/blacklist                                | Allowlist/denylist                                    |
| Master branch                                      | Main branch                                          |
| Sanity check, dummy data                           | Quick check, placeholder data                        |
| Crazy fast, killing it                             | Surprisingly fast, doing amazing work                |
| Guys, dudes, he/his (generic)                      | Folks, y'all, builders, they/them                    |
| Real makers / real cyberdecks / real programmers   | *(delete the word "real" — it's gatekeeping)*        |
| Just X, simply X, easy, quick, obviously, trivial  | *(delete entirely — or say how long it actually takes)* |
| RTFM, well actually, you should already know       | "Here's the doc that helped me: [link]"              |
| Elite, rugged, tactical, mil-spec, operator        | *(delete — firearms-adjacent connotations)*          |
| Welcome, hackers                                   | Welcome, builders / Welcome, makers                  |
| Click here                                         | *(use descriptive link text)*                        |

### 10.3 Tone by Context

| Context      | Tone                                                         |
|--------------|--------------------------------------------------------------|
| **Welcome**  | Warm, inviting, "you belong here before you do anything"     |
| **Tutorial** | Patient, step-by-step, "here's what helped me"               |
| **Error**    | Honest, blame-free, what happened + why + what to do         |
| **Showcase** | Celebratory, specific, "look what you made!"                 |
| **Safety**   | Clear, direct, no ambiguity, never hidden in tooltips        |

### 10.4 Defining Terms

- **Dotted-underline tooltip** for recurring jargon (supplemental info only).
- **Inline parenthetical** for one-off terms: "the GPIO *(programmable pins)*
  on the board."
- **Glossary link** for concepts needing a paragraph.
- Define on first use, **every page** — don't assume readers arrived from
  elsewhere.
- NEVER hide essential safety information in a tooltip.

### 10.5 Sample Copy

**Hero subhead:**
> "A community for folks turning toys, purses, compacts, and lunchboxes into
> actual computers. Whether you've been soldering for decades or picked up an
> iron last week — you belong here."

**Empty state (no builds):**
> "No builds yet — what's catching your eye? Browse projects from the community
> for inspiration, or start documenting one of your own."

**Error (upload failed):**
> "That upload didn't go through — the connection dropped partway. Your draft
> is saved. Want to try sending it again?"

**Rate limit:**
> "Looks like you're posting really fast (love it). Give it a minute and
> try again."

**500 error:**
> "Something on our end broke — not your fault. We've been pinged. Try
> refreshing in a minute."

### 10.6 The Pre-Publish Checklist

Before publishing ANY community-facing copy, verify:

1. Every acronym is defined on first use.
2. Every "just / simply / easy / obviously / trivial" is deleted.
3. Reader is addressed as "you" in active voice.
4. No "guys," no generic "he," no ableist intensifiers.
5. All link text is descriptive — never "click here."
6. Errors say what happened + why + what to do. NEVER blame the user.
7. Empty states have a heading + motivation + action.
8. Time/cost estimates are real numbers, not "quick" or "cheap."
9. The Adafruit test: could an 11-year-old AND a 60-year-old both follow
   without feeling talked down to?
10. If you struggled with this part, say so — experts admitting friction
    makes it safe for beginners to admit theirs.

---

## 11. Inclusive Identity Patterns

### 11.1 Pronouns

- Free-text pronouns field on every profile (~30 chars, optional).
- Rendered at **the same typographic level as display name** in EVERY social
  surface: posts, comments, mentions, member directory, hover cards.
- Allow multiple sets ("she/they"), "ask me," "any/all," neopronouns.
- Render inline: `@alex (they/them)`.
- Default all platform-generated copy to singular *they*.

### 11.2 Display Name vs. Legal Name

- Single primary "Display name" field. NEVER "Real name."
- Legal name collected only with a concrete stated reason (payments, shipping).
- All transactional emails use display name. Don't deadname.

### 11.3 Gender/Identity Fields

- Do NOT ask for gender at registration unless mission-critical for a feature.
- If needed: free-text "Labels I use" field > dropdown > radio buttons.
- NEVER use "Other" as the third option. Use "Prefer to self-describe: [____]."
- "About me" as freeform lets users describe themselves in their own vocabulary.

### 11.4 Profile Architecture

- Pronouns, identity labels (free text), city-level location (NEVER auto-share
  precise), skills/interests as tags, "currently making," "what I want to
  learn," "ask me about."
- Reactions include: ✨ 💅 🦋 ❤️‍🩹 🔧 alongside standard 👍 ❤️.

### 11.5 Code of Conduct

- Visible during onboarding — not a footer link.
- Recurse Center social rules: no feigning surprise, no well-actually's,
  no backseat driving, no subtle -isms.
- Trans-exclusionary content is explicitly out of scope, not "viewpoint
  diversity."
- Moderators are humanized: name, pronouns, what they like to make.
- Reporting is reachable in ≤ 2 clicks from any post.

---

## 12. Photography & Illustration

### 12.1 Photography Conventions

- **DO**: Decks held by a person in a domestic setting — kitchen tables,
  picnic blankets, sun-dappled bedrooms, glitter desks. A cat in frame
  is perfect.
- **DON'T**: Gravel backgrounds, tactical mats, anonymous black-gloved
  hands, sterile workbenches with no personality.
- Show the **range** of what cyberdecks can be: toy cases, purses,
  compacts, vintage radios, lunchboxes — not just Pelican cases.

### 12.2 Illustration Style

- Zine-cut-paste collage, risograph two-color halftones, hand-drawn
  marginalia (arrows, underlines, scribbled annotations).
- Commission queer illustrators when possible.
- NEVER use Corporate Memphis ("Alegria" noodle-arm style). It reads
  as performative tech inclusivity.
- NEVER use stock photography "diversity" packs.

### 12.3 Iconography Vocabulary

- **Use**: Cookies, dinosaurs, shells, charms, stickers, flowers, bows,
  kawaii faces, the wrench, stars, sparkles.
- **NEVER**: Crosshairs, skulls, scope reticles, "operator" silhouettes,
  Matrix glyphs, Punisher iconography, military insignia.

---

## 13. Do's and Don'ts (Code-Level)

✅ **DO** `<button class="bg-primary-600 text-ink-950 border-3 border-border ...">`
❌ **DON'T** `<button class="bg-orange-600 text-white dark:bg-orange-500 ...">`

✅ **DO** `<div class="rounded-sm border-3 border-border bg-surface p-6 shadow-[4px_4px_0_0_var(--shadow-hard)]">`
❌ **DON'T** `<div class="rounded-2xl shadow-xl bg-white/80 backdrop-blur-md ...">`

✅ **DO** Mono metadata strip: `▸ BUILD #0142 · PALMTOP · 2026-04-12`
❌ **DON'T** Gradient headers, glassmorphism cards, neon glow shadows.

✅ **DO** `font-display italic` with Fraunces WONK for headlines.
❌ **DON'T** `font-sans font-bold uppercase tracking-widest` for headlines (startup-coded).

✅ **DO** `bg-surface-50` (cream) for page backgrounds.
❌ **DON'T** `bg-white` or `bg-black` anywhere, ever.

✅ **DO** Hard offset shadow: `shadow-[4px_4px_0_0_var(--shadow-hard)]`
❌ **DON'T** Soft shadow: `shadow-lg`, `shadow-xl`, `shadow-2xl`

✅ **DO** Copy tone: "Here's the doc that helped me"
❌ **DON'T** Copy tone: "RTFM" / "you should already know this"

✅ **DO** Hero image: person holding a cute cyberdeck at a kitchen table.
❌ **DON'T** Hero image: black-gloved hands on a Pelican case on gravel.

✅ **DO** Define terms: "the GPIO *(programmable pins)* on the board"
❌ **DON'T** Assume knowledge: "connect to GPIO and flash firmware"

✅ **DO** `@alex (they/them)` inline in every social surface.
❌ **DON'T** Pronouns only on profile pages, hidden from actual interactions.

---

## 14. Out of Scope (Closes the Search Space for LLMs)

**The following are NOT part of this design system. Do NOT generate them:**

- Gradients (no linear-gradient, no radial-gradient, no mesh)
- Glassmorphism / `backdrop-blur` / frosted glass
- Neumorphism / soft inner shadows
- Multi-color icons (icons are monochrome `currentColor`)
- Custom fonts beyond the 4 declared families
- Box-shadow stacks > 1 layer (except `--shadow-brut-*` tokens)
- Animated glitch / RGB-split / CRT scanline effects
- Matrix code rain, neon outrun grid, decorative kanji
- Terminal green (`#00ff00` / `#33ff66`) as any accent or theme color
- Mil-spec / olive drab / FDE tan / gunmetal color schemes
- Carousels with auto-advance
- Modal stacks (one modal max at a time)
- Avatars > 40px in list views
- `dark:` class prefixes (theming is CSS-variable-only)
- Tailwind palette colors (`bg-zinc-*`, `bg-slate-*`, `bg-rose-*`)
- Arbitrary values (`bg-[#hex]`, `p-[Npx]`, `text-[size]`) except where
  explicitly shown in component recipes above
- Reputation/karma systems as the primary content-discovery mechanism
- Required real names or required GitHub login

---

## 15. Tailwind v4 Configuration Reference

The complete `@theme` block for `src/styles/global.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root,
[data-theme="light"] {
  --bg:           var(--color-surface-50);
  --surface:      var(--color-surface-100);
  --surface-alt:  var(--color-secondary-100);
  --text:         var(--color-ink-800);
  --text-muted:   var(--color-ink-600);
  --text-inverse: var(--color-surface-50);
  --border:       var(--color-ink-900);
  --focus:        var(--color-secondary-600);
  --shadow-hard:  var(--color-ink-900);
}

[data-theme="dark"] {
  --bg:           var(--color-surface-950);
  --surface:      var(--color-secondary-950);
  --surface-alt:  var(--color-ink-800);
  --text:         var(--color-surface-100);
  --text-muted:   var(--color-surface-400);
  --text-inverse: var(--color-ink-900);
  --border:       var(--color-surface-100);
  --focus:        var(--color-primary-400);
  --shadow-hard:  var(--color-surface-100);
}

@theme inline {
  --color-bg:          var(--bg);
  --color-surface:     var(--surface);
  --color-surface-alt: var(--surface-alt);
  --color-text:        var(--text);
  --color-text-muted:  var(--text-muted);
  --color-text-inverse:var(--text-inverse);
  --color-border:      var(--border);
  --color-focus:       var(--focus);
  --color-shadow-hard: var(--shadow-hard);
}

@theme {
  /* Palette ramps — see §2.2 for full values */
  /* ... (paste full ramps from §2.2) ... */

  /* Typography */
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans:    "General Sans", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --font-pixel:   "Departure Mono", "JetBrains Mono", ui-monospace, monospace;

  /* Radius */
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-brut-sm:     3px 3px 0 0 var(--shadow-hard);
  --shadow-brut:        4px 4px 0 0 var(--shadow-hard);
  --shadow-brut-lg:     6px 6px 0 0 var(--shadow-hard);
  --shadow-brut-xl:     8px 8px 0 0 var(--shadow-hard);
  --shadow-brut-pressed: 1px 1px 0 0 var(--shadow-hard);

  /* Breakpoints */
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
}
```

---

## 16. Guardrails (inherited from AGENTS.md — DO NOT violate)

- **Do NOT** replace `WikiLayout` with `BaseLayout` on wiki pages.
- **Do NOT** use hardcoded color values — use CSS variables only.
- **Do NOT** remove `is:inline` from the theme script in `<head>`.
- **Do NOT** change EmDash plugin import style — must use package names.
- **Do NOT** seed with `--no-content` flag omitted in production.
- **Do NOT** use Tailwind v3 syntax (`tailwind.config.js`, `darkMode: 'class'`).
- **Do NOT** generate `dark:` class overrides. Theming is CSS-variable-only.

---

*Last updated: 2026-04-30*
*Inspiration template: Ella Mae by Lexington Themes (structural grammar only — palette replaced)*
*Design direction: femme maximalist neobrutalism for a queer/femme/beginner cyberdeck community*
