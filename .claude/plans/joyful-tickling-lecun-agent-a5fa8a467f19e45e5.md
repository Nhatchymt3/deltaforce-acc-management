# Redesign Plan: Shadcn UI via Tweakcn.com

## Current State

### UI Components Used
The app uses Shadcn UI components built on top of `@base-ui/react` (v4 shadcn spec, not Radix UI).
Found components:
- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `input.tsx`
- `label.tsx`
- `select.tsx`
- `switch.tsx`
- `table.tsx`
- `tabs.tsx`
- `toast.tsx`

Also found custom components: `audio-player.tsx`, `dropdown.tsx`, `multi-dropdown.tsx`, `floating-leaderboard.tsx`.

### Colors & Theming

**Tailwind Config (`tailwind.config.ts`)**
Extends theme with custom tactical colors:
- midnight: '#0C0F1A'
- gunmetal: '#1A1F2E'
- brass: '#C9A84C'
- od-green: '#4A6741'
- signal-red: '#B83A3A'
- ash: '#8B8FA3'

**Global CSS (`src/app/globals.css`)**
Defines base variables for Shadcn using OKLCH color space for `--background`, `--foreground`, `--primary`, etc. (standard shadcn v4 schema).
Also sets tactical styling:
- Dark color scheme default
- Background: var(--midnight)
- Subtle grid background (`.stars-bg`)
- Custom animations (`slideInRight`, `scaleIn`, `fadeInUp`, `shimmer`)
- Custom scrollbar styling

**Component Styling Details**
- Components use standard shadcn v4 OKLCH color variable conventions (e.g. `bg-card`, `text-primary-foreground`)
- Uses very modern CSS features like `has-data-[slot=card-footer]`, `color-mix`, container queries (`@container/card-header`), and dynamic CSS variables within classes (`[--card-spacing:--spacing(4)]`).

## Redesign Plan

### 1. Theme Generation (Tweakcn)
1. Go to tweakcn.com to design the new color palette, typography (if changing), and border radius.
2. Select desired presets/custom colors that match the new brand direction.
3. Export the theme (CSS variables format).

### 2. Implement Global Styles
1. Update `src/app/globals.css`:
   - Replace the `:root` and `.dark` blocks with the new Tweakcn OKLCH color variables.
   - Adjust `--radius` if the new design requires sharper/rounder corners.
2. Update `tailwind.config.ts` if the new design implies removing or changing the custom tactical colors (`midnight`, `gunmetal`, `brass`, etc.). If removed, audit custom components for usages and replace with standard Tailwind/Shadcn semantic classes (e.g. `bg-primary`, `text-muted`).
3. Refine or remove tactical elements like `.stars-bg` and hardcoded `var(--midnight)` body background based on the new aesthetic.

### 3. Component Updates (ui.shadcn.com guidelines)
1. The project already uses the newest Shadcn v4 spec (with `@base-ui`, `data-slot`, and modern CSS features).
2. Tweakcn specifically manipulates the global CSS variables and tailwind config. Modifying the base `.tsx` component files is generally *not required* for a Tweakcn-based redesign unless specific structural or variant deviations exist.
3. Audit custom components (`audio-player.tsx`, `floating-leaderboard.tsx`, etc.):
   - They currently hardcode custom colors like `text-brass`, `bg-gunmetal`, `accent-brass`.
   - Refactor these to use Shadcn semantic classes (e.g. `text-primary`, `bg-secondary`, `accent-primary`) to inherit the new Tweakcn theme dynamically.
