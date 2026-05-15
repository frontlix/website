-- Web-chat fallback (Pakket 4b) — additive on `leads`.
-- All columns nullable so personalized-demo rows are unaffected.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS kanaal                    TEXT DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS web_chat_token            TEXT,
  ADD COLUMN IF NOT EXISTS web_chat_link_sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS web_chat_last_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opening_template_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opening_wa_message_id     TEXT;

-- Lookups by token (web-chat magic link) + by message-id (status webhook).
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_web_chat_token ON leads(web_chat_token) WHERE web_chat_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_opening_wa_message_id ON leads(opening_wa_message_id) WHERE opening_wa_message_id IS NOT NULL;

-- Delivery-timeout cron looks for leads where the opening template was sent but
-- no status event arrived within 5 min. Partial index keeps it cheap.
CREATE INDEX IF NOT EXISTS idx_leads_opening_pending
  ON leads(opening_template_sent_at)
  WHERE opening_template_sent_at IS NOT NULL AND web_chat_token IS NULL;
