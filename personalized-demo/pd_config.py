"""Personalized demo configuration.

Shared services (Supabase, WhatsApp, OpenAI) worden geïmporteerd vanuit
lead-automation/services/. Deze config bevat alleen personalized-demo
specifieke instellingen.
"""

# Personalized demo field names (in collection order)
PERSONALIZED_FIELDS = ["interesse", "situatie", "wensen", "tijdlijn"]

# Limits
MAX_PHOTOS = 6
PHOTO_WAIT_MS = 30_000
RATE_LIMIT_MAX = 30
