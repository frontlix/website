# Frontlix Dispatch Cockpit — Design

**Datum:** 2026-06-03
**Status:** Ontwerp goedgekeurd door eigenaar (route A)
**Aanleiding:** Instagram-reel van Brian Harms (@ritual.industries) over zijn zelfgebouwde "Dispatch"-app: vanaf de telefoon taken sturen naar parallelle Claude Code-agents op zijn Mac, met scriptbaar vensterbeheer op externe schermen.

---

## 1. Doel

Eén persoonlijke cockpit voor al het Frontlix-werk (code, marketing, operationeel):

1. **Remote dispatch** — vanaf de telefoon taken naar Claude Code-agents sturen die op de MacBook thuis draaien (dichtgeklapt, 2 externe schermen, voeding = clamshell mode).
2. **Mission control** — meerdere agents parallel, met live status-overzicht (wachtrij / lopend / klaar / mislukt).
3. **Scherm-layouts** — vensters op de twee externe schermen met één tik herschikken ("Agent-modus" / "Normaal").

Solo-gebruik, eigen Claude Max 20x-abonnement.

## 2. Kernbeslissing: eigen cockpit op de officiële motor (route A)

De research (2026-06-03, 6 parallelle research-agents + completeness-check) leverde twee doorslaggevende bevindingen:

1. **Anthropic levert de moeilijkste 80% al.** `claude remote-control --spawn=worktree --capacity=N` (research preview, v2.1.51+) geeft parallelle, git-geïsoleerde sessies op de eigen Mac, aanstuurbaar vanaf de Claude-app op de telefoon, met push-notificaties (v2.1.110+) en remote permission-prompts. Alleen uitgaande HTTPS — geen open poorten. Valt onder het Max-abonnement. Bron: https://code.claude.com/docs/en/remote-control
2. **Per 15 juni 2026 wordt een eigen Agent SDK-runner duur en ToS-grijs.** Agent SDK en `claude -p` op subscription-auth vallen dan onder een apart tegoed (Max 20x = $200/mnd, daarna API-tarief); always-on geautomatiseerd gebruik valt buiten "ordinary individual usage". Interactieve sessies — inclusief Remote Control — blijven onder het Max-abonnement vallen. Bron: https://support.claude.com/en/articles/15036540

**Afgewezen alternatieven:**
- *Route B — alles zelf (Agent SDK + Tailscale-bridge + eigen sessie-UI):* na 15 juni structurele kosten + ToS-risico + weken extra bouwen en onderhouden.
- *Route C — alleen officiële tools:* geen eigen Frontlix-taakknoppen, geen statusboard, geen scherm-layouts; dekt de cockpit-wens niet.

## 3. Architectuur

```
[iPhone]
  ├── Claude-app ──────────── Anthropic relay ──→ [Mac] claude remote-control
  │   (sessies volgen, chatten,                     --spawn=worktree --capacity=3
  │    permissions, push)                                  │
  └── Cockpit-PWA ── Tailscale (tailnet-only) ──→ [Mac] Next.js cockpit
                                                          │
                                              [Mac] runner-glue (Node, LaunchAgent)
                                                ├─ leest taken uit Supabase
                                                ├─ spawnt terminal-venster + sessie per taak
                                                ├─ triggert Hammerspoon (hs -c)
                                                └─ meldt resultaat → Slack + Supabase

[Supabase "frontlix-cockpit"]  taken-bus + statusboard (Realtime)
[2 externe schermen]           scherm 1: dashboard groot · scherm 2: agent-terminals
```

### 3.1 Motor (niet bouwen — Anthropic)
- `claude remote-control --spawn=worktree --capacity=3` draait permanent op de Mac.
- Elke taak in een eigen git-worktree; sessies zichtbaar/bestuurbaar in de Claude-app.
- Capacity start op 3 (quota is de bottleneck, niet CPU — zie §6).

