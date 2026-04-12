# Context Document — Portfolio Hub Templates

> This document describes the architecture, data model, module contracts and known design decisions for developers maintaining or extending the project.

---

## Architecture Overview

```
Browser
  └── index.html  (public portfolio)
        ├── js/config.js          → initialises window.supabase
        ├── js/modules/utils.js   → escapeHtml, slugify, formatDuration…
        ├── js/modules/theme-engine.js  → writes CSS variables to :root
        ├── js/modules/animations.js   → IntersectionObserver reveal + scroll-top
        ├── js/modules/splash.js        → intro animations
        ├── js/modules/navbar.js        → navbar + footer + mobile drawer
        ├── js/modules/section-renderer.js  → renders section HTML from data
        ├── js/modules/radio.js         → IIFE: hybrid MP3 / YouTube player
        ├── js/modules/music-reactor.js → audio-reactive CSS effects
        └── js/portfolio.js             → entry point, data fetching

  └── admin/index.html  (admin panel)
        ├── js/config.js
        ├── js/auth.js           → session guard (redirects to login)
        ├── js/admin.js          → entry point, navigation, dashboard, settings
        └── js/admin/*.js        → one module per content type
```

### Execution Order (Public Portfolio)

1. `config.js` — creates `window.supabase` client
2. Inline `<style>` hides navbar/footer/sections to prevent flash
3. `theme-engine.js` loads CSS variable definitions
4. `portfolio.js` DOMContentLoaded fires:
   a. Reads `?slug=` or path segment `/p/<slug>`
   b. Fetches `portfolios` row → `ThemeEngine.applyTheme()`
   c. If `feature_flags.splash` → shows splash, defers to `_afterSplash` callback
   d. `_afterSplash` fetches profile + sections + galleries + events + publications + services + playlist **in parallel**
   e. `Radio.init()` if radio flag enabled
   f. `renderSections()` — iterates sections, calls per-type renderer
   g. `setupNavbar()`, `setupAnimations()`
   h. `body.classList.add('site-loaded')` — triggers CSS transition to reveal page

### Execution Order (Admin Panel)

1. `auth.js` — async session check; redirects to `login.html` if not authenticated
2. `admin.js` `DOMContentLoaded`:
   a. Session double-check
   b. `ensurePortfolio(userId)` — fetch or auto-create portfolio row
   c. Hash-based navigation via `_navigateTo(page)`
   d. Each page lazy-loads its module (calls `loadXxxPage()`)

---

## Data Model (Supabase)

### `portfolios`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK auth.users | one portfolio per user |
| `slug` | text unique | URL identifier |
| `name` | text | display name |
| `template_type` | text | `musician\|band\|academic\|business\|logistics\|creative\|custom` |
| `theme_config` | jsonb | see *Theme Config shape* |
| `feature_flags` | jsonb | `{ splash, radio, … }` |
| `splash_config` | jsonb | see *Splash Config shape* |
| `is_published` | bool | controls public visibility |

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `portfolio_id` | uuid FK | |
| `full_name` | text | |
| `tagline` | text | short subtitle |
| `bio` | text | |
| `avatar_url` | text | |
| `email` | text | also used for contact mailto |
| `phone` | text | |
| `location` | text | |
| `website` | text | |
| `social_links` | jsonb | `[{ platform, url, icon? }]` |

### `sections`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `portfolio_id` | uuid FK | |
| `section_type` | text | `hero\|bio\|gallery\|music\|discography\|events\|publications\|services\|contact\|custom` |
| `title` | text | nav label |
| `subtitle` | text | |
| `display_order` | int | determines render order |
| `is_visible` | bool | |
| `config` | jsonb | per-type options (heading, cta_label, cta_url, tag, show_form, text) |

### `galleries` / `gallery_items`
- `galleries.layout`: `grid \| masonry \| carousel \| list`
- `gallery_items` links a gallery to a `media_files` row; carries `caption`, `display_order`, `video_thumbnail_url`

### `media_files`
- `file_type`: `image \| audio \| video \| document \| other`
- Stored in Supabase Storage bucket `media`; avatars in bucket `avatars`

### `playlists` / `playlist_tracks`
- One playlist can be active (`is_active = true`)
- `playlist_tracks.track_type`: `file \| youtube`
- `playlist_tracks.youtube_id`: YouTube video ID (for YT tracks)
- Tracks join `media_files` for MP3 metadata

### `events`
- `event_date` stored as UTC ISO string; displayed in local time

### `publications`
- `pub_type`: `article \| book \| thesis \| conference \| other`

### `services`
- `features`: jsonb array of strings

---

## Module Contracts

### `Radio` (IIFE, radio.js)

```js
Radio.init(tracks, opts)     // tracks: array of track objects; opts: { shuffle }
Radio.togglePlay()           // toggle play/pause current track
Radio.prev()                 // go to previous track
Radio.next()                 // go to next track (respects shuffle)
Radio.isPlaying()            // → boolean
Radio.jumpToTrack(idx)       // load track at index and play; opens radio panel
```

