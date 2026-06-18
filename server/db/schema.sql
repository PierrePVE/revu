-- server/db/schema.sql
-- Revu database schema.
--
-- Idempotent: every statement uses IF NOT EXISTS, so the whole file is safe to
-- run on every startup (server/db/init.ts applies it when the tables are missing).

-- gen_random_uuid() is built into PostgreSQL 13+. The extension is kept as a
-- safety net for older servers and is a no-op when the function already exists.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Businesses that collect reviews.
CREATE TABLE IF NOT EXISTS commerces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom           VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  -- Used in the public review URL: /avis/[slug] (e.g. "brasserie-du-centre").
  slug          VARCHAR(255) UNIQUE NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Customer reviews. Deleting a commerce removes its reviews (ON DELETE CASCADE).
CREATE TABLE IF NOT EXISTS avis (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id  UUID REFERENCES commerces(id) ON DELETE CASCADE,
  note_globale INTEGER CHECK (note_globale BETWEEN 1 AND 5),
  note_qualite INTEGER CHECK (note_qualite BETWEEN 1 AND 5),
  note_service INTEGER CHECK (note_service BETWEEN 1 AND 5),
  note_attente INTEGER CHECK (note_attente BETWEEN 1 AND 5),
  commentaire  TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Alerts raised by the analyser when a word recurs with poor ratings.
CREATE TABLE IF NOT EXISTS alertes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id  UUID REFERENCES commerces(id) ON DELETE CASCADE,
  mot          VARCHAR(100) NOT NULL,
  mentions     INTEGER NOT NULL,
  note_moyenne DECIMAL(3, 1) NOT NULL,
  -- Only 'critique' or 'attention' are expected.
  niveau       VARCHAR(20) NOT NULL CHECK (niveau IN ('critique', 'attention')),
  vue          BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Indexes for the most common access pattern: fetching a commerce's rows.
CREATE INDEX IF NOT EXISTS idx_avis_commerce_id ON avis (commerce_id);
CREATE INDEX IF NOT EXISTS idx_alertes_commerce_id ON alertes (commerce_id);
