# FixItSelf — Open Repair Intelligence
> Global design system. Apply on every page. Page-specific overrides go in `pages/[name].md`.

---

## 1. Brand

| | |
|---|---|
| **Name** | FixItSelf (a.k.a. ShootYourSelf / SYS) |
| **Tagline** | Open Repair Intelligence |
| **Personality** | Trustworthy, technical, calm. Editorial precision + repair engineer pragmatism. |
| **Positioning** | Not "AI chatbot." A collaborative system that diagnoses intelligently and democratizes repair. |

The visual language is a **technical field notebook** — confident typography, slate/teal grounding, an orange "voltage" accent, and JetBrains Mono for any operator-facing data. It should feel like a tool a senior repair technician would trust, not a marketing site.

---

## 2. Color tokens

All color is driven by CSS custom properties. Light mode is the default. Add `.dark` to `<html>` to swap to dark.

### Light (default)

| Role | Token | Hex | Usage |
|---|---|---|---|
| Background | `--color-bg` | `#FAFAF9` | Page background (warm paper) |
| Surface | `--color-surface` | `#FFFFFF` | Cards, panels |
| Surface sunken | `--color-surface-sunken` | `#F5F5F4` | Subtle wells, table headers |
| Border | `--color-border` | `#E7E5E4` | Hairline separators |
| Text | `--color-text` | `#0F172A` | Primary text |
| Text secondary | `--color-text-secondary` | `#334155` | Body, secondary |
| Text muted | `--color-text-muted` | `#64748B` | Labels, metadata |
| Primary | `--color-primary` | `#0F766E` | Teal — brand, links, focus |
| Primary strong | `--color-primary-strong` | `#115E59` | Hover/active primary |
| Primary soft | `--color-primary-soft` | `#CCFBF1` | Tinted backgrounds |
| Accent | `--color-accent` | `#EA580C` | Orange — voltage, CTAs, warnings |
| Accent strong | `--color-accent-strong` | `#C2410C` | Hover/active accent |
| Accent soft | `--color-accent-soft` | `#FFEDD5` | Tinted backgrounds |
| Success | `--color-success` | `#16A34A` | Positive states |
| Warning | `--color-warning` | `#D97706` | Cautionary states |
| Danger | `--color-danger` | `#DC2626` | Destructive/error |

### Dark

| Role | Token | Hex | Notes |
|---|---|---|---|
| Background | `--color-bg` | `#0B1120` | True code-editor depth |
| Surface | `--color-surface` | `#111827` | Cards |
| Surface raised | `--color-surface-raised` | `#1E293B` | Elevated panels |
| Border | `--color-border` | `#1F2937` | Subtle on dark |
| Text | `--color-text` | `#F1F5F9` | High-contrast |
| Text muted | `--color-text-muted` | `#94A3B8` | Labels |
| Primary | `--color-primary` | `#2DD4BF` | Brighter teal for dark |
| Accent | `--color-accent` | `#FB923C` | Brighter orange for dark |
| Success | `--color-success` | `#22C55E` | "Run green" — code editor feel |
| Danger | `--color-danger` | `#F87171` | |

> **Contrast:** All foreground/background pairs above meet WCAG AA (4.5:1) for body text and 3:1 for large text/UI. Verify with the dev tools "pick contrast" panel before shipping new components.

---

## 3. Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| Headlines | **Libre Caslon Text** (serif) | 600–700 | Editorial, sets brand voice |
| Body | **Hanken Grotesk** (sans) | 400–600 | Clean, modern |
| Mono / labels | **JetBrains Mono** | 500 | Operator data, IDs, codes |

Type scale (mobile-first):

| Token | Size | Line height | Usage |
|---|---|---|---|
| `--fs-12` | 12px | 1.4 | Fine metadata |
| `--fs-13` | 13px | 1.4 | Mono labels |
| `--fs-14` | 14px | 1.5 | Body sm |
| `--fs-15` | 15px | 1.5 | Result items |
| `--fs-16` | 16px | 1.55 | Body (default) |
| `--fs-18` | 18px | 1.6 | Body lg |
| `--fs-20` | 20px | 1.3 | Headline sm |
| `--fs-24` | 24px | 1.25 | Headline md |
| `--fs-30` | 30px | 1.15 | Headline lg |
| `--fs-36` | 36px | 1.15 | Page titles |
| `--fs-48` | 48px | 1.1 | Hero |

