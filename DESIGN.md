# DESIGN.md — cyberdeck.club Design Philosophy

## Overview

**cyberdeck.club** is a community platform for **women, femmes, queers, and people historically under-represented in STEM and tech** who are passionate about cyberdecks. The visual design must reflect this mission: bold, unapologetic, joyful, and deeply welcoming. We achieve this through **neobrutalism** — a design language of structural honesty and playful rebellion — adapted with a vibrant, inclusive color palette we call **"Girlie Pop."**

The site combines a wiki, forum, build showcase, and meetup calendar into a single cohesive application. Every design decision serves two masters: **personality** (the site should feel fun, expressive, and alive) and **usability** (a community tool must be navigable, readable, and accessible).

---

## Design Language: Neobrutalism

### What Is Neobrutalism?

Neobrutalism (also called neubrutalism) is a contemporary web design trend that descends from brutalist architecture's philosophy of *béton brut* — raw concrete, exposed structure, nothing hidden. In digital design, it evolved through two phases:

1. **Brutalism** (2014–2019): Raw HTML aesthetics, monospaced fonts, stark minimalism, deliberately "ugly" or unfinished layouts. Think Craigslist or the Drudge Report — utilitarian to the point of hostility.

2. **Neobrutalism** (2020–present): Retains brutalism's structural honesty but adds **warmth, color, and playfulness**. Bold borders meet bright pastels. Grid-based structures are enhanced with hard shadows and intentional contrast. The rawness becomes a feature, not a bug — it communicates authenticity rather than austerity.

Neobrutalism says: *"I'm not trying to trick you. Here's a button. It looks like a button. Click it."*

### Core Principles

#### 1. Structural Honesty

Every element announces what it is. Borders are visible. Containers have edges. The layout grid is not hidden — it's celebrated with thick dividers and prominent spacing. There is no gradient-washed ambiguity about where one section ends and another begins.

**In practice:** We use `border-x-8` on content wrappers, `border-y-8` on the navigation bar, `divide-y-8` between major sections, and `border-4` on cards. Structure is the decoration.

#### 2. High Contrast & Bold Color

Neobrutalist palettes feature **saturated, confident colors** paired with strong contrast ratios. Unlike the muted pastels of minimalism or the atmospheric gradients of glassmorphism, neobrutalism puts color to work — each hue has a job and does it loudly.

**In practice:** Our "Girlie Pop" palette uses hot pink, electric lavender, and warm coral as primaries, with mint, sky, and lemon as sparkle accents. Text contrast meets or exceeds WCAG AA standards not by accident but by design — high contrast is baked into the aesthetic.

#### 3. Hard Shadows (No Blur)

The signature neobrutalist shadow is a **solid-color offset with zero blur** — essentially a duplicate rectangle shifted down and to the right. This creates a "sticker" or "layered paper" effect that emphasizes flatness and physicality. Elements feel like they're stacked on a desk, not floating in a void.

**In practice:** Shadows are defined as flat offsets: `0px 1.5px` (xs), `0px 3px` (sm), `0px 5px` (default), `0px 10px` (lg). On hover, cards translate upward and their shadows grow, creating a satisfying "lift" interaction.

#### 4. Thick Borders, Sharp Edges

Borders in neobrutalism are **prominent** — typically 2–5px solid, often in a dark or contrasting color. Border-radius is minimal or zero on content containers and cards. The exception is **buttons**, which may use `rounded-full` as a deliberate contrast to the angular grid — the roundness reads as friendly and tappable against the blocky layout.

**In practice:** Cards use `border-radius: 0` with `border: 4px solid`. Buttons use `rounded-full` with `border-2`. This tension between angular containers and rounded interactive elements creates visual rhythm.

#### 5. Typography as Architecture

Neobrutalist type is **heavy, unapologetic, and structural**. Headlines use extreme weights (800–900), uppercase transforms, and tight tracking. Text is sized generously — it's not whispered, it's declared. The font itself should be geometric and clean; we use **Inter** (variable), which provides the necessary weight range while remaining supremely readable at body sizes.

