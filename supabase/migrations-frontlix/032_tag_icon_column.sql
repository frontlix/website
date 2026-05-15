-- Tag-iconen — per-tag een visueel icoon naast naam + kleur.
--
-- Waarde is een string-key uit ICON_OPTIONS in lib/dashboard/tag-presets.ts
-- (bv. 'Star', 'Flame', 'Crown'). Validatie gebeurt in de server-action;
-- de DB houdt 'm bewust generiek (text) zodat we de iconen-set kunnen
-- uitbreiden zonder migratie.
--
-- Default NULL → fallback naar Tag-icoon in de UI.

ALTER TABLE tags ADD COLUMN icon text;