Track object shape:
```js
{
  id, track_type,   // 'file' | 'youtube'
  title, artist,
  url,              // file URL (for track_type='file')
  youtube_id,       // YT video ID (for track_type='youtube')
  cover_url,        // optional album art
  duration,         // seconds (0 if unknown)
  media,            // raw media_files row or null
}
```

### `ThemeEngine` (theme-engine.js)

```js
ThemeEngine.applyTheme(config)   // writes CSS vars to document.documentElement
ThemeEngine.getTheme()           // returns current config object
ThemeEngine.loadFromStorage()    // restore last theme from localStorage
```

### `MusicReactor` (music-reactor.js)

```js
MusicReactor.init({ colors, intensity })  // 'low' | 'medium' | 'high'
MusicReactor.update(bass, mid, treble)    // 0–1 normalised floats; called ~60Hz
```

### `setupNavbar(portfolio, profile, sections)` — navbar.js

Renders nav links, mobile drawer, footer social icons, scroll-active highlight.

### `renderSections(sections, data)` — section-renderer.js

`data` shape:
```js
{
  portfolio, profile, flags,
  galleries, galleryItems,    // galleryItems: { [galleryId]: item[] }
  events, publications, services,
  playlistTracks,             // array of track objects (same as Radio)
}
```

---

## Theme Config Shape

```js
{
  colors: ['#7c3aed', '#db2777'],   // 1–5 hex colors
  colorMode: 'gradient' | 'solid',
  gradientDirection: '135deg',
  fontFamily: 'Inter' | 'Space Grotesk' | 'Playfair Display' | 'Roboto',
  borderRadius: 'rounded' | 'sharp' | 'pill',
  animations: 'full' | 'reduced' | 'none',
  musicReactor: true | false,
  reactorIntensity: 'low' | 'medium' | 'high',
  bgOverlay: 0.0–1.0,
}
```

---

## Splash Config Shape

```js
{
  style: 'elegant' | 'glitch' | 'cinematic' | 'particles' | 'terminal' | 'minimal',
  site_name: '',
  tagline: '',
  btn_label: 'Entrar',
  terminal_title: 'portfolio — bash',
  boot_lines: ['[ OK ] ...', ...],
}
```

---

## Feature Flags (`portfolios.feature_flags`)

| Flag | Type | Effect |
|---|---|---|
| `splash` | bool | Shows splash screen on first visit |
| `radio` | bool | Shows floating radio player; loads active playlist |

---

## Known Design Decisions & Gotchas

### Parallel Data Loading
`portfolio.js` builds a `parallelLoads` array with `null` for inactive sections, filters nulls, runs `Promise.all`, then advances an `ri` index counter to map results back to variables. If you add a new conditional fetch, **maintain the same order** as the feature-flag/section-type checks.

### Reveal Animations — Single Observer
`section-renderer.js` no longer calls `_setupReveal()` internally. All `.reveal` element observation is handled by `setupAnimations()` (called once in `_afterSplash`). Do not re-introduce a second observer.

### Lightbox — Single DOM Element
`_setupLightbox` creates a single `#globalLightbox` element if one does not exist and reuses it across multiple gallery sections. Its `_prev`/`_next` functions are overwritten per container so the last gallery opened owns the navigation.

### Admin Navigation
Navigation is hash-based (`window.location.hash`). Each page is a hidden `<div class="admin-page" id="page-xxx">` that gets `.active` when navigated to. All modules expose a `loadXxxPage()` async function called by `admin.js`.

### Settings Form Duplication Prevention
`_loadSettingsPage` clones the `<form>` element with `cloneNode(true)` and replaces the original in the DOM before adding event listeners to avoid listener accumulation on re-navigation.

### Contact Form
The contact section renders a form that, on submit, opens a `mailto:` link pre-filled with the visitor's name, email, and message (using the portfolio owner's `profile.email`). No server-side handler exists.

### YouTube Player Positioning
The YT IFrame is positioned off-screen at `left: -9999px` (not `opacity: 0`) because YouTube may block playback when the iframe is visually hidden with opacity or display:none.

### Auth Flow
- `auth.js` is a minimal async guard for the admin panel — it runs before `admin.js` and redirects instantly if no session.
- `admin.js` performs a second session check to obtain the `user` object for `ensurePortfolio`.
- Login redirect in `admin.js` uses an absolute path (`/admin/login.html`) to work regardless of the current hash. Adjust if deploying to a subdirectory.

---

## Adding a New Section Type

1. Add a row to `SECTION_TYPES` in `js/admin/section-builder.js`
2. Create a `renderXxxSection(el, section, data)` function in `js/modules/section-renderer.js`
3. Register it in the `SECTION_RENDERERS` map at the top of `section-renderer.js`
4. If the section needs database data, add the conditional fetch to `_afterSplash` in `portfolio.js` and pass the data through the `renderSections` call
5. Add the page label to `_sectionLabel()` in `navbar.js`
