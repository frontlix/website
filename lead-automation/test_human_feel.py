#!/usr/bin/env python3
"""Human-feel regression test for the Frontlix WhatsApp personas.

Usage:
    cd lead-automation
    source venv/bin/activate
    python test_human_feel.py              # full run (50 scenarios)
    python test_human_feel.py --limit 5    # quick smoke test
    python test_human_feel.py --concurrency 15

Requires: OPENAI_API_KEY in env (or .env via config.py).
Output: lead-automation/test_results.md
"""
from __future__ import annotations

import argparse
import asyncio
import json
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))

from llm.reply import generate_reply, _determine_next_tag
from llm.extraction import extract_data
from services.openai_client import get_openai
from models.lead import ConversationMessage


WELCOME_MESSAGES = {
    "zonnepanelen": "Oké, zonnepanelen. Ik ben Sanne. Even wat korte vragen dan maak ik een offerte voor je.",
    "dakdekker": "Oké, dakwerk. Ik ben Bram. Even wat vragen dan kan ik een offerte maken.",
    "schoonmaak": "Oké, schoonmaak. Ik ben Lotte. Even een paar korte vragen dan heb ik genoeg voor een offerte.",
}

MAX_TURNS = 20


# ─── Scenario generation ────────────────────────────────────────────────

TEMPO = ["rustig_zinnen", "kort_eenwoord", "chaotisch_typos"]
ZEKERHEID = ["alles_weet", "twijfelt_op_2", "weet_bijna_niks"]
EMOTIE = ["neutraal", "urgent_lek", "geirriteerd", "enthousiast", "verstrooid"]
EMAIL_MODE = ["correct_direct", "typo_gail", "typo_gmial", "missing_tld", "whitespace", "pas_na_herhalen"]
OFFTOPIC = ["blijft_on", "small_talk", "vraag_prijs_tussendoor"]
NAAM_MOMENT = ["direct", "pas_na_tweede_vraag", "onduidelijk"]
FOTO = ["heeft_foto", "geen_foto"]


@dataclass
class Scenario:
    id: int
    branche: str
    tempo: str
    zekerheid: str
    emotie: str
    email_mode: str
    offtopic: str
    naam_moment: str
    foto: str
    naam: str
    real_email: str

    def persona_brief(self) -> str:
        return (
            f"Branche: {self.branche}. Echte naam: {self.naam}. "
            f"Echte email wens: {self.real_email}. "
            f"Tempo: {self.tempo}. Zekerheid: {self.zekerheid}. Emotie: {self.emotie}. "
            f"Email-gedrag: {self.email_mode}. Off-topic: {self.offtopic}. "
            f"Naam-moment: {self.naam_moment}. Foto's: {self.foto}."
        )


DUTCH_NAMES = ["Mark", "Peter", "Sara", "Lisa", "Jeroen", "Anne", "Tom", "Eva", "Bas", "Kim",
               "Daan", "Julia", "Thijs", "Noa", "Ruben", "Sophie", "Max", "Fenna", "Luuk", "Mila"]


def build_scenarios(n: int = 50) -> list[Scenario]:
    random.seed(42)
    scenarios: list[Scenario] = []
    branches_rotated = ["zonnepanelen"] * 17 + ["dakdekker"] * 17 + ["schoonmaak"] * 16
    random.shuffle(branches_rotated)

    for i in range(n):
        branche = branches_rotated[i] if i < len(branches_rotated) else random.choice(["zonnepanelen", "dakdekker", "schoonmaak"])
        naam = random.choice(DUTCH_NAMES)
        domain = random.choice(["gmail.com", "hotmail.com", "outlook.com", "icloud.com"])
        real_email = f"{naam.lower()}.{random.randint(10,99)}@{domain}"

        # Pick axes — guarantee at least 2 challenging axes per scenario
        tempo = random.choice(TEMPO)
        zek = random.choice(ZEKERHEID)
        emo = random.choice(EMOTIE)
        em = random.choice(EMAIL_MODE)
        ot = random.choice(OFFTOPIC)
        nm = random.choice(NAAM_MOMENT)
        ft = random.choice(FOTO)

        scenarios.append(Scenario(
            id=i + 1, branche=branche,
            tempo=tempo, zekerheid=zek, emotie=emo,
            email_mode=em, offtopic=ot, naam_moment=nm, foto=ft,
            naam=naam, real_email=real_email,
        ))
    return scenarios


