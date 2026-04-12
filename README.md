# Portfolio Hub Templates

A full-stack, multi-tenant portfolio platform built with vanilla JavaScript and [Supabase](https://supabase.com). Each user gets a fully customisable portfolio page served from a single shared frontend.

---

## Features

| Category | Details |
|---|---|
| **Templates** | 7 niches: Músico, Banda, Acadêmico, Negócios, Logística, Criativo, Custom |
| **Sections** | Hero, Bio/Sobre, Galeria, Música, Discografia, Eventos, Publicações, Serviços, Contato, Seção Livre |
| **Theme Engine** | Dynamic CSS variables — gradient, solid or multi-color; 4 font families; 3 border-radius modes |
| **Radio Player** | Hybrid player supporting MP3 files (Web Audio API + visualiser) and YouTube embeds |
| **Splash Screen** | 6 animated intro styles: Elegant, Glitch, Cinematic, Particles, Terminal, Minimal |
| **Music Reactor** | Real-time color pulse driven by audio frequency data |
| **Admin Panel** | Full CRUD for all content types, drag-and-drop section builder, live theme preview |
| **Media Library** | Supabase Storage upload with drag-and-drop; video preview thumbnails |
| **Auth** | Supabase email/password authentication with password-confirm on register |

---

## Tech Stack

- **Frontend**: Vanilla HTML + CSS + JavaScript (no framework)
- **Backend/Database**: [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)
- **Hosting**: [Netlify](https://netlify.com) (static, `netlify.toml` included)
- **CDN dependencies**: Supabase JS v2, Font Awesome 6.5, Google Fonts, marked.js, DOMPurify

---

## Project Structure

```
portfolio-hub-templates/
├── index.html              # Public portfolio page
├── netlify.toml            # Netlify deploy config
├── supabase-schema.sql     # Initial database schema
├── supabase-migration-v2.sql # Schema migration
├── favicon.svg
│
├── admin/
│   ├── index.html          # Admin panel
│   └── login.html          # Auth page (login + register)
│
├── css/
│   ├── style.css           # Public portfolio styles
│   ├── admin.css           # Admin panel main stylesheet
│   ├── admin/              # Admin component partials
│   └── modules/            # Public portfolio CSS modules
│
└── js/
    ├── config.js           # Supabase client initialisation
    ├── auth.js             # Admin auth guard
    ├── admin.js            # Admin entry point + navigation
    ├── portfolio.js        # Public portfolio entry point
    ├── admin/              # Admin feature modules
    │   ├── core.js         # Shared utilities (toast, modal, upload…)
    │   ├── profile.js
    │   ├── section-builder.js
    │   ├── theme-editor.js
    │   ├── gallery-manager.js
    │   ├── radio-manager.js
    │   ├── events-manager.js
    │   ├── publications-manager.js
    │   ├── services-manager.js
    │   ├── splash-manager.js
    │   └── media-library.js
    └── modules/            # Public portfolio modules
        ├── utils.js        # Helpers: escapeHtml, slugify, formatDuration…
        ├── theme-engine.js # CSS variable injection
        ├── animations.js   # IntersectionObserver reveal + scroll-top
        ├── splash.js       # Splash screen styles
        ├── navbar.js       # Navbar + mobile drawer + active link
        ├── section-renderer.js # Renders all section types
        ├── radio.js        # Hybrid MP3/YouTube player (IIFE)
        ├── music-reactor.js # Audio-reactive visual effects
        └── utils.js
```

---

## Getting Started

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase-schema.sql` in the Supabase SQL editor, then `supabase-migration-v2.sql`.
3. In **Storage**, create a public bucket named `media` and one named `avatars`.
4. Enable **Email Auth** in Authentication → Providers.

### 2. Configure credentials

Edit `js/config.js` and replace the placeholder values:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 3. Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

Or manually:

```bash
# Drag-and-drop the folder in the Netlify dashboard, or:
netlify deploy --prod --dir .
```

The `netlify.toml` already includes the redirect rule that makes pretty URL paths like `/p/my-slug` work.

### 4. First login

Navigate to `/admin/login.html`, create an account, and start building your portfolio.

---

## Public Portfolio URL

| Pattern | Description |
|---|---|
| `/?slug=my-slug` | Portfolio by slug |
| `/p/my-slug` | Pretty URL (requires Netlify redirect) |

Set your slug at **Admin → Configurações**.

---

## Admin Sections

| Page | Hash | Description |
|---|---|---|
| Dashboard | `#dashboard` | Stats, template badge, public URL |
| Template | `#setup` | Choose a template preset |
| Mapa de Seções | `#sections` | Drag-and-drop section builder |
| Tema e Cores | `#theme` | Live theme preview + color picker |
| Perfil / Bio | `#profile` | Name, tagline, bio, avatar, social links |
| Biblioteca de Mídia | `#media` | Upload & manage files |
| Galerias | `#gallery` | Create galleries, reorder items |
| Rádio / Músicas | `#radio` | Playlists with MP3 or YouTube tracks |
| Eventos | `#events` | Event cards with date, location, tickets |
| Publicações | `#publications` | Articles, books, theses, DOI links |
| Serviços | `#services` | Service cards with features and price |
| Modal de Boas-vindas | `#splash` | Splash screen config + live preview |
| Configurações | `#settings` | Slug, name, publish toggle |

---

## Environment Notes

- **Row Level Security (RLS)** must be enabled on all Supabase tables. Each user can only read/write their own data.
- The `config.js` file is committed with the `anon` key (safe for client-side use), but you should **never expose the `service_role` key**.
- The contact form uses a `mailto:` link as fallback; to handle messages server-side, add a Supabase Edge Function or a form service like Formspree.

---

## License

MIT — see [LICENSE](LICENSE).