> **Never** set body text below 14px on mobile. Headings: max 1 line height for the largest hero, 1.5 for body.

---

## 4. Spacing

4pt rhythm. Standard gaps:

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Icon gaps, fine adjustments |
| `--space-2` | 8px | Inline spacing |
| `--space-3` | 12px | Tight stacking |
| `--space-4` | 16px | Default padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section padding |
| `--space-8` | 32px | Large gaps |
| `--space-10` | 40px | Section margins |
| `--space-12` | 48px | Major sections |
| `--space-16` | 64px | Hero padding |
| `--space-20` | 80px | Top/bottom hero |
| `--space-24` | 96px | Oversized hero |

---

## 5. Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-xs` | 4px | Tags, checkboxes |
| `--radius-sm` | 6px | Small UI |
| `--radius-md` | 8px | Buttons, inputs, cards |
| `--radius-lg` | 12px | Larger cards |
| `--radius-xl` | 16px | Hero panels, modals |
| `--radius-2xl` | 20px | Decorative |
| `--radius-full` | 9999px | Pills, avatars |

---

## 6. Shadow

| Token | Usage |
|---|---|
| `--shadow-xs` | Hairline lift |
| `--shadow-sm` | Buttons, small cards |
| `--shadow-md` | Cards, popovers |
| `--shadow-lg` | Toasts, dropdowns |
| `--shadow-xl` | Modals, hero overlays |
| `--shadow-glow` | Focus ring (4px) |

---

## 7. Motion

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | 150ms | Hovers, focus |
| `--duration-base` | 200ms | Default state changes |
| `--duration-slow` | 300ms | Layout, modals |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enter animations |
| `--ease-in` | `cubic-bezier(0.55, 0, 1, 0.45)` | Exit animations |

> Always respect `prefers-reduced-motion: reduce` (handled in styles.css).

---

## 8. Iconography

- **Library:** Material Symbols Outlined (existing dependency)
- **Sizes:** 16px (inline), 18px (button), 20px (list), 22px (icon btn), 24px (default), 32–40px (feature/hero)
- **Stroke:** Use `FILL 0, wght 400` default; `FILL 1` only for selected/active state (e.g., nav active item)
- **Color:** Inherits from `color` (semantic). Never use raw hex on icons.
- **Decorative icons** must have `aria-hidden="true"`. Functional icons in icon-only buttons need `aria-label` on the button.

---

## 9. Layout

### App shell