# ─── Customer LLM ───────────────────────────────────────────────────────

CUSTOMER_SYSTEM = """Je speelt een Nederlandse klant op WhatsApp die een offerte aanvraagt.
Speel je profiel consistent en realistisch. Schrijf zoals een echte WhatsApp-gebruiker: informeel, soms typos, kort.

PROFIEL:
{profile}

GEDRAGSREGELS:
- Max 20 woorden per bericht, meestal veel korter
- Volg je profiel-assen strikt (tempo/zekerheid/emotie/email/naam-moment/foto)
- tempo=kort_eenwoord → meestal 1-3 woorden antwoorden
- tempo=chaotisch_typos → bouw typos in (krijt/krijg, ff, effe, wrm, gwn)
- emotie=urgent_lek → benadruk haast in eerste bericht ("dringend", "lekt al")
- emotie=geirriteerd → 1-2× chagrijnig reageren ("waarom zoveel vragen", "pff"), niet constant
- emotie=verstrooid → 1× zeggen "moment" of "ga ff kijken"
- zekerheid=weet_bijna_niks → bij elke 2e feitelijke vraag "weet ik niet" / "geen idee"
- email_mode=typo_gail → geef eerst "<naam>@gail.com", corrigeer pas als bot ernaar vraagt
- email_mode=typo_gmial → "<naam>@gmial.com" eerst
- email_mode=missing_tld → "<naam>@gmailcom" eerst
- email_mode=whitespace → spatie in het adres
- email_mode=pas_na_herhalen → doe alsof je de vraag mist, bot moet 2× vragen
- email_mode=correct_direct → geef direct correcte email
- naam_moment=direct → geef naam zodra gevraagd
- naam_moment=pas_na_tweede_vraag → eerst ontwijken ("maakt dat uit?"), dan naam
- naam_moment=onduidelijk → "ik ben van <familie>" of iets vaag, pas na doorvragen de naam
- offtopic=vraag_prijs_tussendoor → ergens halverwege prijs vragen
- offtopic=small_talk → 1× iets random ("lekker weer he")
- foto=heeft_foto → zeg "ja heb ik" maar stuur niks (simulatie heeft geen echte foto's)
- foto=geen_foto → zeg "nee geen foto's"

Als je alle info hebt gegeven en de bot bevestigt dat je een mailtje krijgt met de offerte: antwoord met EXACT "[END]" om het gesprek te beëindigen.
Als het gesprek stuk lijkt te zijn of meer dan 15 beurten duurt: antwoord "[END]".

NOOIT uit je rol stappen. NOOIT meta-commentaar.
"""


async def customer_reply(client, scenario: Scenario, history: list[ConversationMessage]) -> str:
    """Generate the customer's next message."""
    sys_prompt = CUSTOMER_SYSTEM.format(profile=scenario.persona_brief())
    msgs: list[dict] = [{"role": "system", "content": sys_prompt}]
    for m in history:
        # From customer POV: flip roles
        role = "user" if m.role == "assistant" else "assistant"
        msgs.append({"role": role, "content": m.content})
    # Kick off
    msgs.append({"role": "system", "content": "Schrijf nu je volgende WhatsApp-bericht (of [END] als het klaar is)."})

    resp = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4o-mini",
        temperature=0.85,
        max_tokens=60,
        messages=msgs,
    )
    return (resp.choices[0].message.content or "").strip()


# ─── Conversation simulation ────────────────────────────────────────────