### 3.2 Cockpit (bouwen — Next.js PWA, mobiel-first)
- Draait op de Mac; bereikbaar uitsluitend via **Tailscale Serve** (HTTPS binnen het tailnet, geen publiek endpoint). Telefoon krijgt de Tailscale-app; ACL deny-by-default, alleen telefoon → Mac.
- v1-features:
  - **Taakknoppen** per categorie, géén vrije shell: *Deploy site*, *VPS-check*, *Fix bug…* (+ omschrijvingsveld), *LinkedIn-content*, *Lead-check*.
  - **Statusboard** live via Supabase Realtime.
  - **Usage-meter**: 5-uurs venster + Opus-weekbudget vóór een zware taak start.
  - **Scherm-layout-knoppen**: "Agent-modus" / "Normaal".

### 3.3 Runner-glue (bouwen — kleine Node-service)
- LaunchAgent (géén LaunchDaemon — GUI-toegang nodig voor terminal-vensters en Hammerspoon), `RunAtLoad` + `KeepAlive`, logs naar `~/Library/Logs/frontlix-runner/`. Absoluut pad naar de node-binary (launchd kent geen nvm-PATH).
- Pakt taken op uit Supabase, opent per taak een terminal-venster met een Claude-sessie met **unieke venstertitel** (escape-sequence in launch-script), zodat Hammerspoon gericht kan positioneren.
- Resultaat → Slack (primair kanaal, bewezen betrouwbaar op iOS) + status in Supabase.

### 3.4 Supabase
- Nieuw gratis project `frontlix-cockpit`, gescheiden van de Frontlix-site en Schoon Straatje.
- Tabel `dispatch_tasks`: `id, type, params (jsonb), status (queued|running|done|failed|cancelled), session_id, output_summary, created_at, started_at, finished_at`.
- Taken zijn idempotent met expliciete status: valt de Mac weg, dan blijft de wachtrij staan en pakt de runner bij reconnect verder.

### 3.5 Hammerspoon (scherm-layouts)
- Layout "Agent-modus": scherm 1 = cockpit-dashboard groot; scherm 2 = agent-terminals naast elkaar. Layout "Normaal": eigen werk-layout. (Goedgekeurd door eigenaar.)
- Schermen identificeren op **UUID** (`hs.screen:getUUID()`), niet op naam of index.
- Vensters matchen via `hs.window.filter` + `allowTitles` op de unieke sessietitels — niet `hs.layout.apply` (nondeterministisch bij gelijke titels).
- Extern triggeren via de `hs` CLI (`hs -c '...'`, vereist `require("hs.ipc")` in init.lua) — synchroon en met foutmelding, robuuster dan URL-events.
- `hs.screen.watcher` + eigen debounce (~1,5 s) voor clamshell-wissels; re-apply bij ontwaken via `hs.caffeinate.watcher`; handmatige "re-apply layout"-knop als vangnet.

### 3.6 Mac-als-server-config
- `sudo pmset -a disablesleep 1` + `powernap 0`; verifiëren na elke macOS-update (`pmset -g`).
- Voeding + minstens één extern scherm permanent aangesloten (clamshell-vereiste).
- Accessibility-permissie voor Hammerspoon; "Launch Hammerspoon at login".
- FileVault-afweging expliciet: bij koude boot vraagt FileVault fysieke unlock vóór auto-login → LaunchAgent start pas daarna. Keuze eigenaar in fase 1: FileVault aan laten (veiliger, handmatige unlock na stroomuitval) of uit (volautomatisch herstarten).

## 4. Veiligheidsmodel (gelaagd)

1. **Transport:** cockpit alleen binnen het tailnet (Tailscale, deny-by-default ACL). Geen publiek endpoint.
2. **Taak-validatie:** telefoon stuurt nooit rauwe shell — alleen voorgedefinieerde taaktypes met parameters die de runner server-side tegen een whitelist valideert.
3. **Claude-permissions:** per taaktype een eigen allow-profiel; nooit `bypassPermissions` voor telefoon-getriggerde taken; harde deny-regels (`rm`, `sudo`, push naar `main`) als vangnet.
4. **Mens-in-de-lus:** deploy- en andere destructieve taken vragen expliciete bevestiging via de permission-prompt in de Claude-app.
5. **Werkmap-beperking:** agents werken binnen een vaste projectroot (worktrees).

## 5. Faal- en herstelgedrag (recovery-matrix)

