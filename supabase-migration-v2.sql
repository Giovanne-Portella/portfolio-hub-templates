-- ============================================================
-- MIGRATION v2 — adiciona splash_config na tabela portfolios
-- Execute no Supabase SQL Editor se o banco já existia antes
-- ============================================================

ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS splash_config JSONB NOT NULL DEFAULT '{
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
  }';

-- Garante que portfolios existentes tenham splash=false por padrão (opt-in)
UPDATE portfolios
SET feature_flags = feature_flags || '{"splash": false}'::jsonb
WHERE NOT (feature_flags ? 'splash');

-- ============================================================
-- MIGRATION v2.1 — thumbnail de vídeo em gallery_items
-- ============================================================
ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
