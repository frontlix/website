#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
export DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib
exec uvicorn main:app --host 0.0.0.0 --port 8000