**In practice:** Section titles use `font-weight: 900`, `text-transform: uppercase`, and `letter-spacing: 0.03em`. Body text sits at a comfortable 16–18px. The type scale uses `clamp()` for fluid sizing across viewports.

#### 6. Interaction Feedback Is Physical

Hover and focus states should feel **tactile** — elements move, shadows shift, colors invert. The metaphor is physical manipulation: pressing a button pushes it down (shadow shrinks, element translates), hovering lifts a card up (shadow grows, element translates up). This physicality reinforces the "honest structure" principle — interactive elements behave like real objects.

**In practice:**
- **Buttons** on focus: `translate-y-1` + `shadow: none` (pressed down)
- **Cards** on hover: `translate(-4px, -4px)` + shadow grows from `6px 6px` to `10px 10px` (lifted up)
- **Links** on hover: background fill + border color change + arrow icon translates right

---

## The "Girlie Pop" Palette

Our palette diverges from classic neobrutalism (which often defaults to primary-color + black + white) by embracing a **femme-forward, queer-joyful** color story. This is intentional — it signals who the space is for and creates warmth that pure brutalism lacks.

### Semantic Color Roles

| Token | Role | Light Mode | Dark Mode |
|-------|------|------------|-----------|
| `--color-primary` | Brand action, CTAs, active states | Hot Pink/Magenta `oklch(65% 0.25 340)` | Same |
| `--color-secondary` | Supporting accents, nav highlights | Electric Lavender `oklch(70% 0.18 290)` | Same |
| `--color-accent` | Warm highlights, tags, badges | Warm Coral/Peach `oklch(75% 0.15 25)` | Same |
| `--color-pop-mint` | Decorative sparkle | Mint `oklch(80% 0.12 170)` | Same |
| `--color-pop-sky` | Decorative sparkle | Sky Blue `oklch(80% 0.12 230)` | Same |
| `--color-pop-lemon` | Decorative sparkle | Lemon `oklch(88% 0.12 95)` | Same |
| `--bg` | Page background | Warm Cream `oklch(98% 0.01 80)` | Deep Plum `oklch(18% 0.02 320)` |
| `--surface` | Card/container backgrounds | Light Cream `oklch(95% 0.01 80)` | Midnight Purple `oklch(22% 0.02 320)` |
| `--border` | Container borders | Pink-tinted `oklch(70% 0.12 340)` | Muted plum `oklch(35% 0.08 320)` |
| `--text` | Body text | Warm Dark `oklch(25% 0.02 50)` | Light Cream `oklch(92% 0.01 80)` |

### Color System (OKLCH)

All colors are defined in **OKLCH** color space, which provides perceptually uniform lightness and more intuitive color manipulation than HSL or RGB. Each semantic color has a full shade scale (50–950) for flexibility:

- **Secondary** scale (50–950): Pink-undertone warm grays — used for muted UI elements, hover states, borders
- **Accent** scale (50–950): Lavender/purple tones — used for tags, badges, secondary actions
- **Base** scale (50–950): Warm cream/peach tones — used for backgrounds, surfaces, neutral elements

### Dark Mode Philosophy

Dark mode is not an afterthought — it's a **parallel palette**, not an inversion. Light mode uses warm creams and bright accents; dark mode shifts to deep plum/midnight purple backgrounds while keeping the same vibrant primary, secondary, and accent colors. The brand colors (hot pink, lavender, coral) are constants across both modes. Only backgrounds, surfaces, borders, and text colors shift.

Dark mode backgrounds use a **purple hue angle** (320°) rather than pure gray, maintaining the "Girlie Pop" warmth even in low-light viewing.

---

## Design Ancestry: The Ella Mae Template

The site's component architecture and neobrutalist foundation descend from the **Ella Mae** template by Lexington Themes — an Astro-based neobrutalist template. Key inherited patterns:

### What We Kept

- **Thick wrapper borders** (`border-x-8` on `Wrapper.astro`) — the signature neobrutalist "frame" around content
- **Navigation structure** — fixed top nav with 8px top/bottom borders, mobile slide-down menu
- **Button component** — `rounded-full` with `border-2`, multiple size/variant system (default, accent, secondary, muted), flat shadows matching button color
- **Text component** — responsive typography scale from `textXS` to `display6XL` with fluid `clamp()`-based sizing
- **Flat shadow system** — `--shadow-xs` through `--shadow-lg` as no-blur offsets
- **Inter font** — variable weight, geometric sans-serif
- **Component organization** — `fundations/` directory for primitive elements (Button, Text, Wrapper)
- **Marquee animations** — for decorative scrolling elements