| Faalmodus | Taakstatus | Melding | Herstel |
|---|---|---|---|
| Mac slaapt / valt weg | `queued` blijft staan; `running` → `failed` na timeout | Slack-alert "runner offline" (heartbeat-check) | Runner pakt wachtrij op bij reconnect |
| Netwerk > 10 min weg | Remote Control-sessie valt terug | Push vanuit Claude-app stopt; Slack-heartbeat slaat aan | Sessie lokaal nog actief; opnieuw verbinden |
| Agent crasht / taak faalt | `failed` + `output_summary` met reden | Slack-alert | Knop "opnieuw" in cockpit |
| Deploy-fout | `failed` | Slack-alert (bestaand kanaal) | Handmatig; nooit auto-retry op deploys |
| Hammerspoon mist schermwissel | n.v.t. | — | "Re-apply layout"-knop/hotkey |

Geen stille mislukkingen: elke `failed` produceert een Slack-bericht.

## 6. Capaciteit & kosten

- **€0 extra per maand**: alles valt onder Max 20x (interactieve sessies). Geen Agent SDK-route.
- Praktisch parallel-plafond: **~2-3 sessies** (1× Opus voor zwaar werk + 1-2× Sonnet voor routine). De gedeelde account-pool is de bottleneck, niet de Mac. Opus-weekbudget is de schaarste (community-indicatie ~24-40 u/week; mei-verhogingen deels tijdelijk tot ~13 juli 2026).
- Cockpit toont usage vóór het starten van zware taken (ccusage of `/usage`-data).

## 7. Fasering

| Fase | Inhoud | Acceptatie |
|---|---|---|
| **0 — Valideren** (deze week, vóór 15 juni) | a) `claude remote-control --spawn=worktree --capacity=3` live op de Mac + verbinden vanaf Claude-app; b) clamshell-nachttest met `pmset disablesleep`; c) 3 agents parallel → thermiek/throttle meten; d) Tailscale + teststream op 4G met scherm uit; e) testmelding Slack → iPhone; f) bewijzen hoe de runner een taak in een sessie krijgt (terminal-spawn met startprompt vs. Channels-webhook) | Elke test gedocumenteerd geslaagd/gefaald; go/no-go per onderdeel |
| **1 — Fundament** | pmset-config, LaunchAgent-runner (skeleton), Hammerspoon-layouts, Slack-koppeling, Supabase-project + tabel | Taak handmatig in Supabase → sessie start → Slack-melding → status `done` |
| **2 — Cockpit v1** | Next.js PWA: taakknoppen, statusboard (Realtime), scherm-layout-knoppen; Tailscale Serve | Volledige flow vanaf telefoon, buitenshuis op 4G |
| **3 — Polish** | Usage-meter, PWA-push (nice-to-have naast Slack), extra taaktypes | — |

## 8. Open punten & risico's

1. **Research-preview-features** (Remote Control, Channels) kunnen qua vlag-syntax en gedrag wijzigen; fase 0 verifieert tegen de geïnstalleerde versie.
2. **Runner → sessie-injectie** is het spannendste integratiepunt (fase 0f beslist het mechanisme).
3. **Terminal-keuze** (Terminal.app / iTerm2 / Ghostty) bepaalt hoe venstertitels gezet worden; vaststellen in fase 0.
4. **Tailscale op iOS** kan op de achtergrond afgeknepen worden; fase 0d test dit op mobiele data.
5. **Thermiek** onder `disablesleep` + parallelle agents is nooit gemeten op deze Mac (fase 0c).
6. **Exacte Max-limieten** zijn community-indicaties; Anthropic publiceert geen harde cijfers en past ze aan.

## 9. Bronnen (kern)

- Remote Control: https://code.claude.com/docs/en/remote-control
- Agent SDK-tegoed per 15 juni 2026: https://support.claude.com/en/articles/15036540
- Legal & compliance (ordinary use): https://code.claude.com/docs/en/legal-and-compliance
- Hammerspoon: https://www.hammerspoon.org/docs/hs.layout.html · hs.ipc · hs.window.filter · hs.screen.watcher
- Tailscale Serve/ACL: https://tailscale.com/docs/features/tailscale-serve · https://tailscale.com/kb/1018/acls
- Supabase Realtime-limieten: https://supabase.com/docs/guides/realtime/limits
- Referentie-architecturen: Happy/Happier (E2E-relay), Vibe Kanban / claude-squad / Conductor (worktree-per-agent)
