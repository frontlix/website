"""Web-chat fallback route — Pakket 4b.

GET  /chat/<token>            → server-rendered minimal chat UI
POST /chat/<token>/message    → reuses _handle_collecting from routes/webhook.py
                                 with a buffer-sender so replies land in JSON.

Same DB persistence (conversations + leads.collected_data) so the conversation
history is unified across channels. Once the token is used, the lead `kanaal`
column reflects `web_chat` and incoming WhatsApp messages still route through
the regular webhook — both channels stay live on the same lead.
"""
from __future__ import annotations

from html import escape
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse

from services.supabase import get_supabase


router = APIRouter()


def _find_lead_by_token(token: str) -> dict[str, Any] | None:
    if not token:
        return None
    resp = (
        get_supabase().table("leads").select("*")
        .eq("web_chat_token", token).limit(1).execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def _fetch_history_rows(lead_id: str) -> list[dict[str, Any]]:
    resp = (
        get_supabase().table("conversations").select("role, content, created_at")
        .eq("lead_id", lead_id).order("created_at").execute()
    )
    return resp.data or []


@router.get("/chat/{token}", response_class=HTMLResponse)
async def render_chat(token: str) -> HTMLResponse:
    lead = _find_lead_by_token(token)
    if not lead:
        return HTMLResponse(content=_NOT_FOUND_HTML, status_code=404)

    history_rows = _fetch_history_rows(lead["id"])
    thread_html = "".join(
        f'<div class="msg {escape(r["role"])}"><div class="bubble">{escape(r["content"])}</div></div>'
        for r in history_rows
    )
    naam = escape(lead.get("naam") or "")
    html = _CHAT_HTML_TEMPLATE.replace("{{TOKEN}}", escape(token))\
                              .replace("{{NAAM}}", naam)\
                              .replace("{{THREAD}}", thread_html)
    return HTMLResponse(content=html)


@router.post("/chat/{token}/message")
async def chat_message(token: str, request: Request) -> JSONResponse:
    body = await request.json()
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="empty message")

    lead = _find_lead_by_token(token)
    if not lead:
        raise HTTPException(status_code=404, detail="chat session not found")

    # Buffer-sender: replies land in this list instead of WhatsApp.
    buffer: list[str] = []

    async def buffer_sender(msg: str) -> None:
        buffer.append(msg)

    # Reuse the WhatsApp pipeline. Late import avoids the circular dep between
    # routes/webhook.py and routes/web_chat.py at module-load time.
    from routes.webhook import (
        _handle_collecting, _save_message, _increment_message_count, RATE_LIMIT_MAX,
    )

    await _save_message(lead["id"], "user", text)
    msg_count = (lead.get("message_count") or 0) + 1
    await _increment_message_count(lead["id"], lead.get("message_count", 0))

    if msg_count > RATE_LIMIT_MAX:
        return JSONResponse({"messages": [
            "Het lijkt erop dat ik je niet goed kan helpen. Een collega neemt zo snel mogelijk contact met je op!"
        ]})

    status = lead.get("status", "")
    if status == "collecting":
        await _handle_collecting(lead, text, buffer_sender)
    elif status == "awaiting_choice":
        # Web-chat sessions are normally pre-branched via intake. If somehow not,
        # surface a fixed prompt rather than running branche-detection here.
        buffer.append("Voor welke dienst wil je een offerte zien — zonnepanelen, dakdekker of schoonmaak?")
    else:
        buffer.append(
            "Je sessie zit in een fase die ik nu niet via de browser kan afhandelen. "
            "Open WhatsApp om door te gaan, of mail ons als de chat-link niet meer werkt."
        )

    return JSONResponse({"messages": buffer})


# ── HTML templates ───────────────────────────────────────────────────────

_NOT_FOUND_HTML = """<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Chat niet gevonden</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#1a1a1a;text-align:center}</style>
</head><body>
<h2>Deze chat-link werkt niet (meer)</h2>
<p>Mogelijk is de link verlopen of al gebruikt. Stuur ons gerust een mail als je verder wilt.</p>
</body></html>"""


_CHAT_HTML_TEMPLATE = r"""<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Frontlix chat</title>
<style>
:root { --bg:#fafafa; --bot:#f0f0f0; --user:#1A56FF; --text:#1a1a1a; --border:rgba(0,0,0,0.10); }
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font:14px/1.5 -apple-system,system-ui,sans-serif;display:flex;flex-direction:column}
header{background:#fff;border-bottom:1px solid var(--border);padding:14px 16px;font-weight:600}
header small{display:block;font-weight:400;color:#666;margin-top:2px}
.thread{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;max-width:720px;width:100%;margin:0 auto}
.msg{display:flex}
.msg.user{justify-content:flex-end}
.bubble{max-width:75%;padding:8px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}
.msg.user .bubble{background:var(--user);color:#fff;border-bottom-right-radius:4px}
.msg.assistant .bubble{background:var(--bot);border-bottom-left-radius:4px}
footer{background:#fff;border-top:1px solid var(--border);padding:12px 16px}
.row{max-width:720px;margin:0 auto;display:flex;gap:8px}
textarea{flex:1;border:1px solid var(--border);border-radius:8px;padding:8px 12px;font:inherit;resize:none;min-height:38px;max-height:120px}
button{background:var(--user);color:#fff;border:none;border-radius:8px;padding:0 18px;cursor:pointer;font:inherit}
button:disabled{opacity:0.5;cursor:not-allowed}
.empty{color:#888;text-align:center;margin-top:40px}
</style>
</head>
<body>
<header>
  Frontlix chat
  <small>We konden je niet bereiken op WhatsApp — chat hier verder, je gesprek staat klaar.</small>
</header>
<div class="thread" id="thread">{{THREAD}}</div>
<footer>
  <div class="row">
    <textarea id="input" rows="1" placeholder="Typ je antwoord…"></textarea>
    <button id="send">Verstuur</button>
  </div>
</footer>
<script>
const token = '{{TOKEN}}';
const thread = document.getElementById('thread');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');

function append(role, text){
  const wrap=document.createElement('div'); wrap.className='msg '+role;
  const b=document.createElement('div'); b.className='bubble'; b.textContent=text;
  wrap.appendChild(b); thread.appendChild(wrap); thread.scrollTop=thread.scrollHeight;
}

async function send(){
  const text=input.value.trim(); if(!text) return;
  input.value=''; input.style.height='38px';
  append('user', text);
  sendBtn.disabled=true;
  try{
    const r = await fetch('/chat/'+token+'/message', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({text})});
    if(!r.ok){ append('assistant', 'Fout: '+(await r.text())); return; }
    const data = await r.json();
    for(const m of (data.messages||[])) append('assistant', m);
  } catch(e){ append('assistant', 'Fout: '+e.message); }
  finally { sendBtn.disabled=false; input.focus(); }
}
sendBtn.addEventListener('click', send);
input.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }});
input.addEventListener('input', e=>{ e.target.style.height='38px'; e.target.style.height=Math.min(120, e.target.scrollHeight)+'px'; });
thread.scrollTop = thread.scrollHeight;
</script>
</body></html>"""