async def simulate(scenario: Scenario) -> dict:
    """Run one full conversation, return transcript + meta."""
    client = get_openai()
    history: list[ConversationMessage] = []
    identity = {"naam": None, "email": None}
    data: dict[str, str] = {}
    collected_data: dict[str, Any] = {}

    # Initial customer trigger — they already chose the branche via button
    opener_map = {
        "zonnepanelen": "zonnepanelen",
        "dakdekker": "dakdekker",
        "schoonmaak": "schoonmaak",
    }
    history.append(ConversationMessage(role="user", content=opener_map[scenario.branche]))

    # Welcome (hardcoded in production)
    welcome = WELCOME_MESSAGES[scenario.branche]
    history.append(ConversationMessage(role="assistant", content=welcome))

    # First question
    reply = await generate_reply(scenario.branche, history, identity, data, collected_data)
    if not reply.strip().upper().startswith("[WAIT]"):
        history.append(ConversationMessage(role="assistant", content=reply))

    for turn in range(MAX_TURNS):
        # Customer
        try:
            cust = await customer_reply(client, scenario, history)
        except Exception as e:
            return {"scenario": scenario, "history": history, "status": f"customer_error: {e}"}

        if not cust or "[END]" in cust.upper():
            return {"scenario": scenario, "history": history, "status": "completed"}

        history.append(ConversationMessage(role="user", content=cust))

        # Extract
        try:
            extracted = await extract_data(scenario.branche, history, identity, data)
        except Exception as e:
            extracted = {}

        if isinstance(extracted.get("naam"), str):
            identity["naam"] = extracted["naam"]
        if isinstance(extracted.get("email"), str):
            identity["email"] = extracted["email"]
        if isinstance(extracted.get("data"), dict):
            data.update(extracted["data"])

        # Simulate photo step: when NEXT would be PHOTO_STEP, auto-resolve based on scenario
        next_tag = _determine_next_tag(scenario.branche, identity, data, collected_data)
        if next_tag == "PHOTO_STEP":
            # We'll let the bot ask, customer will reply no/yes.
            # After customer answers, mark done.
            pass

        # Bot reply
        try:
            reply = await generate_reply(scenario.branche, history, identity, data, collected_data)
        except Exception as e:
            return {"scenario": scenario, "history": history, "status": f"bot_error: {e}"}

        if reply.strip().upper().startswith("[WAIT]"):
            # Simulate customer sending a follow-up
            continue

        history.append(ConversationMessage(role="assistant", content=reply))

        # If photo step was just asked, mark done after any customer reply
        if next_tag == "PHOTO_STEP":
            collected_data["_photo_step_done"] = True

        # Done when COMPLETE happened
        if _determine_next_tag(scenario.branche, identity, data, collected_data) == "COMPLETE" and identity.get("email"):
            # Let COMPLETE fire one more time
            final = await generate_reply(scenario.branche, history, identity, data, collected_data)
            history.append(ConversationMessage(role="assistant", content=final))
            return {"scenario": scenario, "history": history, "status": "completed"}

    return {"scenario": scenario, "history": history, "status": "max_turns"}


# ─── Evaluation ─────────────────────────────────────────────────────────

RUBRIC_SYSTEM = """Je evalueert of een WhatsApp-bot (Frontlix persona Bram/Sanne/Lotte) menselijk en persoonlijk overkomt.

Scoor ELK bot-bericht (behalve de eerste hardcoded welcome) op 6 dimensies, elk 0/1/2:

1. CONTENT_REACTIE — refereert bot concreet aan wat klant zei? (0=generiek/niks, 1=licht, 2=specifiek)
2. NATUURLIJKHEID — voelt als mens of als formulier? (passend bij persona: Bram=droog, Sanne=warm, Lotte=zorgzaam)
3. STRUCTUUR — REACTION+QUESTION vloeiend? (0=alleen vraag, 1=staccato, 2=vloeiend) — N.v.t. voor allereerste veld-vraag en COMPLETE, geef dan 2
4. EMOTIONAL_AWARENESS — reageert op emotie klant? (0=negeert, 2=past bij persona; 2 als n.v.t.)
5. LENGTE — 1-3 zinnen, geen bloat? (0=te lang/kort, 2=strak)
6. NAAM_FORMAT — correct naam-gebruik, geen "Assistent:"/"Bram:" prefix, geen dashes? (0=fout, 2=schoon)

Geef ALLEEN valide JSON terug, geen uitleg:
{
  "messages": [
    {"idx": 0, "text": "<bot-bericht>", "scores": {"content": 2, "natuur": 2, "structuur": 2, "emotie": 2, "lengte": 2, "format": 2}, "total": 12, "notes": "<max 10 woorden per laag-scorend bericht, anders leeg>"}
  ],
  "avg": <gemiddelde totaal>,
  "weakest_idx": <idx van laagst scorend bericht>,
  "weakest_dim": "<dimensie met laagste gemiddelde>"
}
"""


