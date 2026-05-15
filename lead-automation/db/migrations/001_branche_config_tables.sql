-- Multi-tenant branche-config (Pakket 1)
-- Twee tabellen die 1-op-1 round-trippen in BrancheConfig (Pydantic).
-- Scalars + JSONB company in branche_settings; rij-per-veld in branche_fields.

CREATE TABLE IF NOT EXISTS branche_settings (
  id                  TEXT PRIMARY KEY,
  label               TEXT NOT NULL,
  agent_name          TEXT NOT NULL,
  personality         TEXT NOT NULL,
  company             JSONB NOT NULL,
  intro_offerte       TEXT NOT NULL,
  aanbod_beschrijving TEXT NOT NULL,
  actie_kort          TEXT NOT NULL,
  actie_lang          TEXT NOT NULL,
  plaatsing_duur_min  INT NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branche_fields (
  branche_id        TEXT NOT NULL REFERENCES branche_settings(id) ON DELETE CASCADE,
  key               TEXT NOT NULL,
  label             TEXT NOT NULL,
  example_question  TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'text',
  enum_values       JSONB,
  unit              TEXT,
  hints             TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (branche_id, key)
);

CREATE INDEX IF NOT EXISTS idx_branche_fields_branche_id ON branche_fields(branche_id);

-- RLS bewust niet enabled: alle DB-calls in lead-automation gebruiken de
-- service-role key (pd_* doet dit ook). Dashboard-frontend gaat via de
-- /dashboard-api/* endpoints, niet direct via PostgREST.
