-- 028_bot_gepauzeerd.sql
-- Owner-controlled pauze-flag op leads. Wanneer TRUE stopt de Surface-bot
-- met automatisch antwoorden in de WhatsApp-flow voor deze specifieke lead;
-- de owner neemt het gesprek dan zelf over via de dashboard-composer.
--
-- Bot-side: services/webhook.ts checkt deze flag en skipt de CS-agent
-- wanneer hij TRUE is (na de bestaande eigenaar_overgenomen check).
--
-- Dashboard-side: LeadBotStatus toggle + WhatsAppComposer enabled wanneer
-- TRUE. De toggle gaat via POST /dashboard-api/lead/:id/bot-pauzeren.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS bot_gepauzeerd boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads.bot_gepauzeerd IS
  'Owner-controlled pauze: TRUE stopt Surface met automatisch reageren op WhatsApp-berichten voor deze lead. Owner neemt over via dashboard. Default FALSE.';