### What We Changed

- **Color palette**: Ella Mae uses warm oranges (`secondary-*`) and cool blue-grays (`accent-*`). We replaced these with the Girlie Pop palette (hot pink, lavender, coral, plus sparkle colors).
- **Dark mode**: Ella Mae is light-mode only. We added full dark mode support with CSS custom properties and a `ThemeToggle` component.
- **Border colors**: Ella Mae hardcodes `border-accent-900`. We use CSS variable-driven borders (`--accent-border`, `--border`) that shift with theme.
- **Component library**: We added community-specific components (BuildCard, ForumThreadPreview, WikiArticleCard, MeetupCard, SectionHeader) that carry the neobrutalist language into domain-specific UI.
- **Accessibility**: We added skip-link navigation, `aria-current` for active nav states, semantic landmarks, and WCAG-compliant focus indicators using the primary color.

---

## Component Design Patterns

### Cards (BuildCard, WikiArticleCard, MeetupCard, ForumThreadPreview)

Cards are the primary content container across the site. They follow a consistent pattern:

```
┌─────────────────────────────┐  ← 4px solid border (secondary color)
│  ┌───────────────────────┐  │
│  │     Image / Header    │  │  ← 4px bottom border divider
│  └───────────────────────┘  │
│                             │
│  Title (font-weight: 800)   │
│  Meta line (muted, 0.875rem)│
│                             │
└─────────────────────────────┘
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← 6px 6px 0 hard shadow
```

- `border-radius: 0` — sharp corners
- `border: 4px solid var(--color-secondary)`
- `box-shadow: 6px 6px 0 var(--color-secondary)`
- Hover: `transform: translate(-4px, -4px)` + `box-shadow: 10px 10px 0 var(--color-primary)` — the card lifts and its shadow shifts to the brand color
- Dark mode: shadows swap between primary/secondary colors for variety

### Buttons

Buttons deliberately break from the angular card grid with `rounded-full`, creating visual tension:

```
╭────────────────────────╮  ← 2px solid border, rounded-full
│   BUTTON TEXT (600wt)  │
╰────────────────────────╯
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← flat shadow matching variant color
```

Four variants:
- **Default** (Primary): `bg-primary`, white text, pink shadow
- **Accent** (Coral): `bg-accent`, white text, coral shadow
- **Secondary** (Lavender): `bg-secondary`, white text, lavender shadow
- **Muted** (Outline): transparent bg, primary border, fills on hover

Seven sizes: `xxs` through `xl`, plus icon-only variants.

Focus state: `translate-y-1` + `shadow: none` — pressed-down effect.

### Section Headers

Section headers use the neobrutalist "boxed title" pattern:

```
┌──────────────────┐
│  SECTION TITLE   │  ← 4px border + 4px 4px 0 hard shadow
└──────────────────┘
  Subtitle text below

  ─────────────────────────────  ← 4px bottom border (primary)
```

- Title: `font-weight: 900`, `text-transform: uppercase`, inline-block with border + shadow
- The title box itself becomes a visual anchor — it looks like a label stuck on the page

### Navigation

```
════════════════════════════════════  ← 8px top border (accent)
  ✨ cyberdeck.club    Wiki  Forum  Builds  Meetups  About  🔍  🌙  👤
════════════════════════════════════  ← 8px bottom border (accent)
```

- Fixed position, full-width
- 8px top/bottom borders create a bold horizontal band
- Logo uses `font-weight: 700`, `lowercase`, with sparkle emoji
- Links: medium weight, uppercase would be too aggressive for nav — we use sentence case with `font-weight: 500`
- Active state: primary color + `font-weight: 700`

### Content Wrapper

The `Wrapper` component frames all page content with thick vertical borders:

```
┃                                    ┃  ← 8px side borders
┃  Page content lives here           ┃
┃  max-width: 80rem (2xl: 7xl)       ┃
┃  padding: 2rem horizontal          ┃
┃                                    ┃
```

These side borders are the most distinctively neobrutalist element of the layout — they make the entire page feel like a document with visible margins, reinforcing the "structure is visible" principle.

---

## Typography Scale

We use Inter Variable for all text. The scale is responsive via Tailwind's built-in breakpoint-based sizing:

| Variant | Mobile | Tablet | Desktop | Large Desktop |
|---------|--------|--------|---------|---------------|
| `display6XL` | 2.25rem | 4.5rem | 6rem | 12rem |
| `display5XL` | 2.25rem | 4.5rem | 5rem | 10rem |
| `display4XL` | 2.25rem | 4.5rem | 5rem | 6rem |
| `display3XL` | 3rem | 3.75rem | 4.5rem | 5rem |
| `display2XL` | 3rem | 3rem | 3.75rem | 4.5rem |
| `displayXL` | 2.25rem | 2.25rem | 3rem | 3.75rem |
| `displayLG` | 1.875rem | 1.875rem | 2.25rem | 3rem |
| `displayMD` | 1.5rem | 1.5rem | 1.875rem | 2.25rem |
| `displaySM` | 1.125rem | 1.25rem | 1.5rem | 1.875rem |
| `textXL` | 1.125rem | 1.25rem | 1.5rem | — |
| `textLG` | 1rem | 1.125rem | 1.25rem | — |
| `textBase` | 1rem | — | — | — |
| `textSM` | 0.875rem | — | — | — |
| `textXS` | 0.75rem | — | — | — |

### Type Treatments

- **Headlines**: `font-weight: 700–900`, often `uppercase` with `letter-spacing: 0.03–0.05em`
- **Body text**: `font-weight: 400–500`, natural case, `line-height: 1.5–1.6`
- **Labels/badges**: `font-weight: 700–800`, `uppercase`, `letter-spacing: 0.05–0.08em`, `text-xs` or `text-sm`
- **Meta text** (dates, authors): `font-weight: 500–600`, muted color, `text-sm`

---

## Shadow System

All shadows are **flat offsets** — no blur, no spread. The shadow color matches the element's border or variant color.

| Token | Value | Use Case |
|-------|-------|----------|
| `--shadow-xs` | `0px 1.5px` | Tiny buttons, badges |
| `--shadow-sm` | `0px 3px` | Small buttons, inputs |
| `--shadow` | `0px 5px` | Default buttons, small cards |
| `--shadow-lg` | `0px 10px` | Feature cards, hero elements |
| Card shadows | `6px 6px 0` | Content cards (offset both axes) |
| Hover shadows | `10px 10px 0` | Card hover state (grows on lift) |
| Section title | `4px 4px 0` | Inline section headers |

The shadow always uses a **solid color** from the palette — never black with opacity, never gray. This keeps the playful, graphic quality of the design.

---

## Spacing & Layout

### Grid Philosophy

Layouts use CSS Grid with heavy `divide-*` borders between cells, making the grid structure visible. This is a direct neobrutalist technique borrowed from Ella Mae's feature sections:

```
┌─────────────┬──────────────┐
│             ┃              │  ← 8px divider between columns
│   Content   ┃    Image     │
│             ┃              │
├━━━━━━━━━━━━━┿━━━━━━━━━━━━━━┤  ← 8px divider between rows
│             ┃              │
│   Image     ┃   Content    │
│             ┃              │
└─────────────┴──────────────┘
```

### Spacing Scale

We use Tailwind's default spacing scale. Common patterns:
- Page sections: `py-12` to `py-32`
- Card content padding: `1.25rem` to `1.5rem`
- Gaps between cards in grids: `gap-6` to `gap-8`
- Section header margin-bottom: `3rem`

---

## Accessibility

Neobrutalism is, perhaps surprisingly, a **naturally accessible** design language. Its core traits — high contrast, thick borders, clear hierarchy, and obvious interactive states — align closely with WCAG principles.

### Built-In Accessible Patterns

