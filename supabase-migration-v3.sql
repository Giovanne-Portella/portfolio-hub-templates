-- Migration v3
-- Run this in the Supabase SQL Editor for your project.

-- v3.1: Add video_thumbnail_url to gallery_items (if migration v2.1 was not applied)
ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- v3.2: Add track_type and youtube_id to playlist_tracks
ALTER TABLE playlist_tracks
  ADD COLUMN IF NOT EXISTS track_type TEXT NOT NULL DEFAULT 'file'
    CHECK (track_type IN ('file', 'youtube'));

ALTER TABLE playlist_tracks
  ADD COLUMN IF NOT EXISTS youtube_id TEXT;

-- v3.3: Make media_id nullable so YouTube-only tracks can be inserted without a media file
ALTER TABLE playlist_tracks
  ALTER COLUMN media_id DROP NOT NULL;