async def evaluate(transcript: list[ConversationMessage], branche: str) -> dict:
    """LLM-based rubric evaluation. Returns JSON dict."""
    client = get_openai()
    # Only score bot messages except the hardcoded welcome (index-based)
    lines = []
    bot_idx = 0
    for m in transcript:
        if m.role == "assistant":
            lines.append(f"[BOT #{bot_idx}] {m.content}")
            bot_idx += 1
        else:
            lines.append(f"[KLANT] {m.content}")
    body = "\n".join(lines)

    resp = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4o",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": RUBRIC_SYSTEM},
            {"role": "user", "content": f"Branche/persona: {branche}\n\nTranscript:\n{body}\n\nNegeer BOT #0 (hardcoded welcome). Scoor vanaf BOT #1."},
        ],
    )
    try:
        return json.loads(resp.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        return {"messages": [], "avg": 0, "weakest_idx": -1, "weakest_dim": "parse_error"}


# ─── Orchestration ──────────────────────────────────────────────────────

async def run_one(scenario: Scenario, sem: asyncio.Semaphore) -> dict:
    async with sem:
        t0 = time.time()
        try:
            sim = await simulate(scenario)
            ev = await evaluate(sim["history"], scenario.branche)
            return {
                "scenario": scenario,
                "history": sim["history"],
                "status": sim["status"],
                "eval": ev,
                "duration_s": round(time.time() - t0, 1),
            }
        except Exception as e:
            return {"scenario": scenario, "history": [], "status": f"error: {e}", "eval": {}, "duration_s": 0}


def aggregate(results: list[dict]) -> dict:
    all_msgs: list[dict] = []
    per_branche: dict[str, list[float]] = {"zonnepanelen": [], "dakdekker": [], "schoonmaak": []}
    dim_sums: dict[str, list[int]] = {k: [] for k in ["content", "natuur", "structuur", "emotie", "lengte", "format"]}

    for r in results:
        ev = r.get("eval") or {}
        msgs = ev.get("messages") or []
        for m in msgs:
            sc = m.get("scores") or {}
            for k in dim_sums:
                if isinstance(sc.get(k), (int, float)):
                    dim_sums[k].append(sc[k])
            all_msgs.append({**m, "branche": r["scenario"].branche, "scenario_id": r["scenario"].id})
        if isinstance(ev.get("avg"), (int, float)):
            per_branche[r["scenario"].branche].append(ev["avg"])

    def avg(xs):
        return round(sum(xs) / len(xs), 2) if xs else 0.0

    def pct_low(xs):
        return round(100 * sum(1 for x in xs if x <= 1) / len(xs), 1) if xs else 0.0

    return {
        "dim_avg": {k: avg(v) for k, v in dim_sums.items()},
        "dim_pct_low": {k: pct_low(v) for k, v in dim_sums.items()},
        "branche_avg": {k: avg(v) for k, v in per_branche.items()},
        "all_msgs": all_msgs,
        "total_conversations": len(results),
        "completed": sum(1 for r in results if r.get("status") == "completed"),
    }


def render_transcript(result: dict) -> str:
    lines = [f"**Scenario {result['scenario'].id}** — {result['scenario'].branche} | {result['scenario'].persona_brief()}"]
    lines.append(f"Status: {result.get('status')} | Avg: {(result.get('eval') or {}).get('avg', '?')} | Duration: {result.get('duration_s')}s")
    lines.append("")
    for m in result["history"]:
        who = "👤 Klant" if m.role == "user" else "🤖 Bot"
        lines.append(f"- **{who}:** {m.content}")
    return "\n".join(lines)


def render_report(results: list[dict], agg: dict, out_path: Path) -> None:
    dim_labels = {
        "content": "Content-reactie", "natuur": "Natuurlijkheid", "structuur": "Structuur",
        "emotie": "Emotional awareness", "lengte": "Lengte", "format": "Naam/format"
    }

    lines = ["# Human-feel regressie-rapport", ""]
    lines.append(f"**Totaal gesprekken:** {agg['total_conversations']} · **Completed:** {agg['completed']}")
    lines.append("")

    lines.append("## Dashboard — dimensie scores")
    lines.append("| Dimensie | Gemiddelde (0-2) | % berichten score ≤1 |")
    lines.append("|---|---|---|")
    for k, label in dim_labels.items():
        lines.append(f"| {label} | {agg['dim_avg'].get(k, 0)} | {agg['dim_pct_low'].get(k, 0)}% |")
    lines.append("")

    lines.append("## Per branche")
    lines.append("| Branche | Gemiddelde totaal (max 12) |")
    lines.append("|---|---|")
    for b, v in agg["branche_avg"].items():
        lines.append(f"| {b} | {v} |")
    lines.append("")

    # Worst 5 messages
    sorted_msgs = sorted(agg["all_msgs"], key=lambda m: m.get("total", 12))
    lines.append("## Slechtste 10 bot-berichten")
    for m in sorted_msgs[:10]:
        lines.append(f"- **[{m['branche']} #{m['scenario_id']}]** score {m.get('total', '?')}/12: \"{m.get('text', '')[:140]}\" — {m.get('notes', '')}")
    lines.append("")

    # 3 slechtste + 2 beste transcripts
    sorted_convos = sorted(results, key=lambda r: (r.get("eval") or {}).get("avg", 12))
    lines.append("## 3 slechtste transcripts")
    for r in sorted_convos[:3]:
        lines.append("")
        lines.append(render_transcript(r))
    lines.append("")
    lines.append("## 2 beste transcripts")
    for r in sorted_convos[-2:]:
        lines.append("")
        lines.append(render_transcript(r))
    lines.append("")

    lines.append("## Volgende stap")
    lines.append("Identificeer patronen in de 10 slechtste berichten en de 3 slechtste transcripts — welke prompt-sectie faalt structureel? Stel voor welke regel(s) in reply.py aangepast moeten worden.")

    out_path.write_text("\n".join(lines), encoding="utf-8")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--out", default="test_results.md")
    args = parser.parse_args()

    scenarios = build_scenarios(50)[: args.limit]
    print(f"Running {len(scenarios)} scenarios with concurrency={args.concurrency}...")
    sem = asyncio.Semaphore(args.concurrency)

    t0 = time.time()
    tasks = [run_one(s, sem) for s in scenarios]
    results = []
    for i, coro in enumerate(asyncio.as_completed(tasks), 1):
        r = await coro
        results.append(r)
        st = r.get("status", "?")
        avg = (r.get("eval") or {}).get("avg", "?")
        print(f"[{i}/{len(scenarios)}] scenario {r['scenario'].id} ({r['scenario'].branche}) → {st}, avg={avg}")
    dur = round(time.time() - t0, 1)
    print(f"\nAll done in {dur}s. Aggregating...")

    # Deterministic order by scenario id for the report
    results.sort(key=lambda r: r["scenario"].id)
    agg = aggregate(results)
    out = Path(__file__).parent / args.out
    render_report(results, agg, out)
    print(f"Report → {out}")


if __name__ == "__main__":
    asyncio.run(main())