- **High contrast**: The bold color palette meets WCAG AA contrast ratios for text and interactive elements
- **Thick borders**: Clear delineation between elements aids cognitive parsing and benefits users with low vision
- **Obvious focus states**: `3px solid var(--color-primary)` with `2px offset` — highly visible, uses the brand color
- **Physical interaction metaphors**: Translate + shadow-shift on hover/focus makes state changes perceptible to sighted users
- **Skip-link**: Hidden skip-to-content link appears on keyboard focus
- **Semantic HTML**: Landmarks (`<nav>`, `<main>`, `<footer>`), `aria-label`, `aria-current`, `role` attributes
- **Font sizing**: Minimum body text is 16px (1rem), never smaller than 12px for any visible text

### Dark Mode Accessibility

Dark mode does not reduce contrast — it recalibrates it. Background-to-text contrast ratios are verified in both modes. The primary, secondary, and accent colors maintain their vibrancy in dark mode rather than being desaturated.

---

## Animation & Motion

Animation in neobrutalism is **functional, not decorative** — with one exception: sparkles.

### Functional Motion

- **Theme transitions**: `200ms ease` on `background-color` and `color` — prevents jarring flash on theme toggle
- **Hover/focus transitions**: `150ms ease` on `transform`, `box-shadow`, `color`, `background` — fast enough to feel responsive, slow enough to be perceived
- **Menu open/close**: `300ms ease-in-out` with opacity + translate-y — slide-down effect for mobile nav

### Decorative Motion (Sparkles)

The "sparkle" motif (✦ ✧ emoji glyphs and CSS dot elements) is a deliberate design choice that ties into the "Girlie Pop" identity. Sparkles pulse gently with `scale` and `opacity` keyframes on 2–3 second cycles. They appear in:
- Build card placeholders (when no image is set)
- Footer decorative elements
- Logo (✨ emoji prefix)

Sparkles are marked `aria-hidden="true"` and are purely decorative.

### Respecting Motion Preferences

Future enhancement: wrap all non-essential animations in `@media (prefers-reduced-motion: no-preference)` to respect user system settings.

---

## Design Tokens Reference

### Where Tokens Live

All design tokens are defined in [`src/styles/global.css`](src/styles/global.css) inside the `@theme` block (Tailwind CSS v4 syntax). This makes them available as both CSS custom properties and Tailwind utility classes.

### Token Naming Convention

```
--color-{role}           →  semantic color (primary, secondary, accent)
--color-{role}-{shade}   →  shade scale (50–950)
--color-{purpose}        →  functional colors (bg-light, surface-dark, text-light)
--color-pop-{name}       →  decorative sparkle colors (mint, sky, lemon)
--shadow-{size}          →  shadow offset values (xs, sm, default, lg)
--font-{family}          →  font stack (sans)
--animate-{name}         →  keyframe animations (marquee, rightMarquee, slowMarquee)
```

### Component-Level Variables

Components use intermediate CSS variables that swap based on the active theme class (`.light` / `.dark`):

```css
--bg        →  page background (light or dark)
--surface   →  container background (light or dark)
--border    →  border color (light or dark)
--text      →  text color (light or dark)
--text-muted →  secondary text color (light or dark)
```

---

## Design Principles Summary

1. **Be bold, not hostile.** Neobrutalism can trend toward alienating rawness. Our version is warm, colorful, and welcoming. The boldness is *confidence*, not *aggression*.

2. **Structure is the ornament.** Thick borders, hard shadows, and visible grids are not merely functional — they *are* the aesthetic. Don't hide the skeleton.

3. **Color carries identity.** The Girlie Pop palette isn't decoration — it's a signal of who this space is for. Every color choice should reinforce community and joy.

4. **Interactions should feel physical.** Buttons press down. Cards lift up. Shadows grow and shrink. The UI responds to the user like a tangible surface.

5. **Accessibility is inherent, not bolted on.** High contrast, clear borders, and bold type are accessible *by nature*. Lean into these strengths rather than fighting the style for compliance.

6. **Fun is a feature.** Sparkles, emoji, playful copy ("Built with 💖 and too much caffeine"), and vibrant colors aren't unprofessional — they're *the point*. This is a community site, not an enterprise dashboard.

---

*Last updated: 2026-04-25*
