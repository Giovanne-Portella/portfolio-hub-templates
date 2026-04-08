-- ============================================================
-- PORTFOLIO TEMPLATES — Supabase Schema
-- ============================================================
-- Versátil para músicos, acadêmicos, negócios, criativos, etc.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PORTFOLIOS — configuração principal por usuário
-- ============================================================
CREATE TABLE portfolios (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Meu Portfólio',
  slug          TEXT UNIQUE,
  template_type TEXT NOT NULL DEFAULT 'custom'
                CHECK (template_type IN ('musician','band','academic','business','logistics','creative','custom')),
  theme_config  JSONB NOT NULL DEFAULT '{
    "colors": ["#7c3aed","#db2777"],
    "colorMode": "gradient",
    "gradientDirection": "135deg",
    "fontFamily": "Inter",
    "borderRadius": "rounded",
    "animations": "full",
    "musicReactor": false,
    "reactorIntensity": "medium",
    "bgOverlay": 0.85
  }',
  feature_flags JSONB NOT NULL DEFAULT '{
    "splash": true,
    "radio": false,
    "gallery": true,
    "events": false,
    "publications": false,
    "services": false,
    "contact": true
  }',
  splash_config JSONB NOT NULL DEFAULT '{
    "terminal_title": "portfolio — bash",
    "boot_lines": [
      "[ OK ] Iniciando sistema...",
      "[ OK ] Carregando módulos CSS",
      "[ OK ] Conectando ao Supabase",
      "[INFO] Buscando configurações",
      "[ OK ] Aplicando tema",
      "[ OK ] Sistema pronto"
    ],
    "btn_label": "[ Pressione Enter ]"
  }',
  is_published  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES — dados pessoais / bio
-- ============================================================
CREATE TABLE profiles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name    TEXT,
  avatar_url   TEXT,
  cover_url    TEXT,
  bio          TEXT,
  tagline      TEXT,
  email        TEXT,
  phone        TEXT,
  location     TEXT,
  website      TEXT,
  social_links JSONB DEFAULT '[]'
);

-- ============================================================
-- SECTIONS — mapa de seções do portfolio
-- ============================================================
CREATE TABLE sections (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  section_type  TEXT NOT NULL,
  title         TEXT,
  subtitle      TEXT,
  display_order INTEGER DEFAULT 0,
  is_visible    BOOLEAN DEFAULT TRUE,
  config        JSONB DEFAULT '{}'
);

-- ============================================================
-- MEDIA LIBRARY — todos os arquivos do usuário
-- ============================================================
CREATE TABLE media_files (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL CHECK (file_type IN ('image','audio','video','document','other')),
  mime_type     TEXT,
  file_size     INTEGER,
  duration      INTEGER,     -- segundos (áudio/vídeo)
  width         INTEGER,
  height        INTEGER,
  thumbnail_url TEXT,
  tags          TEXT[] DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES — categorias genéricas reutilizáveis
-- ============================================================
CREATE TABLE categories (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#58a6ff',
  icon          TEXT,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- GALLERIES — galerias de mídia
-- ============================================================
CREATE TABLE galleries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  layout        TEXT DEFAULT 'grid' CHECK (layout IN ('grid','masonry','carousel','list')),
  display_order INTEGER DEFAULT 0
);

CREATE TABLE gallery_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id    UUID REFERENCES galleries(id) ON DELETE CASCADE NOT NULL,
  media_id      UUID REFERENCES media_files(id) ON DELETE CASCADE NOT NULL,
  caption       TEXT,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- PLAYLISTS — rádio / player
-- ============================================================
CREATE TABLE playlists (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  is_active     BOOLEAN DEFAULT FALSE,
  shuffle       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playlist_tracks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id   UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  media_id      UUID REFERENCES media_files(id) ON DELETE CASCADE NOT NULL,
  title         TEXT,
  artist        TEXT,
  album         TEXT,
  cover_url     TEXT,
  track_order   INTEGER DEFAULT 0
);

-- ============================================================
-- EVENTS — shows, palestras, entregas
-- ============================================================
CREATE TABLE events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    TIMESTAMPTZ,
  location      TEXT,
  ticket_url    TEXT,
  image_url     TEXT,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- PUBLICATIONS — artigos, teses, livros (acadêmicos)
-- ============================================================
CREATE TABLE publications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  authors       TEXT,
  abstract      TEXT,
  published_at  DATE,
  journal       TEXT,
  doi           TEXT,
  url           TEXT,
  pdf_url       TEXT,
  pub_type      TEXT DEFAULT 'article' CHECK (pub_type IN ('article','book','thesis','conference','other')),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- SERVICES — serviços (negócios / logística)
-- ============================================================
CREATE TABLE services (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,
  price         TEXT,
  features      JSONB DEFAULT '[]',
  image_url     TEXT,
  is_featured   BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- CONTENT BLOCKS — blocos customizados em seções
-- ============================================================
CREATE TABLE content_blocks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id  UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  section_id    UUID REFERENCES sections(id) ON DELETE CASCADE,
  block_type    TEXT NOT NULL CHECK (block_type IN ('text','image','video','audio','cta','embed','divider')),
  content       JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE portfolios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks  ENABLE ROW LEVEL SECURITY;

-- SELECT público
CREATE POLICY "Public read portfolios"    ON portfolios      FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Public read profiles"      ON profiles        FOR SELECT USING (TRUE);
CREATE POLICY "Public read sections"      ON sections        FOR SELECT USING (is_visible = TRUE);
CREATE POLICY "Public read media"         ON media_files     FOR SELECT USING (TRUE);
CREATE POLICY "Public read categories"    ON categories      FOR SELECT USING (TRUE);
CREATE POLICY "Public read galleries"     ON galleries       FOR SELECT USING (TRUE);
CREATE POLICY "Public read gallery_items" ON gallery_items   FOR SELECT USING (TRUE);
CREATE POLICY "Public read playlists"     ON playlists       FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read tracks"        ON playlist_tracks FOR SELECT USING (TRUE);
CREATE POLICY "Public read events"        ON events          FOR SELECT USING (TRUE);
CREATE POLICY "Public read publications"  ON publications    FOR SELECT USING (TRUE);
CREATE POLICY "Public read services"      ON services        FOR SELECT USING (TRUE);
CREATE POLICY "Public read blocks"        ON content_blocks  FOR SELECT USING (TRUE);

-- CRUD apenas do dono
CREATE POLICY "Owner portfolios"    ON portfolios      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owner profiles"      ON profiles        FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner sections"      ON sections        FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner media"         ON media_files     FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner categories"    ON categories      FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner galleries"     ON galleries       FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner gallery_items" ON gallery_items   FOR ALL USING (
  gallery_id IN (
    SELECT g.id FROM galleries g
    JOIN portfolios p ON g.portfolio_id = p.id
    WHERE p.user_id = auth.uid()));
CREATE POLICY "Owner playlists"     ON playlists       FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner tracks"        ON playlist_tracks FOR ALL USING (
  playlist_id IN (
    SELECT pl.id FROM playlists pl
    JOIN portfolios p ON pl.portfolio_id = p.id
    WHERE p.user_id = auth.uid()));
CREATE POLICY "Owner events"        ON events          FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner publications"  ON publications    FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner services"      ON services        FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Owner blocks"        ON content_blocks  FOR ALL USING (
  portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKETS (executar no Dashboard ou via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media',      'media',      true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',    'avatars',    true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
