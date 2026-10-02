# Design System — Awards Académique (Login-Derived Source of Truth)

This design system establishes a single, unified visual language extracted directly from the Login page component and applied app-wide across all dashboards (Student, Instructor, and Admin), pages, and components.

## 1. Design Tokens & Swatches

| Token Name | CSS Variable | Hex / Value | Intended Usage |
| ---------- | ------------ | ----------- | -------------- |
| **Primary Accent** | `--color-primary` | `#6D28D9` | Primary CTA buttons ("Se connecter"), active states, purple highlights |
| **Primary Hover** | `--color-primary-hover` | `#5B21B6` | Hover state for primary buttons and interactive elements |
| **Primary Active** | `--color-primary-active` | `#4C1D95` | Active / pressed state for primary buttons |
| **Ink / Dark Navy** | `--color-ink` | `#101623` | "AA" logo badge, dark headings, high-emphasis ink |
| **Input Background** | `--color-input-bg` | `#F4F6F8` | Form input fields (email, password, text inputs) |
| **Text Muted** | `--color-text-muted` | `#5F6368` | Form field labels ("E-MAIL OU NOM D'UTILISATEUR"), helper text, timestamps |
| **Surface** | `--color-surface` | `#FFFFFF` | Cards, modals, form containers, elevated panels |
| **Surface Alt** | `--color-surface-alt` | `#F7F8FA` | Left brand panel background on auth cards, alternate rows |
| **Border** | `--color-border` | `#E5E7EB` | Dividers, subtle borders, input outlines |

---

## 2. Typography

- **Font Family**: **Inter** (`--font-family-base`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), used universally across all headings, body text, and UI elements.
- **Heading Weight**: Bold (700) with tight tracking, used for primary titles ("Se connecter", "Bon retour !").
- **Label Style**: Uppercase, letter-spaced small text (11-12px, semibold/bold, tracking-wider), used for form labels (`"MOT DE PASSE"`, `"E-MAIL OU NOM D'UTILISATEUR"`).

---

## 3. Border Radius Scale

| Token Name | CSS Variable | Value | Intended Usage |
| ---------- | ------------ | ----- | -------------- |
| **Card Radius** | `--radius-card` | `24px` | Auth cards, large containers, floating panels |
| **Input Radius** | `--radius-input` | `10px` | Text inputs, search bars, selects, checkboxes |
| **Button Radius** | `--radius-button` | `10px` | Primary submit buttons, secondary action buttons |

---

## 4. Component Application Rules

1. **Primary Buttons**: Every primary CTA button app-wide uses `--color-primary` (solid purple fill), white bold text, and `--radius-button` rounding.
2. **Inputs**: Every text input, select, and textarea uses `--color-input-bg` fill with `--radius-input` and subtle focus ring in `--color-primary`.
3. **Labels**: Form field labels must follow the uppercase letter-spaced muted label pattern (`text-xs font-semibold uppercase tracking-wider text-text-muted`).
4. **Logic & Data**: Zero business logic, data-fetching hooks, or routes were modified; this task is strictly design tokens and styling unification.