```
┌──────────────────────────────────────────────┐
│  AppHeader (sticky, 64px, glass)            │
├──────────────────────────────────────────────┤
│                                              │
│  AppMain (max 1280px, 24px gutter)           │
│  ┌────────┬────────────────────────────┐    │
│  │Sidebar │ Page content               │    │
│  │(≥1024) │                            │    │
│  └────────┴────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- **AppHeader:** 64px tall, sticky, glass surface. Brand left, primary nav center, actions right.
- **Sidebar:** 280px wide on ≥1024px. Sticky below header. Hidden on mobile, slides in from left as drawer.
- **Page content:** max-width 1280px, 24px horizontal padding, 16px on mobile.

### Grid

- **Stats:** `repeat(auto-fit, minmax(180px, 1fr))` (2 cols on mobile, 4 on desktop)
- **Features:** `repeat(auto-fit, minmax(260px, 1fr))`
- **Forms:** Single column, full-width inputs

---

## 10. Components (reference)

All component classes are defined in `frontend/styles.css`. Use them, not Tailwind utility compositions, for cross-page consistency.

| Component | Classes |
|---|---|
| Buttons | `.btn` + `.btn--primary` / `.btn--accent` / `.btn--secondary` / `.btn--ghost` / `.btn--danger`; size mods `.btn--sm` / `.btn--lg`; `.btn--icon`; `.btn--block` |
| Cards | `.card` + `.card--interactive` / `.card--sunken` / `.card--accent-top` / `.card--primary-top` |
| Stat cards | `.stat-card` + `.stat-card__value` / `.stat-card__label` / `.stat-card__delta` |
| Badges | `.badge` + `.badge--primary` / `.badge--accent` / `.badge--success` / `.badge--warning` / `.badge--danger` / `.badge--info` / `.badge--neutral` |
| Inputs | `.input` / `.textarea` / `.select`; mods `.input--mono` / `.input--lg` / `.input--error` |
| Tabs | `.tabs` + `.tab.is-active` (or `.page-nav` for the pill-style alternative) |
| Pills | `.pill-group` + `.pill.is-active` |
| Tables | `.table-wrap` + `.table` |
| Code | `<pre>`, `<code>`, `<kbd>` |
| Trust meter | `.trust-meter` + `.trust-bar` + `.trust-bar__fill--high/med/low` |
| Toasts | `.toast-container` + `.toast` + `.toast--success/error/info/warning` |
| Modal | `.modal-backdrop` + `.modal` |
| Chat | `.chat-message` + `.chat-avatar` + `.msg-bubble` + `.choice-card` + `.prompt-chip` |
| Hero | `.hero` + `.hero--dark` + `.hero__eyebrow` + `.hero__cta` |
| Feature | `.feature` + `.feature__icon` |
| Skeleton | `.skeleton` + `--text` / `--block` / `--avatar` |
| Status | `.status-dot` + `--online` / `--busy` / `--offline` / `--pulse` |
| Progress | `.progress` + `.progress__fill` + `--accent` / `--success` |

> **CRITICAL:** When adding new components, prefer a named class in styles.css over a Tailwind utility soup. This keeps the design system the single source of truth.

---

## 11. Interaction states

Every interactive element must have:

| State | Visual |
|---|---|
| **Default** | base styles |
| **Hover** | `--color-surface-sunken` background OR color shift, 150ms ease-out |
| **Active/pressed** | `translateY(1px)` or `scale(0.97)`, no color flash |
| **Focus-visible** | 2px ring in `--color-ring` + 4px glow `--shadow-glow` |
| **Disabled** | 50% opacity, `pointer-events: none` |
| **Loading** | Skeleton placeholder for >300ms operations |

---

## 12. Accessibility

- WCAG 2.1 AA minimum
- All touch targets ≥ 40×40px (≥ 44×44px on iOS)
- Visible focus on all interactive elements
- All icons that convey meaning have text labels or `aria-label`
- Decorative icons get `aria-hidden="true"`
- Color is never the only signal — pair with icon or text
- Headings form a strict hierarchy (h1 → h6)
- Skip-to-content link on long pages (optional)
- Form fields have visible labels, not placeholder-only
- Live regions for dynamic content (`aria-live="polite"`)
- All images have descriptive `alt` text

---

## 13. Page-specific overrides

If a page deviates from the global rules, document it in `pages/[page-name].md` with a clear rationale. Currently no overrides — the global system covers all 12 pages.

| Page | Override |
|---|---|
| `index.html` | _none_ |
| `chat.html` | _redirects to `index.html` via meta refresh_ |
| `admin.html` | _none_ |
| `community.html` | _none_ |
| `vision.html` | _none_ |
| `telemetry.html` | _none_ |
| `device-memory.html` | _none_ |
| `offline.html` | _none_ |
| `ar.html` | _none_ |
| `ecosystem.html` | _none_ |
| `privacy.html` | _none_ |
| `404.html` | _none_ |

---

## 14. Pre-delivery checklist

Before shipping UI changes, verify:

- [ ] No emojis used as icons (use Material Symbols)
- [ ] All icons from one family with consistent stroke
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states with 150–300ms transitions
- [ ] Light + dark contrast ratios ≥ 4.5:1 for body, ≥ 3:1 for UI
- [ ] Focus states visible on keyboard nav
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375, 768, 1024, 1440
- [ ] No content hidden behind fixed elements
- [ ] No horizontal scroll on mobile
- [ ] All form fields have visible labels
- [ ] All interactive elements ≥ 40×40px touch target
- [ ] All JS IDs/classes from the existing app still resolve (no functional regressions)
