#!/bin/sh
# Unix wrapper for context-monitor hook
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "${SCRIPT_DIR}/context-monitor.js" "$@" || true
