"""Genereer een nieuwe Google refresh_token via de installed-app OAuth flow.

Run LOKAAL (op je Mac), niet op de VPS — Google moet een browser kunnen openen
voor het toestemmingscherm. Daarna print het script de refresh_token, die je
in de VPS-`.env` als GOOGLE_REFRESH_TOKEN= zet.

Vereist in lead-automation/.env (of project-root .env):
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...

Gebruik:
  cd lead-automation
  source venv/bin/activate
  pip install google-auth-oauthlib  # (eenmalig)
  python scripts/refresh_google_token.py

Daarna:
  ssh root@72.61.23.186 'cd /var/www/frontlix/lead-automation \\
    && cp .env .env.bak.$(date +%Y%m%d-%H%M%S) \\
    && sed -i "s|^GOOGLE_REFRESH_TOKEN=.*|GOOGLE_REFRESH_TOKEN=<NIEUWE_TOKEN>|" .env \\
    && pm2 restart lead-automation --update-env'
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from config import get_settings  # noqa: E402


SCOPES = ["https://www.googleapis.com/auth/calendar"]


def main() -> int:
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("Missing dep: pip install google-auth-oauthlib", file=sys.stderr)
        return 1

    s = get_settings()
    if not s.google_client_id or not s.google_client_secret:
        print("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing in .env", file=sys.stderr)
        return 2

    client_config = {
        "installed": {
            "client_id": s.google_client_id,
            "client_secret": s.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    if not creds.refresh_token:
        print("ERROR: Google didn't return a refresh_token. Visit", file=sys.stderr)
        print("https://myaccount.google.com/u/0/permissions and revoke the app,", file=sys.stderr)
        print("then re-run. The prompt=consent flag is required to get a new RT.", file=sys.stderr)
        return 3

    print()
    print("=" * 72)
    print("NIEUWE REFRESH TOKEN (zet deze in .env als GOOGLE_REFRESH_TOKEN=):")
    print(creds.refresh_token)
    print("=" * 72)
    print()
    print("Test 'm direct lokaal:")
    print("  python -c 'import asyncio; from datetime import *; from services.google_calendar import get_free_slots; print(asyncio.run(get_free_slots(datetime.now(timezone.utc), datetime.now(timezone.utc)+timedelta(days=2), 5)))'")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
